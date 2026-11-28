import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {common,targetMatches} from '../../assets/tpbm-query.mjs';
import {parseEvidenceQuestion,retrieveEvidence,restoreParameterRows} from '../../assets/tpbm-evidence.mjs';
import {makeEvidencePacket} from '../../assets/evidence-grounding.mjs';
const read=f=>JSON.parse(readFileSync(new URL('../../'+f,import.meta.url),'utf8'));
const index=read('assets/tpbm-parameters.json'),studies=read('data/tpbm-studies.json'),before=JSON.stringify(index);
const numericCases=[
 ['照八分钟',{duration:'8'}],['照三到五分钟',{duration:'3–5'}],['功率三点四瓦',{power:'3400'}],
 ['每平方厘米250毫瓦',{irradiance:'250'}],['250毫瓦每平方厘米',{irradiance:'250'}],
 ['0.25瓦每平方厘米',{irradiance:'250'}],['每平方厘米60焦耳',{dose:'60'}],
 ['占空比百分之五十',{duty:'50'}],['占空比百分之三点五',{duty:'3.5'}],
 ['一千零六十四纳米',{wave:'1064'}],['照射半小时',{duration:'30'}],['两小时',{duration:'120'}],
 ['健康受试者',{subject:'Human',health:'Healthy'}],['健康被试',{subject:'Human',health:'Healthy'}],
 ['健康志愿者',{subject:'Human',health:'Healthy'}],['单次照射',{sessions:'1'}],
 ['每周5次，总共20次',{sessions:'20'}],['每周5次',{}],
 ['左侧M1',{target:'左侧M1'}],['left M1',{target:'left M1'}],['C3',{target:'C3'}],
 ['额外记录温度',{}],['M10',{}],['不低于三百毫瓦',{power:'>=300'}],['连续激光',{mode:'CW'}],
];
for(const[q,expected]of numericCases)assert.deepEqual(common(q),expected,q);
assert(targetMatches('left M1','左侧运动皮层'));
assert(!targetMatches('right M1','左侧运动皮层'));
assert(!targetMatches('M10','M1'));
assert(!targetMatches('FC3','C3'));
assert(!targetMatches('AFz','Fz'));
const pairs=[['4分钟和8分钟','duration',['4','8']],['占空比25%和50%','duty',['25','50']],['70和120毫瓦每平方厘米','irradiance',['70','120']],['3次和14次','sessions',['3','14']]];
for(const[q,key,expected]of pairs)assert.deepEqual(parseEvidenceQuestion(q).variants.map(v=>v[key]),expected,q);
const researchCases=[
 {q:'健康受试者右额1064纳米，照八分钟，有假刺激',card:'wang-2022-metabolism',group:['35050164','']},
 {q:'健康人1064nm，功率三点四瓦',card:'tian-2016'},
 {q:'健康成人1064纳米，每平方厘米250毫瓦，照8分钟',card:'wang-2022-metabolism',candidate:'barrett-2013'},
 {q:'健康成人810纳米，占空比百分之五十',card:'zomorrodi-2019',group:['31004126','']},
 {q:'左侧运动皮层808纳米，单次照射的运动研究',candidate:'fekri-2019',noGroups:true},
 {q:'10Hz脉冲光和连续光的脑电微状态结果',card:'he-2026-pulse-eeg-microstates'},
 {q:'连续光4分钟和8分钟，记忆研究',candidate:'barrett-2013',noGroups:true},
 {q:'经颅光刺激的热效应和假刺激',card:'wang-2021-eeg-heat'},
 {q:'睡眠剥夺后的记忆光刺激',card:'salehpour-2018-sleep-deprivation'},
 {q:'3次和14次照射的脑损伤研究',card:'xuan-2016-repeated-tbi',group:['26990361','Three']},
 {q:'50毫瓦每平方厘米，照12分钟的小鼠',candidate:'ando-2011-pulse-tbi',noGroups:true},
 {q:'人体980纳米，50%占空比，10Hz',candidate:'he-2026-pulse-eeg-microstates',noGroups:true},
 {q:'C3',group:['31875125','C3']},
];
for(const c of researchCases){
 const r=retrieveEvidence(index,studies,c.q);assert(r.recognized,c.q);
 if(c.card)assert(r.cards.some(s=>s.id===c.card),c.q);
 if(c.group?.[0]==='26990361')assert.equal(r.cards[0].id,'xuan-2016-repeated-tbi','prefer a paper covering both treatment counts');
 if(c.candidate){assert(r.documentCandidates.some(x=>x.study.id===c.candidate),c.q);assert(!r.cards.some(s=>s.id===c.candidate),c.q+' document clue must stay separate');assert(!makeEvidencePacket(r.cards).some(e=>e.studyId===c.candidate));}
 if(c.group)assert(r.groups.some(g=>g.paper.id===c.group[0]&&g.group===c.group[1]),c.q);
 if(c.noGroups)assert.equal(r.groups.length,0,c.q+' must not join conditions across groups');
 for(const row of r.groups)assert(row.entries.every(e=>!e.pending&&!e.source_review_required&&e.where));
 for(const x of r.documentCandidates)for(const m of x.matches)assert(m.clues.every(c=>c.source?.label&&c.source?.url?.startsWith('https://')));
}
for(const q of ['只看人体，不要动物','平均300和峰值900mW/cm²','1mW/mm²脑内光刺激','每周5次','每天1次，总共28次']){
 const r=retrieveEvidence(index,studies,q);assert(!r.recognized,q);assert.equal(r.groups.length+r.cards.length,0,q);
}
const rows=restoreParameterRows(index,['31875125:C3','31875125:C4','31875125:C3','unknown:x']);
assert.deepEqual(rows.map(r=>r.key),['31875125:C3','31875125:C4']);
assert(rows.every(r=>r.entries.every(e=>!e.pending&&!e.source_review_required)));
assert.equal(JSON.stringify(index),before,'public/manual evidence must not mutate');
console.log(JSON.stringify({numericChineseCases:numericCases.length,comparisonCases:pairs.length,researchQuestions:researchCases.length,unsupportedCases:5,sideAndStableGroupSelection:true,manualDataUnchanged:true}));
