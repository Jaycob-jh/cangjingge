"""Create editable, local-only intake drafts. Never update the published library."""
from pathlib import Path
import argparse,copy,datetime,hashlib,json,os,re,shutil,tempfile,unicodedata
from urllib.request import Request,urlopen
from urllib.parse import quote
from literature_common import normalize_doi
from build_reading_links import primary_doi
ROOT=Path(__file__).resolve().parents[1]
DEFAULT=Path('I:/Agents-workspace/Outputs/cangjingge/intake-drafts')
DOMAINS={'tpbm':['研究对象','组别与对照','波长_nm','功率_mW','峰值功率_mW','平均功率_mW','辐照度_mW_cm2','光斑_cm2','表面能量密度_J_cm2','估算脑内能量密度_J_cm2','点亮时间_s','设备运行时间_min','照射位置','连续或脉冲','频率_Hz','占空比_pct','每次照射时间','次数与疗程','测温位置与温升','测量方法与时点'], 'fmri':['研究对象','静息或任务范式','磁场强度_T','TR_ms','TE_ms','体素_mm','扫描时长','预处理','头动控制','分区模板','网络或连接指标','统计对照'], 'sleep-eeg':['研究对象','记录设备与导联','采样率_Hz','参考方式','睡眠分期规则','记录时长','睡眠阶段','频谱或事件指标','伪迹排除','刺激与睡眠的时间关系','统计对照'], 'other':['研究对象','组别与对照','研究方法','测量指标','统计方法']}

def normalized_title(value):return re.sub(r'[^\w]','',unicodedata.normalize('NFKC',str(value)).casefold())
def json_read(path):return json.loads(path.read_bytes())
def sha(path):
    h=hashlib.sha256()
    with path.open('rb')as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()
def find_dois(text):
    found=[]
    for raw in re.findall(r'10\.\d{4,9}/[^\s<>"\u201d]+',unicodedata.normalize('NFKC',text),re.I):
        raw=raw.rstrip('.,;:。；，')
        while raw.endswith(')') and raw.count(')')>raw.count('('):raw=raw[:-1]
        try:value=normalize_doi(raw)
        except ValueError:continue
        if value not in found:found.append(value)
    return found

def read_pdf(path,pages=3):
    try:import fitz
    except ImportError:raise ValueError('PDF提取需要PyMuPDF；请在项目环境安装后重试。')
    path=Path(path).resolve()
    if not path.is_file()or path.suffix.lower()!='.pdf':raise ValueError('请提供存在的 PDF 文件。')
    with fitz.open(path)as doc:
        if doc.needs_pass:raise ValueError('PDF已加密，请提供可直接阅读的副本。')
        texts=[{'pdf_page':i+1,'text':doc[i].get_text('text',sort=True)}for i in range(min(pages,len(doc)))]
        first=texts[0]['text']if texts else''
        # Identity candidates come from the first-page header, not the reference list.
        header=re.split(r'\babstract\b|摘要|\breferences\b',first,flags=re.I)[0][:1800]
        candidates=find_dois(header)
        all_candidates={}
        for page in texts:
            for doi in find_dois(page['text']):all_candidates.setdefault(doi,[]).append(page['pdf_page'])
        return {'path':str(path),'sha256':sha(path),'total_pages':len(doc),'extracted_pages':[p['pdf_page']for p in texts],'metadata':doc.metadata,'header_doi_candidates':candidates,'doi_mentions':all_candidates,'has_text':any(p['text'].strip()for p in texts)},texts

def pdf_mentions(texts):
    units=r'mW\s*/\s*cm[²2]|W\s*/\s*cm[²2]|mJ\s*/\s*cm[²2]|J\s*/\s*cm[²2]|mW|mJ|J|nm|Hz|minutes?|min|ms|seconds?|s|cm[²2]|mm[²2]|cm|mm|°\s*C|%|T'
    pattern=re.compile(r'(?<![\w.])(\d+(?:\.\d+)?(?:\s*[-–—~～至到]\s*\d+(?:\.\d+)?)?)\s*('+units+r')(?![A-Za-z0-9])',re.I)
    values=[];figures=[]
    for page in texts:
        text=unicodedata.normalize('NFKC',page['text'])
        for match in pattern.finditer(text):
            values.append({'value':match[1],'unit':re.sub(r'\s+','',match[2]),'pdf_page':page['pdf_page'],'context':re.sub(r'\s+',' ',text[max(0,match.start()-120):match.end()+120]),'kind':'literal_pdf_mention','group':None,'pending':True,'source_review_required':True})
        for match in re.finditer(r'\b(?:Fig(?:ure)?\.?|Table)\s*\d+[A-Za-z]?|[图表]\s*\d+[A-Za-z]?',text,re.I):
            figures.append({'label':match[0],'pdf_page':page['pdf_page'],'context':re.sub(r'\s+',' ',text[max(0,match.start()-60):match.end()+120]),'figure_reviewed':False})
    return values,figures

