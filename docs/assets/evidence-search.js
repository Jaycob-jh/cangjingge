import {retrieveEvidence} from './tpbm-evidence.mjs';
const $=id=>document.getElementById(id), node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
const link=(text,url)=>{const e=node('a',text);e.href=url;return e;};
const labels={population:'研究对象',design:'研究设计',wavelength:'波长',mode:'照射模式',target:'靶点',irradiance:'辐照度',spot:'光斑',duration:'时间',dose:'剂量',control:'对照',readout:'测量',timing:'测量时间'};
let index,studies;const form=$('evidence-form'),input=$('evidence-question'),status=$('evidence-status'),results=$('evidence-results');
function run(){
 if(!index)return;
 const question=input.value.trim();results.replaceChildren();if(!question){status.textContent='输入研究问题，或选一个例子。';return;}
 const result=retrieveEvidence(index,studies,question);
 status.textContent=result.recognized ? `找到 ${result.cards.length} 篇全文卡、${result.groups.length} 条有原文定位的参数记录。` : '问题中有尚未识别的限定，见下方。可以改写，或直接打开参数筛选。';
 const warnings=node('p',result.warnings.join(' '));results.append(warnings);
 const url=new URL(location.href);url.searchParams.set('query',question);history.replaceState(null,'',url);
 const parameters=new URL('tpbm-parameters.html',location.href);for(const[k,v]of Object.entries(result.filters))parameters.searchParams.set(k,v);
 // The parameter page has editable controls; pass the natural-language query explicitly.
 parameters.searchParams.set('query',question);
 results.append(link(result.recognized?'打开参数筛选，继续调整条件 →':'打开参数筛选，手动填写条件 →',result.recognized?parameters.href:'tpbm-parameters.html'));
 const ids=result.cards.slice(0,5).map(s=>s.id);
 if(ids.length)results.append(' · ',link('对比前 '+ids.length+' 篇','tpbm-compare.html?selected='+encodeURIComponent(ids.join(','))));
 if(!result.cards.length&&!result.groups.length)results.append(node('p','现有已核证据没有找到匹配。可以修改问题；不会用待核记录补成确定答案。'));
 for(const study of result.cards.slice(0,12)){
  const card=node('article');card.append(node('h2',study.title_zh||study.title),node('p',study.short+' · '+study.journal),link('原文',study.fulltext),' · ',link('研究详情','../library/tpbm/'+study.id+'.html'));
  const list=node('dl');for(const key of ['population','design','wavelength','mode','target','irradiance','duration','dose','control','readout']){
   const field=study.fields[key];if(!field)continue;const source=study.sources[field.source];
   const dd=node('dd',field.value+' ');if(source)dd.append(link(source.label,source.url));list.append(node('dt',labels[key]),dd);
  }card.append(list,node('h3','研究结果'));
  for(const item of study.results){const p=node('p',item.text+' '),source=study.sources[item.source];if(source)p.append(link(source.label,source.url));card.append(p);}
  card.append(node('p',study.interpretation),node('p','阅读范围：'+study.reading),link('加入研究对比','tpbm-compare.html?selected='+encodeURIComponent(study.id)));results.append(card);
 }
 if(result.cards.length>12)results.append(node('p','先显示12篇全文卡。补充对象、波长或其他条件可缩小范围。'));
 if(result.groups.length){const section=node('section');section.append(node('h2','匹配的实验参数'));
  for(const row of result.groups.slice(0,12)){const card=node('article');card.append(node('h3',row.paper.title),node('p',row.paper.group_labels?.[row.group]||row.group||'文献层记录 · 组别未拆分'));
   const ul=node('ul');for(const item of row.entries){const li=node('li',(index.fields[item.field]||item.field)+'：'+item.value+' · ');const url=/^PMC\d+$/.test(item.source_pmc||'')?'https://pmc.ncbi.nlm.nih.gov/articles/'+item.source_pmc+'/':/^\d+$/.test(item.source_pmid||'')?'https://pubmed.ncbi.nlm.nih.gov/'+item.source_pmid+'/':row.paper.doi?'https://doi.org/'+encodeURI(row.paper.doi):'https://pubmed.ncbi.nlm.nih.gov/'+row.paper.id+'/';li.append(link(item.where||'原刊',url));ul.append(li);}card.append(ul);section.append(card);
  }results.append(section);
 }
 const pending=node('details');pending.append(node('summary','另有 '+result.pending.length+' 条含待核证据的记录'));
 pending.append(node('p','待核记录不用于上面的证据回答。可在参数筛选页查看原始记录和待核说明。'));results.append(pending);
}
form.addEventListener('submit',e=>{e.preventDefault();run();});
for(const button of document.querySelectorAll('[data-question]'))button.onclick=()=>{input.value=button.dataset.question;run();};
try{const responses=await Promise.all(['tpbm-parameters.json','tpbm-studies.json'].map(p=>fetch('../assets/'+p)));if(responses.some(r=>!r.ok))throw Error('index');[index,studies]=await Promise.all(responses.map(r=>r.json()));input.value=new URL(location.href).searchParams.get('query')||'';run();}catch{status.textContent='证据索引加载失败，请刷新后重试。';}
