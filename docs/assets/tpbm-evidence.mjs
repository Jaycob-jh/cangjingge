import {common,numericMatches,targetMatches,categoryMatches,queryWarnings} from './tpbm-query.mjs';
const fields={subject:'Subject_Type',health:'Health_Status',mode:'Light_Mode',control:'Control_Type',temperature:'Temperature_Measured',target:'Target',wave:'Wavelength_nm',power:'Power_mW',irradiance:'Irradiance_mW_cm2',dose:'Fluence_J_cm2',duration:'Duration_min',frequency:'Pulse_Frequency_Hz',duty:'Duty_Cycle_pct',spot:'Spot_Area_cm2',sessions:'Total_Sessions'};
const numeric=new Set(['wave','power','irradiance','dose','duration','frequency','duty','spot','sessions']);
const concepts=[
 [/睡眠|sleep/i,/睡眠|sleep|insomnia/i], [/记忆|memory/i,/记忆|memory/i],
 [/热效应|温升|加热|热对照/,/热|温升|heat|thermal|temperature/i],
 [/光穿透|光传输|穿透深度/,/穿透|传输|attenuat|penetrat|transmission/i],
 [/脑电|EEG/i,/脑电|EEG|electroencephalo/i], [/微状态|microstate/i,/微状态|microstate/i],
 [/抑郁|depression/i,/抑郁|depress/i], [/帕金森|parkinson/i,/帕金森|parkinson/i],
 [/fMRI|功能磁共振/i,/fMRI|BOLD|功能磁共振/i], [/fNIRS|近红外光谱/i,/fNIRS|近红外光谱/i],
 [/线粒体|mitochondri/i,/线粒体|mitochondri/i], [/认知|cognition/i,/认知|cognit/i],
];
function unrecognizedTerms(question, filters) {
 let rest=question.normalize('NFKC').replace(/(?:https?:\/\/(?:dx\.)?doi.org\/|doi\s*:)?10\.\d{4,9}\/[^\s，。；;]+/gi,'').replace(/PMID\s*:?\s*\d+/gi,'');
 rest=rest.replace(/\bdoi\s*:?/gi,'');
 for(const [q]of concepts)rest=rest.replace(new RegExp(q.source,'gi'),'');
 if(filters.target)rest=rest.replace(filters.target,'');
 rest=rest.replace(/(?:至少|不低于|大于等于|不小于|超过|大于|不超过|至多|最多|不高于|小于等于|低于|小于|>=|<=|≥|≤|>|<)?\s*\d+(?:\.\d+)?(?:\s*[-–—~～至到]\s*\d+(?:\.\d+)?)?\s*(?:mW|毫瓦|W|纳米|nm|cm[²2]|平方厘米|J|焦耳|分钟|min|秒|s|Hz|赫兹|%|次)(?:\s*\/\s*(?:cm[²2]|平方厘米))?/gi,'');
 rest=rest.replace(/经颅光生物调节|经颅光刺激|光生物调节|光刺激|tPBM|PBM|人体|人脑|人类|健康|成人|患者|疾病|动物|小鼠|大鼠|离体|细胞|仿真|模拟|human|animal|mouse|rat|healthy|脉冲频率|占空比|辐照度|能量密度|照射时间|光斑|波长|剂量|功率|疗程|连续光|连续波|脉冲光|脉冲|假刺激|热对照|无处理|无对照|测温|温升|CW|PW|sham|必须记录|必须|不要求有|不要求|有|没有|研究|文献|论文|参数|证据|结果|哪些|什么|怎么|怎样|是否|可以|帮我|请|查找|查|看看|看|做|的|与|和|后|在|对|中|了/gi,'');
 return rest.replace(/[\s\p{P}\p{S}]+/gu,'');
}
const doi=value=>String(value||'').trim().replace(/^(?:doi:\s*|https?:\/\/(?:dx\.)?doi.org\/)/i,'').toLowerCase();
export function rowMatches(paper,entries,filters){
 return Object.entries(filters).every(([key,value])=>key==='paper'
  ? [paper.title,paper.id,paper.doi,paper.author].join(' ').toLowerCase().includes(value.toLowerCase())
  : entries.some(item=>item.field===fields[key] && (numeric.has(key)?numericMatches(item.value,value):key==='target'?targetMatches(item.value,value):categoryMatches(fields[key],item.value,value))));
}
export function retrieveEvidence(index,studyIndex,question){
 const filters=common(question),warnings=queryWarnings(question),required=concepts.filter(([q])=>q.test(question)).map(([,e])=>e);
 const hasConditions=Object.keys(filters).length>0;
 const unknown=unrecognizedTerms(question,filters);
 if(unknown) return {filters,warnings:[...warnings,'尚未识别这些限定：'+unknown+'。请改写或使用参数筛选；本次不返回可能忽略限定的答案。'],groups:[],cards:[],pending:[],recognized:false};
 const matchesConcept=text=>required.every(re=>re.test(text));
 const studies=studyIndex.studies||[],byDOI=new Map(studies.map(s=>[doi(s.doi),s]));
 const groups=[],pending=[];
 for(const paper of index.papers){
  const study=byDOI.get(doi(paper.doi));
  const text=paper.title+' '+JSON.stringify(study||{});
  if(!matchesConcept(text))continue;
  for(const [group,entries]of Object.entries(paper.groups)){
   const checked=entries.filter(e=>!e.pending&&!e.source_review_required);
   if(hasConditions && rowMatches(paper,checked,filters) && checked.length)groups.push({paper,group,entries:checked});
   if(hasConditions && entries.some(e=>e.pending||e.source_review_required) && rowMatches(paper,entries,filters))pending.push({paper,group,entries:entries.filter(e=>e.pending||e.source_review_required)});
  }
 }
 const matchedDOIs=new Set(groups.map(g=>doi(g.paper.doi)));
 const cards=studies.filter(s=>matchesConcept(JSON.stringify(s)) && (hasConditions
  ? matchedDOIs.has(doi(s.doi)) || (Object.keys(filters).length===1 && filters.paper && doi(s.doi)===doi(filters.paper))
  : required.length>0));
 return {filters,warnings,groups,cards,pending,recognized:hasConditions||required.length>0};
}