def crossref(doi):
    url='https://api.crossref.org/works/'+quote(doi,safe='')
    with urlopen(Request(url,headers={'User-Agent':'Cangjingge-local-intake/1.0','Accept':'application/json'}),timeout=20)as response:data=json.load(response)['message']
    if normalize_doi(data['DOI'])!=doi:raise ValueError('Crossref返回的DOI不一致。')
    year=(data.get('published',{}).get('date-parts')or[[None]])[0][0]
    return {'doi':doi,'title':next(iter(data.get('title',[])),''),'authors':[' '.join(filter(None,[a.get('given'),a.get('family')]))for a in data.get('author',[])],'year':year,'journal':next(iter(data.get('container-title',[])),''),'volume':data.get('volume',''),'issue':data.get('issue',''),'pages':data.get('page',''),'type':{'journal-article':'journalArticle','book-chapter':'bookSection','book':'book','posted-content':'preprint','proceedings-article':'conferencePaper'}.get(data.get('type'),data.get('type','unknown')),'source_url':url}

def make_draft(*,doi=None,pdf=None,title=None,pmid=None,topics=(),domain='tpbm',pages=3,lookup=False):
    if domain not in DOMAINS:raise ValueError('未知研究领域。')
    if not 1<=pages<=1000:raise ValueError('pages须为1–1000。')
    if pmid and not re.fullmatch(r'\d{7,9}',pmid):raise ValueError('PMID格式不正确。')
    catalog=json_read(ROOT/'data/catalog.json')['records'];studies=json_read(ROOT/'data/tpbm-studies.json')['studies']
    info,texts=read_pdf(pdf,pages)if pdf else(None,[])
    identity_source='provided_doi'if doi else None
    doi=normalize_doi(doi)if doi else None
    if not doi and info and len(info['header_doi_candidates'])==1:doi=info['header_doi_candidates'][0];identity_source='pdf_header_candidate'
    if not doi and pmid:
        paper=next((p for p in json_read(ROOT/'assets/tpbm-parameters.json')['papers']if p['id']==pmid and p.get('doi')),None)
        if paper:doi=normalize_doi(paper['doi']);identity_source='existing_pmid_link'
    matched=[r for r in catalog if doi and r.get('doi')and normalize_doi(r['doi'])==doi]
    title_matches=[r for r in catalog if title and normalized_title(title)==normalized_title(r['title'])]
    if not doi and len(title_matches)==1:
        matched=title_matches
        if matched[0].get('doi'):doi=normalize_doi(matched[0]['doi']);identity_source='catalog_title_candidate'
    # A title match suggests identity; it does not replace a conflicting explicit DOI.
    conflicts=[]
    if doi and info and info['header_doi_candidates']and doi not in info['header_doi_candidates']:conflicts.append({'field':'doi','reason':'所给 DOI 与 PDF 首页候选不同','candidate':doi,'pdf_candidates':info['header_doi_candidates']})
    if title_matches and doi and any(r.get('doi')and normalize_doi(r['doi'])!=doi for r in title_matches):conflicts.append({'field':'doi','reason':'题名匹配的现有记录与所给 DOI 不同','candidate':doi,'existing':[r.get('doi')for r in title_matches]})
    metadata={k:copy.deepcopy(matched[0][k])for k in ['title','authors','year','doi','journal','volume','issue','pages','type']if matched and k in matched[0]}
    if doi:metadata.setdefault('doi',doi)
    if title and metadata.get('title')and normalized_title(title)!=normalized_title(metadata['title']):conflicts.append({'field':'title','existing':metadata['title'],'candidate':title,'source':'provided_title'})
    if title:metadata.setdefault('title',title)
    remote=None;lookup_error=None
    if lookup and doi:
        try:remote=crossref(doi)
        except Exception as e:lookup_error=type(e).__name__
        if remote:
            for key,value in remote.items():
                if key=='source_url':continue
                if metadata.get(key)not in(None,'',[])and value not in(None,'',[])and metadata[key]!=value:conflicts.append({'field':key,'existing':metadata[key],'candidate':value,'source':remote['source_url']})
                elif value not in(None,'',[]):metadata[key]=value
    original_topics=[]
    for record in matched:
        for topic in record.get('topics',[]):
            if topic not in original_topics:original_topics.append(topic)
    proposed_topics=list(original_topics)
    for topic in topics:
        if topic not in proposed_topics:proposed_topics.append(topic)
    matched_studies=[s['id']for s in studies if doi and normalize_doi(s['doi'])==doi]
    note_paths=[]
    for path in sorted((ROOT/'notes/posts').glob('*.qmd')):
        try:value=primary_doi(path.read_text('utf8'))
        except ValueError:continue
        if value and doi and value==doi:note_paths.append(path.relative_to(ROOT).as_posix())
    identity_key=doi or('pmid:'+pmid if pmid else'pdf:'+info['sha256']if info else'title:'+normalized_title(title))
    mentions,figures=pdf_mentions(texts)
    return {'schema_version':1,'draft_id':'draft-'+hashlib.sha256(identity_key.encode()).hexdigest()[:16],'domain':domain,'bibliography':metadata,'identity':{'source':identity_source,'doi':doi,'pmid':pmid,'pdf_identity_review_required':bool(info)},'duplicates':{'catalog_ids':[r['id']for r in matched],'same_title_catalog_ids':[r['id']for r in title_matches],'study_ids':matched_studies,'notes':note_paths},'topics':proposed_topics,'original_topics':original_topics,'groups':[],'unassigned_pdf_mentions':mentions,'figure_table_mentions':figures,'field_template':{name:None for name in DOMAINS[domain]},'evidence':[],'review_required':['核对论文身份与正式版本','按实际实验组填写参数和对照','逐项填图号、表号、页码与公开出处（自动提取只是文字出现，未归入具体实验组）','人工确认后再同步正式库'],'reading_scope':{'pdf_text_extracted_pages':info['extracted_pages']if info else[],'fulltext_reviewed':False,'figures_reviewed':False},'pdf':info,'crossref':{'url':remote['source_url']if remote else None,'error':lookup_error},'conflicts':conflicts},texts

