// Editable browser drafts. Published records are read-only inputs.
export const templates={tpbm:['研究对象','组别与对照','波长_nm','峰值功率_mW','平均功率_mW','峰值辐照度_mW_cm2','平均辐照度_mW_cm2','光斑_cm2','表面能量密度_J_cm2','估算脑内能量密度_J_cm2','点亮时间_s','设备运行时间_min','照射位置','连续或脉冲','频率_Hz','占空比_pct','次数与疗程','测温位置与温升','测量方法与时点','结果'],fmri:['研究对象','静息或任务范式','磁场强度_T','TR_ms','TE_ms','体素_mm','扫描时长','预处理','头动控制','分区模板','网络或连接指标','统计对照','结果'],'sleep-eeg':['研究对象','记录设备与导联','采样率_Hz','参考方式','睡眠分期规则','记录时长','睡眠阶段','频谱或事件指标','伪迹排除','刺激与睡眠的时间关系','统计对照','结果'],other:['研究对象','组别与对照','研究方法','测量指标','统计方法','结果']};
export function normalizeDOI(value){return String(value||'').normalize('NFKC').trim().replace(/^(?:doi\s*:\s*|https?:\/\/(?:dx\.)?doi\.org\/)/i,'').replace(/[.,;，。；]+$/,'').toLowerCase();}
export function validDOI(value){return /^10\.\d{4,9}\/[^\s<>"\u201d]+$/i.test(value);}
export function titleKey(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}_]/gu,'');}
export function findDOIs(text){return [...new Set((String(text).normalize('NFKC').match(/10\.\d{4,9}\/[^\s<>"\u201d]+/gi)||[]).map(raw=>{let d=normalizeDOI(raw);while(d.endsWith(')')&&d.split(')').length>d.split('(').length)d=d.slice(0,-1);return d;}).filter(validDOI))];}
export function matchRecords(doi,title,catalog){
 const key=titleKey(title),byDOI=catalog.records.filter(r=>doi&&normalizeDOI(r.doi)===doi),byTitle=catalog.records.filter(r=>key&&titleKey(r.title)===key);
 const ambiguous=!doi&&new Set(byTitle.map(r=>normalizeDOI(r.doi)).filter(Boolean)).size>1;
 return {matched:byDOI.length?byDOI:doi||ambiguous?[]:byTitle,sameTitle:byTitle.filter(r=>ambiguous||doi&&normalizeDOI(r.doi)!==doi)};
}
export function createDraft(input,catalog,studies={studies:[]},links={records:{}}){
 const provided=normalizeDOI(input.doi);if(provided&&!validDOI(provided))throw Error('请填写完整 DOI，如 10.1002/lsm.22471。');
 if(!provided&&!String(input.title||'').trim())throw Error('请填写 DOI 或题名，也可以先读取 PDF。');
 if(!Object.hasOwn(templates,input.domain))throw Error('请选择研究方向。');
 const hit=matchRecords(provided,input.title,catalog),record=hit.matched[0];
 const doi=provided||normalizeDOI(record?.doi)||null;
 const bibliography=record?Object.fromEntries(Object.entries(record).filter(([k])=>!['id','topics','reading_status'].includes(k))):{title:input.title||'',doi};
 const conflicts=hit.sameTitle.map(r=>({field:'doi',catalog_id:r.id,existing:r.doi,candidate:doi}));
 if(record&&input.title&&titleKey(input.title)!==titleKey(record.title))conflicts.push({field:'title',existing:record.title,candidate:input.title});
 const original=[...new Set(hit.matched.flatMap(r=>r.topics||[]))];
 return {schema_version:1,draft_id:'draft-'+crypto.randomUUID(),domain:input.domain,bibliography,identity:{source:provided?'provided_doi':'catalog_title_candidate',doi,pmid:null,pdf_identity_review_required:false},duplicates:{catalog_ids:hit.matched.map(r=>r.id),same_title_catalog_ids:hit.sameTitle.map(r=>r.id),study_ids:studies.studies.filter(s=>doi&&normalizeDOI(s.doi)===doi).map(s=>s.id),notes:[...new Set(hit.matched.flatMap(r=>(links.records[r.id]||[]).filter(l=>l.kind==='note').map(l=>l.href)))]},topics:original.slice(),original_topics:original,groups:[],unassigned_pdf_mentions:[],figure_table_mentions:[],field_template:Object.fromEntries(templates[input.domain].map(k=>[k,null])),evidence:[],review_required:['核对论文身份与正式版本','按实际实验组填写参数和对照','逐项核对图号、表号、页码与公开出处','确认后再同步正式库'],reading_scope:{pdf_text_extracted_pages:[],fulltext_reviewed:false,figures_reviewed:false},pdf:null,crossref:{url:null,error:null},conflicts,notes:''};
}
export function importDraft(value){
 if(!value||value.schema_version!==1||typeof value.draft_id!=='string'||!Object.hasOwn(templates,value.domain)||!value.bibliography||!value.identity||!['topics','original_topics','groups','evidence','conflicts','unassigned_pdf_mentions','figure_table_mentions'].every(k=>Array.isArray(value[k])))throw Error('这不是支持的整理草稿（schema_version: 1）。');
 if(!value.reading_scope||!value.duplicates||typeof value.field_template!=='object'||!value.field_template)throw Error('草稿缺少阅读范围、分类或字段模板。');
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const scalars=x=>x===undefined||x===null||['string','number','boolean'].includes(typeof x);
 const strings=x=>Array.isArray(x)&&x.every(t=>typeof t==='string');
 if(!object(value.bibliography)||!object(value.identity)||!object(value.field_template)||!strings(value.topics)||!strings(value.original_topics)||!Array.isArray(value.reading_scope.pdf_text_extracted_pages)||!value.reading_scope.pdf_text_extracted_pages.every(Number.isInteger)||!['catalog_ids','study_ids','notes'].every(k=>strings(value.duplicates[k]))||!value.evidence.every(e=>object(e)&&['group','field','value','unit','basis','locator','public_url'].every(k=>scalars(e[k])))||!value.conflicts.every(object)||!value.unassigned_pdf_mentions.every(m=>object(m)&&typeof m.context==='string'&&Number.isInteger(m.pdf_page))||!value.figure_table_mentions.every(object)||value.notes!==undefined&&typeof value.notes!=='string'||value.pdf_sources!==undefined&&!Array.isArray(value.pdf_sources))throw Error('草稿字段格式不完整，未替换当前内容。');
 if(value.pdf&&!object(value.pdf)||value.pdf&&(!Array.isArray(value.pdf.extracted_pages)||!value.pdf.extracted_pages.every(Number.isInteger)))throw Error('PDF 页码记录格式不完整，未替换当前内容。');
 const d=structuredClone(value);d.topics=[...new Set([...d.original_topics,...d.topics])];return d;
}
export function pdfMentions(pages){
 const values=[],figures=[];
 const unit='mW\\s*/\\s*cm[²2]|W\\s*/\\s*cm[²2]|mJ\\s*/\\s*cm[²2]|J\\s*/\\s*cm[²2]|mW|mJ|J|nm|Hz|minutes?|min|ms|seconds?|s|cm[²2]|mm[²2]|cm|mm|°\\s*C|%|T';
 const pattern=new RegExp('(?<![\\w.])(\\d+(?:\\.\\d+)?(?:\\s*[-–—~～至到]\\s*\\d+(?:\\.\\d+)?)?)\\s*('+unit+')(?![A-Za-z0-9])','gi');
 for(const page of pages){const text=page.text.normalize('NFKC');for(const m of text.matchAll(pattern))values.push({value:m[1],unit:m[2].replace(/\s+/g,''),pdf_page:page.pdf_page,context:text.slice(Math.max(0,m.index-120),m.index+m[0].length+120).replace(/\s+/g,' '),kind:'literal_pdf_mention',group:null,pending:true,source_review_required:true});
 for(const m of text.matchAll(/\b(?:Fig(?:ure)?\.?|Table)\s*\d+[A-Za-z]?|[图表]\s*\d+[A-Za-z]?/gi))figures.push({label:m[0],pdf_page:page.pdf_page,context:text.slice(Math.max(0,m.index-60),m.index+m[0].length+120).replace(/\s+/g,' '),figure_reviewed:false});}
 return {values,figures};
}
export function applyCrossref(draft,message){
 const doi=normalizeDOI(message.DOI);if(!doi||doi!==normalizeDOI(draft.identity.doi))throw Error('Crossref 返回的 DOI 与草稿不一致。');
 const fields={doi,title:message.title?.[0]||'',authors:(message.author||[]).map(a=>[a.given,a.family].filter(Boolean).join(' ')),year:message.published?.['date-parts']?.[0]?.[0]||null,journal:message['container-title']?.[0]||'',volume:message.volume||'',issue:message.issue||'',pages:message.page||''};
 for(const[k,v]of Object.entries(fields)){if(v===null||v===''||Array.isArray(v)&&!v.length)continue;const old=draft.bibliography[k];if(old===undefined||old===null||old===''||Array.isArray(old)&&!old.length)draft.bibliography[k]=v;else if(JSON.stringify(old)!==JSON.stringify(v))draft.conflicts.push({field:k,existing:old,candidate:v,source:'Crossref'});}
 draft.crossref={url:'https://api.crossref.org/works/'+encodeURIComponent(doi),error:null};return draft;
}
const quote=v=>JSON.stringify(String(v??''));
export function draftQMD(d){
 const b=d.bibliography;const line=v=>String(v??'').replace(/\r?\n/g,' ').replace(/\|/g,'\\|');
 // Raw PDF contexts, local paths, metadata and private review notes stay in the JSON draft.
 let text='---\ntitle: '+quote(b.title||'论文阅读草稿')+'\ndraft: true\ncategories: ['+quote({'tpbm':'经颅光刺激','fmri':'fMRI 脑网络','sleep-eeg':'睡眠 EEG','other':'其他研究'}[d.domain])+']\n---\n\n';
 text+='候选 DOI：'+line(d.identity.doi||'待补')+'\n\n阅读范围：'+(d.reading_scope.pdf_text_extracted_pages.length?'PDF 文字提取，第 '+d.reading_scope.pdf_text_extracted_pages.join('、')+' 页':'尚未读取 PDF')+'；不代表已核对全文或图表。\n\n## 研究怎么做\n\n## 结果怎么读\n\n## 对实验设计有什么用\n\n## 实验组与原文位置（整理草稿）\n\n| 组别 | 字段 | 值 | 单位 | 口径 | 原文位置 | 公开出处 | 核对状态 |\n|---|---|---|---|---|---|---|---|\n';
 for(const e of d.evidence)text+='| '+[e.group,e.field,e.value,e.unit,e.basis,e.locator,e.public_url,e.pending===false?'已人工核对，待正式入库':'待核'].map(line).join(' | ')+' |\n';
 return text;
}
