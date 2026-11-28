import {templates,normalizeDOI,validDOI,findDOIs,createDraft,importDraft,pdfMentions,applyCrossref,draftQMD} from './reading-intake.mjs';
const $=id=>document.getElementById(id);const n=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
let catalog,studies,links,draft=null,pdfPending=null,shown=30,revision=0,busy=false,dirty=false;
const status=text=>{$('intake-status').textContent=text;};
const error=e=>status(e.message||String(e));
function mark(){dirty=true;revision++;}
function control(parent,label,value,oninput,tag='input'){
 const wrap=n('label',label),el=n(tag);el.value=value??'';if(tag==='input')el.maxLength=5000;if(tag==='textarea')el.rows=3;el.addEventListener('input',()=>{oninput(el.value);mark();});wrap.append(el);parent.append(wrap);return el;
}
function safeLink(text,href){
 const a=n('a',text);if(/^https:\/\//i.test(href))a.href=href;else if(/^(?:library|notes|research)\/[A-Za-z0-9_./?=#%&-]+$/.test(href)&&!href.includes('..'))a.href='../'+href;else return n('span',text);return a;
}
function renderConflicts(){const box=$('intake-conflicts');box.replaceChildren();if(!draft.conflicts.length)box.append(n('p','没有题录差异。'));for(const c of draft.conflicts)box.append(n('p',`${c.field||'身份'}：保留 ${JSON.stringify(c.existing??c.pdf_candidates??'当前记录')}；候选 ${JSON.stringify(c.candidate??c.doi??'见草稿')}`));}
function renderEvidence(){
 const box=$('intake-evidence');box.replaceChildren();
 draft.evidence.forEach((e,i)=>{
  const row=n('article');row.className='intake-evidence-row';row.append(n('h3','记录 '+(i+1)));const grid=n('div');grid.className='intake-grid';
  for(const[k,title]of [['group','实验组 / 条件'],['field','参数或结果名称'],['value','值 / 结果'],['unit','单位'],['basis','口径（峰值、平均、表面、脑内等）'],['locator','图表 / PDF 物理页码'],['public_url','公开原文链接']]){const input=control(grid,title,e[k],v=>{e[k]=v;e.pending=true;e.source_review_required=true;row.querySelector('input[type=checkbox]').checked=false;},k==='value'?'textarea':'input');if(k==='field')input.setAttribute('list','intake-field-options');}
  row.append(grid);const label=n('label'),check=n('input');check.type='checkbox';check.checked=e.pending===false;
  check.onchange=()=>{if(check.checked&&(!String(e.group||'').trim()||!String(e.field||'').trim()||!String(e.value??'').trim()||!String(e.locator||'').trim()||!/^https:\/\//i.test(e.public_url||''))){check.checked=false;status('先填组别、字段、值、原文位置和公开链接，再标为已核对。');return;}e.pending=!check.checked;e.source_review_required=!check.checked;mark();};
  label.append(check,document.createTextNode(' 我已核对这一组的原文（仍需正式入库）'));row.append(label);
  const remove=n('button','移除这条记录');remove.onclick=()=>{draft.evidence.splice(i,1);mark();renderEvidence();};row.append(remove);box.append(row);
 });
}
function renderMentions(){
 const box=$('intake-mention-list');box.replaceChildren();const list=draft.unassigned_pdf_mentions;
 $('intake-scope').textContent=`${list.length} 条数值线索；${draft.figure_table_mentions.length} 处图表号。提取文字不等于已读图表。`;
 list.slice(0,shown).forEach((m,i)=>{
  const row=n('article');row.className='intake-mention';row.append(n('strong',`${m.value} ${m.unit} · PDF 第 ${m.pdf_page} 页`),n('p',m.context));
  const pick=n('button','挑入整理，填写实验组');pick.onclick=()=>{draft.evidence.push({group:'',field:'',value:m.value,unit:m.unit,basis:'',locator:'PDF 物理页 '+m.pdf_page,public_url:'',pending:true,source_review_required:true,pdf_page:m.pdf_page,source_sha256:m.source_sha256||draft.pdf?.sha256||null,literal_pdf_mention_index:i});mark();renderEvidence();$('intake-evidence').lastElementChild?.scrollIntoView({block:'start'});};row.append(pick);box.append(row);
 });$('intake-more').hidden=list.length<=shown;
}
function render(){
 $('intake-editor').hidden=false;const box=$('intake-duplicates');box.replaceChildren();
 const ids=draft.duplicates.catalog_ids||[];box.append(n('p',ids.length?'已在文献库中找到，沿用原有分类和内容入口。':'尚未匹配正式书目；此稿不会自动加入网站。'));
 for(const id of ids){const r=catalog.records.find(r=>r.id===id);if(r)box.append(safeLink(r.title,'library/record.html#'+id),n('br'));for(const l of links.records[id]||[])box.append(safeLink(l.title,l.href),document.createTextNode(' · '));}
 const metadata=$('intake-metadata');metadata.replaceChildren();for(const[k,title]of [['title','题名'],['authors','作者（分号分隔）'],['journal','期刊'],['year','年份'],['volume','卷'],['issue','期'],['pages','页码 / 文章号']])control(metadata,title,k==='authors'?(Array.isArray(draft.bibliography[k])?draft.bibliography[k].join('; '):draft.bibliography[k]):draft.bibliography[k],v=>draft.bibliography[k]=k==='authors'?v.split(/[;；]/).map(a=>a.trim()).filter(Boolean):v);
 metadata.append(n('p','DOI：'+(draft.identity.doi||'待补')+'；方向：'+$('intake-domain').selectedOptions[0].textContent));
 const topicName=id=>catalog.topics.find(t=>t.id===id)?.name||id;
 $('intake-topics').textContent='保留原分类：'+(draft.original_topics.map(topicName).join('、')||'无');
 $('intake-extra-topics').value=draft.topics.filter(t=>!draft.original_topics.includes(t)).join(', ');
 $('intake-notes').value=draft.notes||'';let options=$('intake-field-options');if(!options){options=n('datalist');options.id='intake-field-options';$('intake-editor').append(options);}options.replaceChildren(...templates[draft.domain].map(key=>{const o=n('option');o.value=key;return o;}));renderConflicts();renderEvidence();renderMentions();
}
function attachPDF(info){
 if(!draft)return;
 const ids=info.header_doi_candidates;if(ids.length&&draft.identity.doi&&!ids.includes(normalizeDOI(draft.identity.doi)))draft.conflicts.push({field:'pdf_identity',existing:draft.identity.doi,pdf_candidates:ids});
 draft.identity.pdf_identity_review_required=true;
 draft.pdf_sources??=draft.pdf?[structuredClone(draft.pdf)]:[];
 let source=draft.pdf_sources.find(s=>s.sha256===info.sha256);
 if(!source){source={sha256:info.sha256,total_pages:info.total_pages,extracted_pages:[],header_doi_candidates:ids,has_text:info.pages.some(p=>p.text.trim())};draft.pdf_sources.push(source);}
 const fresh=info.pages.filter(p=>!source.extracted_pages.includes(p.pdf_page)),mentions=pdfMentions(fresh);
 source.extracted_pages=[...new Set([...source.extracted_pages,...fresh.map(p=>p.pdf_page)])].sort((a,b)=>a-b);
 draft.unassigned_pdf_mentions.push(...mentions.values.map(m=>({...m,source_sha256:info.sha256})));draft.figure_table_mentions.push(...mentions.figures.map(m=>({...m,source_sha256:info.sha256})));
 if(!draft.pdf||draft.pdf.sha256===info.sha256){draft.pdf=structuredClone(source);draft.reading_scope.pdf_text_extracted_pages=source.extracted_pages.slice();}
 mark();render();status(`已加入 PDF 文字线索；本次 ${fresh.length} 页。题名、实验组和图表需按原文核对。`);
}
$('intake-create').onclick=()=>{try{if(draft&&dirty&&!confirm('当前草稿有编辑。请确认已下载保存；继续会打开另一篇草稿。'))return;draft=createDraft({doi:$('intake-doi').value,title:$('intake-title').value,domain:$('intake-domain').value},catalog,studies,links);revision++;dirty=true;shown=30;if(pdfPending)attachPDF(pdfPending);else{render();status('草稿已建立。请核对题录，再按实验组整理。');}}catch(e){error(e);}};
$('intake-domain').onchange=()=>{if(!draft)return;draft.domain=$('intake-domain').value;for(const key of templates[draft.domain])if(!Object.hasOwn(draft.field_template,key))draft.field_template[key]=null;mark();render();};
$('intake-extra-topics').oninput=()=>{draft.topics=[...new Set([...draft.original_topics,...$('intake-extra-topics').value.split(/[,，\n]/).map(t=>t.trim()).filter(Boolean)])];mark();};
$('intake-notes').oninput=()=>{draft.notes=$('intake-notes').value;mark();};
$('intake-add').onclick=()=>{draft.evidence.push({group:'',field:'',value:'',unit:'',basis:'',locator:'',public_url:'',pending:true,source_review_required:true});mark();renderEvidence();};
$('intake-more').onclick=()=>{shown+=30;renderMentions();};
$('intake-crossref').onclick=async()=>{
 const d=draft,rev=revision,doi=normalizeDOI(d.identity.doi);if(!validDOI(doi)){status('此稿尚未确定 DOI，请先核对论文身份。');return;}
 $('intake-crossref').disabled=true;status('正在查询公开题录……');try{const r=await fetch('https://api.crossref.org/works/'+encodeURIComponent(doi),{signal:AbortSignal.timeout(20000),credentials:'omit'});if(!r.ok)throw Error('Crossref 暂未返回题录（'+r.status+'）。');const result=await r.json();if(draft!==d||revision!==rev){status('草稿已修改，未套用迟到的题录。请重新查询。');return;}applyCrossref(draft,result.message);mark();render();status('已补缺少的题录；原有值保留，差异列在下面。');}catch(e){error(e);}finally{$('intake-crossref').disabled=false;}
};
$('intake-import').onchange=async()=>{const file=$('intake-import').files[0];if(!file)return;try{if(draft&&dirty&&!confirm('确认当前草稿已保存，再打开另一份草稿？'))return;const result=importDraft(JSON.parse(await file.text()));draft=result;pdfPending=null;revision++;dirty=false;shown=30;$('intake-domain').value=draft.domain;$('intake-doi').value=draft.identity.doi||'';$('intake-title').value=draft.bibliography.title||'';render();status('已打开草稿，原有字段、分类和编辑均保留。');}catch(e){error(e);}finally{$('intake-import').value='';}};
$('intake-read').onclick=async()=>{
 if(busy)return;const file=$('intake-pdf').files[0];if(!file){status('请先选择本机 PDF。');return;}
 const start=Number($('intake-start').value),end=Number($('intake-end').value);if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end-start>=1000){status('请填写有效页码范围，每次最多读取 1000 页。');return;}
 busy=true;$('intake-read').disabled=true;const rev=revision;let task;
 try{
  $('intake-pdf-status').textContent='正在本机读取 PDF……';const buffer=await file.arrayBuffer();const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const pdfjs=await import('./vendor/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
  task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,useSystemFonts:false});
  const pdf=await task.promise;if(start>pdf.numPages)throw Error('起始页超过 PDF 总页数 '+pdf.numPages+'。');
  const pages=[];let header='';
  async function getText(i){const p=await pdf.getPage(i),c=await p.getTextContent();return c.items.map(t=>t.str+(t.hasEOL?'\n':' ')).join('');}
  header=await getText(1);
  for(let i=start;i<=Math.min(end,pdf.numPages);i++){pages.push({pdf_page:i,text:i===1?header:await getText(i)});$('intake-pdf-status').textContent=`已提取第 ${i} / ${pdf.numPages} 页……`;}
  const candidates=findDOIs(header.split(/\babstract\b|摘要|\breferences\b/i)[0].slice(0,1800));
  if(revision!==rev){$('intake-pdf-status').textContent='读取期间草稿已修改，未合并此 PDF；可重新读取。';return;}
  pdfPending={sha256,total_pages:pdf.numPages,header_doi_candidates:candidates,pages};
  const box=$('intake-doi-candidates');box.replaceChildren();for(const doi of candidates){const b=n('button','使用首页候选 DOI：'+doi);b.onclick=()=>{if(draft){status('已有草稿的 DOI 不自动更改。核对身份后可用此 DOI 新建草稿。');}$('intake-doi').value=doi;};box.append(b);}
  if(!draft&&candidates.length===1&&!$('intake-doi').value)$('intake-doi').value=candidates[0];
  if(draft)attachPDF(pdfPending);
  $('intake-pdf-status').textContent=`共 ${pdf.numPages} 页，本次提取 ${pages.map(p=>p.pdf_page).join('、')} 页文字。`+(pages.some(p=>p.text.trim())?'':'未提取到文字，请先做文字识别。')+(candidates.length?' 首页 DOI 仅作候选。':' 首页未找到 DOI，可手动填写题名。');
 }catch(e){$('intake-pdf-status').textContent='读取未完成：'+(e.name==='PasswordException'?'PDF 需要密码，请使用可直接阅读的副本。':e.message);}finally{await task?.destroy();busy=false;$('intake-read').disabled=false;}
};
function download(format){if(!draft)return;const json=format==='json',blob=new Blob([json?JSON.stringify(draft,null,2):draftQMD(draft)],{type:json?'application/json':'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=n('a');a.href=url;a.download=draft.draft_id.replace(/[^A-Za-z0-9_-]/g,'_')+'.'+(json?'json':'qmd');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);if(json)dirty=false;status('已生成下载文件；请确认浏览器保存成功。');}
$('intake-json').onclick=()=>download('json');$('intake-qmd').onclick=()=>download('qmd');
window.addEventListener('beforeunload',e=>{if(draft&&dirty){e.preventDefault();e.returnValue='';}});
try{[catalog,studies,links]=await Promise.all(['catalog.json','tpbm-studies.json','reading-links.json'].map(async file=>{const r=await fetch(new URL(file,import.meta.url));if(!r.ok)throw Error('书目加载失败，请刷新重试。');return r.json();}));$('intake-create').disabled=false;status('输入 DOI 或题名，开始整理；也可以继续编辑已有 JSON 草稿。');}catch(e){error(e);}