def qmd_for(draft):
    meta=draft['bibliography'];title=meta.get('title')or'待核题名'
    front='---\ntitle: '+json.dumps(title,ensure_ascii=False)+'\ndraft: true\n'
    # Candidate identity stays out of the canonical doi frontmatter until reviewed.
    front+='categories: '+json.dumps([{'tpbm':'经颅光刺激','fmri':'fMRI 脑网络','sleep-eeg':'睡眠 EEG','other':'论文整理'}[draft['domain']]],ensure_ascii=False)+'\n---\n'
    lines=[front,'这是一份可编辑的整理草稿，核对后再发布。\n','## 书目信息\n']
    if meta.get('doi'):lines.append('DOI 候选：['+meta['doi']+'](https://doi.org/'+quote(meta['doi'],safe='/')+')\n')
    if draft['duplicates']['catalog_ids']:lines.append('已有书目：'+', '.join(draft['duplicates']['catalog_ids'])+'。原分类保留在 draft.json。\n')
    if draft.get('unassigned_pdf_mentions'):lines.append('本地 draft.json 有 '+str(len(draft['unassigned_pdf_mentions']))+' 处带单位的文字候选，均待核对与分组；不是已确认的实验参数。\n')
    if draft.get('unassigned_pdf_mentions'):
        lines.append('## 待核的原文数值\n\n| PDF页 | 出现的数值 | 单位 | 对应实验组与参数口径 |\n|---|---|---|---|')
        lines.extend('| '+str(x['pdf_page'])+' | '+x['value']+' | '+x['unit']+' | 待核对 |' for x in draft['unassigned_pdf_mentions'][:50])
        lines.append('\n完整上下文与其余候选保存在本地draft.json；这些不是已确认实验参数。\n')
    lines+=['## 研究问题\n','（补充这篇研究要回答的问题。）\n','## 怎么做\n','（按研究对象、实际组别、对照和测量时点整理。）\n','## 参数与原文位置\n','| 实验组 | 参数或指标 | 数值与单位 | PDF页码 / 图表号 | 公开原文链接 |\n|---|---|---|---|---|\n| 待填写 | 待填写 | 待填写 | 待填写 | 待填写 |\n','## 结果怎么读\n','（写清比较对象、结果与图表位置；不要把自动提取当作人工核查。）\n','## 对实验设计有什么用\n','（结合对象、剂量、对照和测量条件填写。）\n','## 阅读范围\n']
    pages=draft['reading_scope']['pdf_text_extracted_pages'];lines.append(('自动提取 PDF 第'+', '.join(map(str,pages))+'页文字；尚未人工核对全文和图表。'if pages else'尚未阅读全文。')+'\n')
    return'\n'.join(lines)

