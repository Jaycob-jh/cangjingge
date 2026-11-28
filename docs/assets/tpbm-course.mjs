// Course facts are explicit, source-linked arm/phase records, never inherited from another group.
export const courseNumeric={perWeek:['每周次数','Sessions_Per_Week'],perDay:['每日次数','Sessions_Per_Day'],courseWeeks:['持续 · 周（本方案或阶段）','Course_Weeks']};
export const courseSelectors={countBasis:['总次数口径','Session_Count_Basis',{Planned:'方案规定',Completed:'实际完成'}],armType:['照射组别','Intervention_Arm',{Active:'主动光',Sham:'假刺激',Comparator:'其他对照'}]};
export const courseKeys=new Set([...Object.keys(courseNumeric),...Object.keys(courseSelectors)]);
export function courseValue(item){return item.field==='Session_Count_Basis'?({Planned:'方案规定',Completed:'实际完成'}[item.value]||item.value):item.field==='Intervention_Arm'?({Active:'主动光',Sham:'假刺激',Comparator:'其他对照'}[item.value]||item.value):item.value;}

export function parseCourseQuery(text){
 const filters={},errors=[],spans=[];
 const num='\\d+(?:\\.\\d+)?(?:\\s*[-–—~～至到]\\s*\\d+(?:\\.\\d+)?)?';
 const cmp='至少|不低于|不小于|超过|大于|不超过|至多|最多|不高于|低于|小于|>=|<=|≥|≤|>|<';
 const op=s=>!s?'':/^(?:至少|不低于|不小于|>=|≥)$/.test(s)?'>=':/^(?:超过|大于|>)$/.test(s)?'>':/^(?:低于|小于|<)$/.test(s)?'<':'<=';
 const rate=(key,period)=>{
  const re=new RegExp('('+cmp+')?\\s*每(?:'+period+')\\s*('+cmp+')?\\s*('+num+')\\s*次|('+cmp+')?\\s*('+num+')\\s*次\\s*(?:/|每)\\s*(?:'+period+')','g');
  const values=[];for(const m of text.matchAll(re)){values.push(op(m[1]||m[2]||m[4])+(m[3]||m[5]).replace(/\s+/g,''));spans.push([m.index,m.index+m[0].length]);}
  if(new Set(values).size>1)errors.push('同一查询包含多个'+(key==='perWeek'?'每周':'每日')+'次数，请分别查询或填写范围');
  if(values.length)filters[key]=values[0];
 };
 rate('perWeek','周|星期');rate('perDay','天|日');
 let masked=text;for(const[a,b]of spans.slice().sort((a,b)=>b[0]-a[0]))masked=masked.slice(0,a)+' '.repeat(b-a)+masked.slice(b);
 if(/(?:随访|停治|洗脱).{0,6}\d+\s*(?:周|天|日)/.test(masked))errors.push('随访、停治或洗脱时间不是照射疗程，请分开查询');
 const durations=[];
 const duration=new RegExp('(?:持续|连续|疗程(?:为)?|为期|治疗|照射|共)?\\s*('+cmp+')?\\s*('+num+')\\s*(周|星期|天|日)(?!龄)','g');
 for(const m of masked.matchAll(duration)){
  if(m[3]==='天'||m[3]==='日'){
   if(!/(?:持续|连续|疗程|为期|治疗|照射|共)/.test(m[0]))continue;
  }
  const scale=/周|星期/.test(m[3])?1:1/7;
  const value=m[2].split(/\s*[-–—~～至到]\s*/).map(v=>String(Number((Number(v)*scale).toPrecision(12)))).join('–');
  durations.push(op(m[1])+value);spans.push([m.index,m.index+m[0].length]);
 }
 if(new Set(durations).size>1)errors.push('同一查询包含多个疗程时长，请分别查询');
 if(durations.length)filters.courseWeeks=durations[0];
 const total=text.match(new RegExp('(?:总共|一共|共计|合计|总计|累计|总次数(?:为)?|总疗程|共)\\s*('+cmp+')?\\s*('+num+')\\s*次'));
 if(total)filters.sessions=op(total[1])+total[2].replace(/\s+/g,'');
 if(spans.length&&!total){const counts=[...masked.matchAll(new RegExp('('+cmp+')?\\s*('+num+')\\s*次','g'))];if(counts.length===1)filters.sessions=op(counts[0][1])+counts[0][2].replace(/\s+/g,'');else if(counts.length>1)errors.push('多个总次数请分别查询');}
 if(/(?:实际|已经|已)(?:完成|接受|做过|照射)(?:了)?\s*(?:\d|总次数)|实际(?:完成)?(?:的)?总次数/.test(text))filters.countBasis='Completed';
 else if(/(?:计划|方案|规定)(?:的)?(?:总共|总计|总次数|共)?\s*(?:\d|至少|最多)|方案总次数/.test(text))filters.countBasis='Planned';
 if(/假刺激组|假光组|sham\s+arm/i.test(text))filters.armType='Sham';
 else if(/主动(?:光|刺激)?组|真光组|active\s+arm/i.test(text))filters.armType='Active';
 for(const[a,b]of spans.slice().sort((a,b)=>b[0]-a[0]))masked=masked.slice(0,a)+' '.repeat(b-a)+masked.slice(b);
 // Masking changes only lengths with spaces, preserving all other input positions.
 const hasSchedule=spans.length>0||/每(?:周|星期|天|日)/.test(text);
 if(/每(?:周|星期|天|日)/.test(masked))errors.push('频次尚未识别，请写成每周2次或每日1次');
 if(/每(?:周|星期|天|日)\s*\d+\s*次?\s*(?:和|与|或|、)\s*\d+\s*次/.test(text))errors.push('多个频次请分别查询或填写范围');
 return {filters,errors,hasSchedule,masked};
}

export function composeCourseIndex(base,course){
 if(!course||course.schema_version!==1||!Array.isArray(course.arms))throw Error('疗程索引格式无效');
 const copy=structuredClone(base);copy.fields={...Object.fromEntries(Object.values(courseNumeric).map(([label,field])=>[field,label])),...Object.fromEntries(Object.values(courseSelectors).map(([label,field])=>[field,label])),Protocol_Note:'方案说明',...copy.fields};
 const normalize=d=>String(d||'').trim().replace(/^(?:doi:\s*|https?:\/\/(?:dx\.)?doi.org\/)/i,'').toLowerCase();
 const seen=new Set();
 for(const arm of course.arms){
  if(!arm.id||seen.has(arm.id)||!arm.doi||!Array.isArray(arm.entries))throw Error('疗程组ID或DOI无效');seen.add(arm.id);
  let paper=copy.papers.find(p=>normalize(p.doi)===normalize(arm.doi));
  if(!paper){if(copy.papers.some(p=>p.id===arm.paper_id))throw Error('疗程论文身份冲突');paper={id:arm.paper_id,doi:arm.doi,title:arm.title,author:arm.author,year:arm.year,card:arm.study_id,groups:{}};copy.papers.push(paper);}
  const key='course:'+arm.id;if(Object.hasOwn(paper.groups,key))throw Error('疗程组已有人工记录，未替换');
  paper.groups[key]=structuredClone(arm.entries);paper.group_labels={...paper.group_labels,[key]:arm.label};
 }
 return copy;
}
