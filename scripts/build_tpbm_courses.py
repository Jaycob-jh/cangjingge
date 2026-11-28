"""Validate the additive arm/phase ledger and publish it without changing old parameter records."""
from pathlib import Path
import json
import re
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
EXTRA={'Sessions_Per_Week','Sessions_Per_Day','Course_Weeks','Session_Count_Basis','Intervention_Arm','Protocol_Note','Completion_Summary','Treatment_Interval','Completed_Sessions_Mean','Completed_Sessions_SD'}

def canonical_doi(value):
    return re.sub(r'^(?:doi:\s*|https?://(?:dx\.)?doi.org/)', '', str(value or '').strip(), flags=re.I).lower()

def document_url(value):
    u=urlparse(value)
    if u.scheme!='https' or not u.netloc or u.username or u.password: return None
    return u._replace(fragment='').geturl()

def validate(data,studies,base):
    if data.get('schema_version')!=1 or not isinstance(data.get('arms'),list): raise ValueError('疗程文件格式无效')
    seen=set()
    for arm in data['arms']:
        if not re.fullmatch(r'[a-z0-9-]+',arm['id']) or arm['id'] in seen: raise ValueError('疗程组ID重复或无效')
        seen.add(arm['id']);study=studies.get(arm.get('study_id'))
        paper=next((p for p in base['papers'] if canonical_doi(p.get('doi'))==canonical_doi(arm['doi'])),None)
        if not canonical_doi(arm['doi']) or (study is None and paper is None): raise ValueError('疗程必须对应已有书目或全文卡')
        if study and canonical_doi(arm['doi'])!=canonical_doi(study['doi']): raise ValueError('疗程DOI与原研究不一致')
        if paper and paper['id']!=arm['paper_id']: raise ValueError('疗程PMID与已有书目不一致')
        if not re.fullmatch(r'\d+',arm['paper_id']): raise ValueError('需要规范PMID')
        # Curated sources may be original PDFs or publisher pages as well as PMC.
        # Non-card papers bind to their existing DOI, with page/section in `where`.
        allowed={document_url('https://doi.org/'+canonical_doi(arm['doi']))}
        if study:
            allowed.add(document_url(study['fulltext']))
            allowed.update(document_url(s['url']) for s in study.get('sources',{}).values())
        document=data.get('documents',{}).get(arm['paper_id'])
        if document:
            if canonical_doi(document['doi'])!=canonical_doi(arm['doi']) or not re.fullmatch(r'PMC\d+',document['pmcid']): raise ValueError('原文身份与已有书目不一致')
            expected='https://pmc.ncbi.nlm.nih.gov/articles/'+document['pmcid']+'/'
            if document['url']!=expected: raise ValueError('全文地址与PMCID不一致')
            allowed.add(expected)
        allowed.discard(None)
        entries=arm['entries'];fields={e['field'] for e in entries}
        if not {'Subject_Type','Intervention_Arm','Session_Count_Basis'}<=fields: raise ValueError('缺少组别或次数口径')
        completed=any(e['field']=='Session_Count_Basis' and e['value']=='Completed' for e in entries)
        if arm['emission']=='none' and fields&{'Wavelength_nm','Fluence_J_cm2','Irradiance_mW_cm2','Power_mW'}: raise ValueError('不出光假刺激不能借用主动组出光参数')
        for item in entries:
            if completed and item['field']=='Total_Sessions' and item['kind']!='Direct':
                raise ValueError('实际完成次数必须由原文直接报告，不能按频次和周数推算')
            if item['field'] not in set(base['fields'])|EXTRA: raise ValueError('疗程字段拼写无效')
            if item.get('course_plan_id')!=arm['id']: raise ValueError('参数来自另一个组或阶段')
            if item.get('pending') is not False or item.get('source_review_required') is not False: raise ValueError('疗程匹配只接收已核对记录')
            if document_url(item['source_url']) not in allowed or not item['where']: raise ValueError('需要同篇原文的公开位置')
            if item['kind'] not in ['Direct','Converted','Calculated']: raise ValueError('缺少记录/换算口径')
    return len(seen)

def main():
    data=json.loads((ROOT/'data/tpbm-course-arms.json').read_text(encoding='utf-8'))
    studies={s['id']:s for s in json.loads((ROOT/'data/tpbm-studies.json').read_text(encoding='utf-8'))['studies']}
    base=json.loads((ROOT/'assets/tpbm-parameters.json').read_text(encoding='utf-8'))
    count=validate(data,studies,base)
    content=json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n';target=ROOT/'assets/tpbm-course-arms.json'
    if not target.exists() or target.read_text(encoding='utf-8')!=content: target.write_text(content,encoding='utf-8')
    print(f'疗程原文与组别校验通过：{count} 条方案/阶段记录；原参数库未改写。')

if __name__=='__main__': main()
