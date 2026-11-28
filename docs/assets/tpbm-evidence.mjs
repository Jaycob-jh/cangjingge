import {scopeOptions,entryScopeMatches,parseScopeQuery,maskScopeLanguage,scopedCardHints} from './parameter-scope.mjs';
import {common,numericMatches,targetMatches,categoryMatches,queryWarnings} from './tpbm-query.mjs';
const fields={subject:'Subject_Type',health:'Health_Status',mode:'Light_Mode',control:'Control_Type',temperature:'Temperature_Measured',target:'Target',wave:'Wavelength_nm',power:'Power_mW',irradiance:'Irradiance_mW_cm2',dose:'Fluence_J_cm2',duration:'Duration_min',frequency:'Pulse_Frequency_Hz',duty:'Duty_Cycle_pct',spot:'Spot_Area_cm2',sessions:'Total_Sessions'};
const numeric=new Set(['wave','power','irradiance','dose','duration','frequency','duty','spot','sessions']);
const concepts=[
 [/睡眠|失眠|sleep|insomnia/i,/睡眠|失眠|sleep|insomnia/i], [/记忆|memory/i,/记忆|memory/i],
 [/热效应|温升|加热|热对照/,/热|温升|heat|thermal|temperature/i],
 [/光穿透|光传输|穿透深度|穿过|衰减/,/穿透|传输|穿过|衰减|(?:optical|light)\s+attenuation|attenuation\s+(?:of\s+)?(?:optical|light)|penetrat|transmission/i],
 [/脑电|EEG/i,/脑电|EEG|electroencephalo/i,'measure'], [/微状态|microstate/i,/微状态|microstate/i],
 [/抑郁|depression/i,/抑郁|depress/i], [/帕金森|parkinson/i,/帕金森|parkinson/i],
 [/fMRI|功能磁共振/i,/fMRI|BOLD|功能磁共振/i,'measure'], [/fNIRS|近红外光谱/i,/fNIRS|近红外光谱/i,'measure'],
 [/MEG|脑磁/i,/MEG|脑磁|magnetoencephalo/i,'measure'],
 [/细胞机制|作用机制|生物机制|机制/,/腺苷|ATP|线粒体|炎症|细胞|mitochondri|mechanis|c-Fos/i],
 [/线粒体|mitochondri/i,/线粒体|mitochondri/i], [/认知|cognition/i,/认知|cognit/i],
];
const normalizeText=value=>String(value).normalize('NFKC').toLowerCase();
const doi=value=>String(value||'').trim().replace(/^(?:doi:\s*|https?:\/\/(?:dx\.)?doi.org\/)/i,'').toLowerCase();
function remainder(question,filters){
 question=maskScopeLanguage(question);
 let rest=question.normalize('NFKC').replace(/(?:https?:\/\/(?:dx\.)?doi.org\/|doi\s*:\s*)?10\.\d{4,9}\/[^\s，。；;]+/gi,'').replace(/PMID\s*:?\s*\d+/gi,'').replace(/\bdoi\s*:?/gi,'');
 for(const[q]of concepts)rest=rest.replace(new RegExp(q.source,'gi'),'');
 if(filters.target)rest=rest.replace(filters.target,'');
 rest=rest.replace(/(?:至少|不低于|大于等于|不小于|超过|大于|不超过|至多|最多|不高于|小于等于|低于|小于|>=|<=|≥|≤|>|<)?\s*\d+(?:\.\d+)?(?:\s*[-–—~～至到]\s*\d+(?:\.\d+)?)?\s*(?:mW|毫瓦|W|纳米|nm|cm[²2]|平方厘米|J|焦耳|分钟|min|秒|s|Hz|赫兹|%|次)(?:\s*\/\s*(?:cm[²2]|平方厘米))?/gi,'');
 rest=rest.replace(/经颅光生物调节|经颅光刺激|光生物调节|光刺激|tPBM|PBM|人体|人脑|人类|健康|成人|患者|疾病|动物|小鼠|大鼠|离体|细胞|仿真|模拟|human|animal|mouse|rat|healthy|脉冲频率|占空比|辐照度|能量密度|照射时间|光斑|波长|剂量|功率|时间|累计|点亮|运行|表面|头皮|脑内|估算|估计|实测|到脑|每次|疗程|连续光|连续波|脉冲光|脉冲|假刺激|热对照|无处理|无对照|测温|温升|CW|PW|sham|必须记录|必须|不要求有|不要求|为什么|怎么样|能不能|有没有|能否|有哪些|哪一种|哪种|哪个|多长时间|是否|可以|怎样|怎么|多少|什么|查找|看看|帮我|研究|文献|论文|参数|证据|结果|方面|比较|对比|差别|区别|相比|改善|影响|作用|改变|变化|有效|更好|请|的吗|吗|能|会|有|没有|查|看|做|的|与|和|或|后|在|对|中|了/gi,' ');
 return rest.replace(/[\p{P}\p{S}]+/gu,' ').trim();
}
function scientificText(study){return [study.title,study.title_zh,study.kind,study.reading,...Object.values(study.fields).map(f=>f.value),...study.results.map(r=>r.text),study.interpretation].join(' ');}
function words(text){
 if(globalThis.Intl?.Segmenter)return [...new Intl.Segmenter('zh-CN',{granularity:'word'}).segment(text)].filter(s=>s.isWordLike).map(s=>s.segment);
 return text.split(/\s+/).filter(Boolean);
}
export function parseEvidenceQuestion(question,corpus=''){
 const filters=common(question.replace(/细胞机制/g,'机制')),warnings=queryWarnings(question),required=concepts.filter(([q])=>q.test(question));
 const scoped=parseScopeQuery(question);let variants=[{...filters}],ambiguous=scoped.errors.length>0,masked=question;if(scoped.errors.length)warnings.push(...scoped.errors);
 for(const[key,unit]of [['frequency','Hz|赫兹'],['wave','nm|纳米']]){
  const pair=new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:'+unit+')?\\s*(?:和|与|或|对比|比较|vs|versus|、|，|,)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:'+unit+')','i');
  const matched=question.match(pair);
  const mentions=[...question.matchAll(new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:'+unit+')','gi'))].map(m=>m[1]);
  if(matched){
   if(/(?:至少|不低于|不超过|至多|最多|大于|小于|>=|<=|>|<|≥|≤)\s*$/.test(question.slice(0,matched.index)))ambiguous=true;
   const values=[...new Set([matched[1],matched[2]])];variants=variants.flatMap(v=>values.map(value=>({...v,[key]:value})));
   // Strip both quantities, including the shared-unit first value, from the language remainder.
   masked=masked.replace(matched[0],' ');
   if(mentions.some(v=>!values.includes(v)))ambiguous=true;
  }else if(new Set(mentions).size>1)ambiguous=true;
 }
 const modeCompare=/(?:脉冲(?:光)?|PW).{0,10}(?:与|和|或|对比|比较|vs).{0,10}(?:连续(?:光)?|CW)|(?:连续(?:光)?|CW).{0,10}(?:与|和|或|对比|比较|vs).{0,10}(?:脉冲(?:光)?|PW)/i.test(question);
 if(modeCompare){variants=variants.flatMap(v=>{const cw={...v,mode:'CW'};delete cw.frequency;return[{...v,mode:'PW'},cw];});warnings.push('连续光与脉冲光分别检索；频率条件只用于脉冲光。不同研究的结果需结合对象、剂量和对照阅读。');}
 variants=[...new Map(variants.map(v=>[JSON.stringify(v),v])).values()];
 if(variants.length>9)ambiguous=true;
 const tokens=words(remainder(masked,filters));const literals=[],unknown=[];
 const normalized=normalizeText(corpus);
 for(const token of tokens){if(!/^\d+$/.test(token)&&token!=='年'&&normalized.includes(normalizeText(token)))literals.push(token);else unknown.push(token);}
 if(ambiguous)unknown.push('多个数值的关系尚未明确');
 if(/哪个更有效|哪种更有效/.test(question))warnings.push('列出研究证据，不根据不同实验直接评选最优方案。');
 if(unknown.length)warnings.push('尚未识别这些限定：'+unknown.join('、')+'。请改写或使用参数筛选；本次不返回可能忽略限定的答案。');
 return {filters,variants,warnings,required,ambiguous,literals:[...new Set(literals)],unknown};
}
export function rowMatches(paper,entries,filters){
 const requested=new Set(Object.keys(filters).filter(k=>!Object.hasOwn(scopeOptions,k)));
 for(const[key,spec]of Object.entries(scopeOptions))if(filters[key])requested.add(spec.quantity);
 return [...requested].every(key=>key==='paper'
  ? [paper.title,paper.id,paper.doi,paper.author].join(' ').toLowerCase().includes(filters[key].toLowerCase())
  : entries.some(item=>item.field===fields[key] && entryScopeMatches(item,key,filters) && (!filters[key] || (numeric.has(key)?numericMatches(item.value,filters[key]):key==='target'?targetMatches(item.value,filters[key]):categoryMatches(fields[key],item.value,filters[key])))));

}
function cardContainsSimpleParameter(study,variant){
 const keys=Object.keys(variant);if(keys.length!==1)return false;const key=keys[0],query=variant[key];
 if(key==='wave'||key==='frequency'){
  const text=study.fields[key==='wave'?'wavelength':'mode']?.value||'';
  const unit=key==='wave'?'nm|纳米':'Hz|赫兹';
  const re=new RegExp('(\\d+(?:\\.\\d+)?(?:\\s*[-–—~～至到]\\s*\\d+(?:\\.\\d+)?)?)\\s*(?:'+unit+')','gi');
  return [...text.matchAll(re)].some(m=>numericMatches(m[1],query));
 }
 if(key==='mode')return query==='CW'?/连续光|连续波|\bCW\b/i.test(study.fields.mode?.value||''):/脉冲光|脉冲|\bPW\b/i.test(study.fields.mode?.value||'');
 return false;
}
export function retrieveEvidence(index,studyIndex,question){
 const studies=studyIndex.studies||[];const texts=new Map(studies.map(s=>[s.id,scientificText(s)]));
 const parsed=parseEvidenceQuestion(question,[...texts.values(),...index.papers.map(p=>p.title)].join(' '));const{filters,variants,warnings,required,literals,unknown}=parsed;
 const hasConditions=variants.some(v=>Object.keys(v).length>0);
 if(unknown.length)return{filters,variants,warnings,groups:[],cards:[],pending:[],recognized:false};
 const matchesConcept=(text,study)=>required.every(([,re,scope])=>re.test(scope==='measure'&&study?[...study.measures,study.fields.readout?.value||''].join(' '):text)) && literals.every(term=>normalizeText(text).includes(normalizeText(term)));
 const byDOI=new Map(studies.map(s=>[doi(s.doi),s]));const groups=[],pending=[];
 for(const paper of index.papers){
  const study=byDOI.get(doi(paper.doi));const text=paper.title+' '+(study?texts.get(study.id):'');
  if(!matchesConcept(text,study))continue;
  for(const[group,entries]of Object.entries(paper.groups)){
   const checked=entries.filter(e=>!e.pending&&!e.source_review_required);
   const matching=variants.filter(v=>rowMatches(paper,checked,v));
   if(hasConditions&&matching.length&&checked.length)groups.push({paper,group,entries:checked,variants:matching});
   const pendingMatches=variants.filter(v=>rowMatches(paper,entries,v));
   if(hasConditions&&entries.some(e=>e.pending||e.source_review_required)&&pendingMatches.length)pending.push({paper,group,entries:entries.filter(e=>e.pending||e.source_review_required),variants:pendingMatches});
  }
 }
 const matchedDOIs=new Set(groups.map(g=>doi(g.paper.doi)));
 const allScopeHints=variants.flatMap(v=>scopedCardHints(studies,v,numericMatches)),scopeHints=allScopeHints.filter(h=>!h.pending),pendingScopeHints=allScopeHints.filter(h=>h.pending);const scopeIDs=new Set(scopeHints.map(h=>h.study.id));
 const conditionalCards=[];
 const cards=studies.filter(s=>{
  if(!matchesConcept(texts.get(s.id),s))return false;
  if(!hasConditions)return required.length>0||literals.length>0;
  if(matchedDOIs.has(doi(s.doi))||(Object.keys(filters).length===1&&filters.paper&&doi(s.doi)===doi(filters.paper)))return true;
  if(scopeIDs.has(s.id)||variants.some(v=>cardContainsSimpleParameter(s,v))){conditionalCards.push(s.id);return true;}
  return false;
 });
 const score=study=>required.reduce((sum,[,re])=>sum+(re.test(study.title_zh||'')?4:0)+(re.test(study.title||'')?5:0)+(re.test(study.fields.readout?.value||'')?3:0)+(re.test(study.results.map(r=>r.text).join(' '))?2:0),0)+literals.reduce((sum,t)=>sum+(normalizeText(study.title_zh||'').includes(normalizeText(t))?3:0),0);
 cards.sort((a,b)=>score(b)-score(a)||Number(b.year)-Number(a.year));
 return{filters,variants,warnings,groups,cards,pending,conditionalCards,scopeHints,pendingScopeHints,recognized:hasConditions||required.length>0||literals.length>0};
}