def save_draft(draft,texts,output=DEFAULT,new_revision=False):
    output=Path(output).resolve()
    if output.is_relative_to(ROOT):raise ValueError('草稿和提取文本必须放在公开仓库外。')
    if os.name=='nt'and output.drive.upper()!='I:':raise ValueError('本项目草稿使用I盘，不自动回退到C盘。')
    output.mkdir(parents=True,exist_ok=True);name=draft['draft_id']
    if new_revision:name+='-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'-'+os.urandom(3).hex()
    target=output/name
    if target.exists():
        previous=json_read(target/'draft.json')
        changed=previous.get('domain')!=draft['domain']or(previous.get('pdf')or{}).get('sha256')!=(draft.get('pdf')or{}).get('sha256')or previous.get('reading_scope',{}).get('pdf_text_extracted_pages')!=draft['reading_scope']['pdf_text_extracted_pages']
        return {'directory':str(target),'created':False,'manual_content_preserved':True,'new_revision_needed':changed}
    temp=Path(tempfile.mkdtemp(prefix='.intake-',dir=output))
    try:
        (temp/'draft.json').write_text(json.dumps(draft,ensure_ascii=False,indent=2),encoding='utf8');(temp/'note.qmd').write_text(qmd_for(draft),encoding='utf8')
        if texts:(temp/'pdf-pages.txt').write_text('\n\n'.join('PDF PAGE '+str(p['pdf_page'])+'\n'+p['text']for p in texts),encoding='utf8')
        (temp/'README.md').write_text('本地待审核草稿。编辑draft.json与note.qmd；PDF提取文本和原文件路径仅用于本地核对，不提交到公开仓库。本工具不修改正式数据或笔记。同一文献再次运行不会覆盖，确需另建版本时用--new-revision。\n',encoding='utf8')
        try:temp.rename(target)
        except FileExistsError:return {'directory':str(target),'created':False,'manual_content_preserved':True}
    finally:
        if temp.exists():
            if temp.resolve().parent!=output or not temp.name.startswith('.intake-'):raise ValueError('临时目录超出草稿输出范围。')
            shutil.rmtree(temp)
    return {'directory':str(target),'created':True,'manual_content_preserved':True}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--doi');p.add_argument('--pdf',type=Path);p.add_argument('--title');p.add_argument('--pmid');p.add_argument('--domain',choices=DOMAINS,default='tpbm');p.add_argument('--topic',action='append',default=[]);p.add_argument('--pages',type=int,default=3);p.add_argument('--lookup',action='store_true');p.add_argument('--output',type=Path,default=DEFAULT);p.add_argument('--new-revision',action='store_true');a=p.parse_args()
    if not(a.doi or a.pdf or a.title or a.pmid):p.error('提供DOI、PDF、题名或PMID。')
    draft,texts=make_draft(doi=a.doi,pdf=a.pdf,title=a.title,pmid=a.pmid,topics=a.topic,domain=a.domain,pages=a.pages,lookup=a.lookup)
    result=save_draft(draft,texts,a.output,a.new_revision);result.update({'duplicates':draft['duplicates'],'doi':draft['identity']['doi'],'conflicts':len(draft['conflicts'])});print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
