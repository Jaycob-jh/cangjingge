export const isPendingValue=item=>Boolean(item?.pending||item?.source_review_required||/待核|尚待|口径不明|测量面不明/.test(item?.value||item?.text||''));
// Scope is evidence, not a default inferred from a field name or light mode.
export const scopeOptions={
 powerPlane:{quantity:'power',label:'功率位置',choices:{surface:'表面 / 入射处',brain:'脑内（不限估算/实测）',brain_estimated:'估算脑内',brain_measured:'实测脑内'}},
 doseBasis:{quantity:'dose',label:'剂量：平均 / 峰值',choices:{average:'平均',peak:'峰值'}},
 powerBasis:{quantity:'power',label:'功率口径',choices:{average:'平均',peak:'峰值'}},
 irradianceBasis:{quantity:'irradiance',label:'辐照度口径',choices:{average:'平均',peak:'峰值'}},
 irradiancePlane:{quantity:'irradiance',label:'辐照度位置',choices:{surface:'表面 / 入射处',brain:'脑内（不限估算/实测）',brain_estimated:'估算脑内',brain_measured:'实测脑内'}},
 dosePlane:{quantity:'dose',label:'剂量位置',choices:{surface:'表面 / 入射处',brain:'脑内（不限估算/实测）',brain_estimated:'估算脑内',brain_measured:'实测脑内'}},
 durationBasis:{quantity:'duration',label:'时间口径',choices:{on:'累计点亮',elapsed:'设备运行 / 总历时'}},
};
const normalize=text=>String(text||'').normalize('NFKC').replace(/毫瓦/g,'mW').replace(/平方厘米/g,'cm2').replace(/焦耳/g,'J');
const stripNegative=text=>text.replace(/(?:不是|并非|未测得|未实测|not\s+(?:measured|a|the))[^，,；;。]*/gi,'');
function classify(raw){
 const text=stripNegative(raw),basis=/平均|\b(?:average|mean|time-averaged)\b/i.test(text),peak=/峰值|峰功率|\bpeak\b/i.test(text);
 const brain=/脑内|到脑|入脑|脑组织|皮层|海马|杏仁核|\b(?:brain|cortex|cortical|hippocamp\w*)\b/i.test(text);
 const surface=/头皮|颅骨表面|\bscalp\b/i.test(text)||!brain&&/表面|入射处|\b(?:surface|incident)\b/i.test(text);
 const estimated=/估算|估计|模拟|仿真|\b(?:estimated?|simulat\w*|modelled|modeled)\b/i.test(text),measured=/实测|测得|\bmeasured\b/i.test(text);
 const on=/累计点亮|点亮时间|出光时间|亮灯时间|累计开灯|\bon[- ]time\b/i.test(text),elapsed=/设备运行|运行时间|总历时|总时长|\belapsed\b|wall[- ]clock/i.test(text);
 return{basis:basis!==peak?(basis?'average':'peak'):null,plane:surface!==brain?(surface?'surface':estimated&&!measured?'brain_estimated':measured&&!estimated?'brain_measured':'brain'):null,durationBasis:on!==elapsed?(on?'on':'elapsed'):null};
}
const units=[['irradiance',/^(mW|W)\s*\/\s*cm2$/i],['dose',/^(mJ|kJ|J)\s*\/\s*cm2$/i],['power',/^(mW|W)$/i],['duration',/^(秒|seconds?|s|分钟|minutes?|min|ms)$/i]];
const unitPattern=/mW\s*\/\s*cm2|W\s*\/\s*cm2|mJ\s*\/\s*cm2|kJ\s*\/\s*cm2|J\s*\/\s*cm2|mW|W|分钟|minutes?\b|min\b|秒|seconds?\b|ms\b|s\b/gi;
const numPattern=/(?<![\w.])\d+(?:\.\d+)?(?:\s*[-–—~～至到]\s*\d+(?:\.\d+)?)?/g;
const isList=text=>!text.replace(/\b(?:average|mean|peak|low|medium|high|approximately|about|and)\b|平均|峰值|低档|中档|高档|低|中|高|约|均|与|和|[\d\s.,，、–—~～至到-]/gi,'');
export function scopedQuantities(raw){
 const text=normalize(raw),us=[...text.matchAll(unitPattern)].filter(u=>!/[A-Za-z0-9]/.test(text[u.index+u[0].length]||'')&&(!/^(?:mW|W)$/i.test(u[0])||!/^\s*\//.test(text.slice(u.index+u[0].length))));
 const ns=[...text.matchAll(numPattern)].filter(n=>!us.some(u=>n.index>=u.index&&n.index<u.index+u[0].length)),out=[];
 for(let i=0;i<ns.length;i++){
  const n=ns[i],u=us.find(u=>u.index>=n.index+n[0].length);if(!u||u.index-n.index>100)continue;
  const tail=text.slice(n.index+n[0].length,u.index);if(!isList(tail))continue;
  const kind=units.find(([,re])=>re.test(u[0]))?.[0];if(!kind)continue;
  const start=Math.max(i?ns[i-1].index+ns[i-1][0].length:0,text.lastIndexOf(';',n.index)+1,text.lastIndexOf('；',n.index)+1,text.lastIndexOf('。',n.index)+1);
  let prefix=text.slice(start,n.index).replace(/^.*[，,]/,'').slice(-90);
  if(/未报告|未列|未提供|没有报告|not reported/i.test(prefix))continue;
  const next=ns[i+1]?.index??text.length,following=text.slice(u.index+u[0].length),boundary=following.search(/[；;。]/),nextInClause=next<text.length&&(boundary<0||next<u.index+u[0].length+boundary),after=text.slice(u.index+u[0].length,next).split(/[；;。]/)[0];
  // A qualifier following the unit belongs here only if immediately parenthesized,
  // or a short anatomical locator; never borrow the next quantity's prefix.
  const suffix=after.match(/^\s*[（(][^）)]*[）)]/)?.[0]||(!nextInClause?(after.match(/^\s*(?:峰值|平均值?|peak|average)/i)?.[0]||after.match(/^(?:\s*\/\s*次)?[，,\s]*(?:均为|为)?(?:头皮处|颅骨表面|入射处|皮层表面|表面|脑内|scalp|surface)/i)?.[0]):'')||'';
  let scope=classify(prefix+' '+suffix);
  const prev=out.at(-1);if(prev&&prev.unitIndex===u.index&&/^[\s,，、]+$/.test(text.slice(prev.end,n.index))){scope={basis:scope.basis||prev.basis,plane:scope.plane||prev.plane,durationBasis:scope.durationBasis||prev.durationBasis};}
  let scale=1;const unit=u[0].replace(/\s+/g,'');if(kind==='irradiance'||kind==='power')scale=/^W/i.test(unit)?1000:1;
  if(kind==='dose')scale=/^mJ/i.test(unit)?0.001:/^kJ/i.test(unit)?1000:1;
  if(kind==='duration')scale=/^(?:ms)$/i.test(unit)?1/60000:/^(?:s|seconds?|秒)$/i.test(unit)?1/60:1;
  const value=n[0].split(/\s*[-–—~～至到]\s*/).map(v=>String(Number((Number(v)*scale).toPrecision(12)))).join('–');
  out.push({kind,value,...scope,raw:n[0],unit:u[0],start:n.index,end:n.index+n[0].length,unitIndex:u.index});
 }
 return out;
}
export function scopeMatches(actual,wanted){return actual===wanted||wanted==='brain'&&['brain_estimated','brain_measured'].includes(actual);}
export function entryScopeMatches(item,key,filters){
 const scopes=Object.entries(scopeOptions).filter(([k,s])=>s.quantity===key&&filters[k]);if(!scopes.length)return true;
 const scope=classify(item.source_note||'');
 return scopes.every(([k])=>scopeMatches(item[k]||scope[k.endsWith('Plane')?'plane':k==='durationBasis'?'durationBasis':'basis'],filters[k]));
}
function unsupportedCompoundUnit(raw){
 const text=normalize(raw);
 return [...text.matchAll(unitPattern)].some(u=>{
  if(/[A-Za-z]/.test(text[u.index-1]||''))return false;
  const tail=text.slice(u.index+u[0].length);if(!/^\s*\//.test(tail))return false;
  const perSession=tail.match(/^\s*\/\s*(?:次|sessions?)(?![A-Za-z])/i);
  return !perSession||/^\s*\//.test(tail.slice(perSession[0].length));
 });
}
export function parseScopeQuery(question){
 const qs=scopedQuantities(question),filters={},errors=[];
 if(unsupportedCompoundUnit(question))errors.push('尚未支持该复合单位，请换成mW、mW/cm²、J/cm²或分钟');
 if(/(?:不是|排除|不要|不含|非)(?:估算|实测|脑内|头皮|表面|峰值|平均|累计点亮|设备运行)/.test(question))errors.push('尚未自动应用排除口径，请直接选择需要的口径');
 if(/平均.{0,5}(?:和|与|、|及).{0,5}峰值|峰值.{0,5}(?:和|与|、|及).{0,5}平均/.test(question))errors.push('平均值与峰值请分别查询，避免把两个口径合成一个条件');
 if(!qs.length&&/(?:平均|峰值|脑内|表面|点亮|设备运行)(?:辐照度|功率|剂量|时间)?\s*\d/.test(question))errors.push('请为该口径的数值写明单位');
 for(const[kind]of units){const matches=qs.filter(q=>q.kind===kind),scoped=matches.filter(q=>q.basis||q.plane||q.durationBasis);if(!scoped.length)continue;
  if(new Set(matches.map(q=>q.value+'|'+q.basis+'|'+q.plane+'|'+q.durationBasis)).size>1){errors.push('同一参数有多个数值或口径，请分开查询');continue;}
  const q=scoped[0];for(const[attr,val]of Object.entries({basis:q.basis,plane:q.plane,durationBasis:q.durationBasis})){if(val&&!Object.entries(scopeOptions).some(([k,o])=>o.quantity===kind&&(attr==='plane'?k.endsWith('Plane'):attr==='durationBasis'?k==='durationBasis':k.endsWith('Basis')&&k!=='durationBasis')))errors.push('该数值的限定没有对应筛选项，请明确参数名称或分开查询');}
  const prefix=normalize(question).slice(0,q.start).slice(-50);
  const cmp=prefix.match(/(至少|不低于|大于等于|不小于|超过|大于|不超过|至多|最多|不高于|小于等于|低于|小于|>=|<=|≥|≤|>|<)\s*(?:(?:平均|峰值|估算脑内|实测脑内|脑内|表面|辐照度|功率|剂量|能量密度|约|为|的)\s*)*$/);
  const op=!cmp?'':/^(?:至少|不低于|大于等于|不小于|>=|≥)$/.test(cmp[1])?'>=':/^(?:超过|大于|>)$/.test(cmp[1])?'>':/^(?:低于|小于|<)$/.test(cmp[1])?'<':'<=';filters[kind]=op+q.value;
  for(const[key,spec]of Object.entries(scopeOptions)){if(spec.quantity!==kind)continue;const value=q[key.endsWith('Plane')?'plane':key==='durationBasis'?'durationBasis':'basis'];if(value)filters[key]=value;}
 }
 // Scope without a number is a useful manual/natural condition, bound to its noun.
 for(const[noun,kind]of [['辐照度','irradiance'],['功率','power'],['能量密度','dose'],['剂量','dose'],['时间','duration']]){
  const match=normalize(question).match(new RegExp('(?:平均|峰值|估算脑内|实测脑内|脑内|头皮|表面|累计点亮|设备运行|运行|总历时)(?:的)?(?:照射)?'+noun));if(!match)continue;
  const raw=match[0].replace('运行时间','设备运行时间'),scope=classify(raw);
  if(scope.basis&&!Object.keys(scopeOptions).some(k=>scopeOptions[k].quantity===kind&&k.endsWith('Basis')&&k!=='durationBasis'))errors.push('该参数的平均或峰值口径尚不能筛选，请明确参数名称');
  for(const[key,spec]of Object.entries(scopeOptions))if(spec.quantity===kind){const v=scope[key.endsWith('Plane')?'plane':key==='durationBasis'?'durationBasis':'basis'];if(v&&!filters[key])filters[key]=v;}
 }
 return{filters,errors,quantities:qs};
}
export function maskScopeLanguage(question){return question.replace(/(?:头皮|表面|估算脑内|实测脑内|脑内)(?:的)?(?=剂量|能量密度|辐照度)/g,'').replace(/累计点亮|点亮时间|设备运行时间|设备运行|总历时|平均|峰值|估算脑内|实测脑内/g,' ');}
export function scopedCardHints(studies,filters,numericMatches){
 const quantities=[...new Set(Object.keys(filters).filter(k=>['power','irradiance','dose','duration'].includes(k)).concat(Object.keys(scopeOptions).filter(k=>filters[k]).map(k=>scopeOptions[k].quantity)))];
 if(quantities.length!==1||!Object.keys(scopeOptions).some(k=>filters[k]))return[];
 const quantity=quantities[0],scopes=Object.entries(scopeOptions).filter(([k,s])=>s.quantity===quantity&&filters[k]);
 const allowed=new Set([quantity,'paper','subject','health',...scopes.map(([k])=>k)]);if(Object.keys(filters).some(k=>!allowed.has(k)))return[];
 return studies.flatMap(study=>{
  const subjectKinds={Human:['健康人','临床','人体研究'],Animal:['动物研究'],Simulation:['计算模型'],Ex_Vivo:['离体组织']};
  if(filters.subject&&!subjectKinds[filters.subject]?.includes(study.kind))return[];
  if(filters.health&&!(filters.health==='Healthy'&&study.kind==='健康人'||filters.health==='Disease'&&study.kind==='临床'))return[];
  if(filters.paper&&![study.title,study.id,study.doi].join(' ').toLowerCase().includes(filters.paper.toLowerCase()))return[];
  const fields=quantity==='power'?['power','irradiance']:[quantity];
  return fields.flatMap(fieldName=>{const field=study.fields[fieldName];if(!field)return[];
  const matches=scopedQuantities(field.value).filter(q=>q.kind===quantity&&(!filters[quantity]||numericMatches(q.value,filters[quantity]))&&scopes.every(([key])=>scopeMatches(q[key.endsWith('Plane')?'plane':key==='durationBasis'?'durationBasis':'basis'],filters[key])));
  return matches.length?[{study,field:fieldName,text:field.value,source:study.sources[field.source],matches,pending:isPendingValue(field)}]:[];});
 });
}
