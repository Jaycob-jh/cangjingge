import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {composeCourseIndex} from '../../assets/tpbm-course.mjs';
import {retrieveEvidence,restoreParameterRows} from '../../assets/tpbm-evidence.mjs';
const read=f=>JSON.parse(readFileSync(new URL('../../'+f,import.meta.url),'utf8'));
const original=read('assets/tpbm-parameters.json'),saved=JSON.stringify(original),courses=read('data/tpbm-course-arms.json');
const index=composeCourseIndex(original,courses),studies=read('data/tpbm-studies.json');
const positives=[
 ['人体810纳米每周3次持续12周45J/cm2','chao2019-anterior'],
 ['人体810纳米每周3次持续12周60J/cm2','chao2019-posterior'],
 ['人体810纳米每周3次持续12周15J/cm2','chao2019-intranasal'],
 ['人体810纳米持续8周45J/cm2','chao2020-anterior'],
 ['人体810纳米共3次照射20分钟','longo2020-active'],
 ['人体810纳米共3次照射20分钟','chan2024-active'],
 ['小鼠810纳米每天1次持续14天共14次18J/cm2','xuan2016-14-day'],
 ['小鼠810纳米每天1次持续3天共3次18J/cm2','xuan2016-3-day'],
 ['小鼠810纳米每天1次持续3天8J/cm2','salehpour2018-sd-laser'],
 ['人体850纳米每天1次持续5天共5次','papi2022-active'],
 ['小鼠810纳米每周3次持续4周8J/cm2','meynagh2019-pbm-mb'],
 ['小鼠808纳米每天1次持续8天','li2021-repeated-trauma'],
 ['人体635纳米每周6次持续12周共72次','herkes2023-stage1-635'],
 ['人体810纳米每周6次持续12周共72次','herkes2023-stage2-switch-810'],
 ['小鼠660纳米每周3次持续6周4J/cm2','salehpour2017-660-4'],
 ['小鼠810纳米每周3次持续6周8J/cm2','salehpour2017-810-8'],
 ['人体每周3次持续6周共18次','naeser2023-office-plan'],
 ['小鼠1050纳米每天1次持续10天30J/cm2','semyachkina2023-sleep'],
 ['人体每周3次持续8周','salt2025-stage1-active'],
 ['小鼠1275纳米每天1次持续2周30J/cm2','aging2025-1275-10'],
 ['小鼠808纳米每天2次持续6周照射10分钟','bbb2025-app-ps1'],
 ['细胞808纳米每天2次持续3天照射2.5分钟','bbb2025-cell'],
 ['小鼠808纳米每周3次持续12周30Hz占空比20%2J/cm2','dl2025-30hz'],
 ['人体850纳米每周2次持续8周40Hz','asd2024-active'],
 ['人体1064纳米每周1次持续6周75J/cm2','bd2025-left'],
 ['人体810纳米每周2次持续9周总18次7J/cm2','older2023-per-trial'],
 ['人体每周2次持续7.5周总15次','gwi2021-active'],
 ['人体630纳米每周3次持续6周总18次','tbi2019-630-plan'],
];
for(const[q,id]of positives){const r=retrieveEvidence(index,studies,q);assert(r.recognized,q+JSON.stringify(r.warnings));assert(r.groups.some(g=>g.group==='course:'+id),q);}
const negatives=[
 ['人体810纳米每周3次持续12周45J/cm2','chao2019-posterior'],
 ['人体810纳米每周3次持续12周60J/cm2','chao2019-intranasal'],
 ['人体810纳米持续8周40Hz','chao2020-anterior'],
 ['小鼠810纳米每天1次持续14天共3次18J/cm2','xuan2016-14-day'],
 ['人体635纳米每周6次持续24周共144次','herkes2023-stage1-635'],
 ['人体635纳米每周6次持续12周实际完成72次','herkes2023-stage1-635'],
 ['人体850纳米每天1次持续5天42.75J/cm2','papi2022-active'],
 ['小鼠735纳米每周3次持续6周4J/cm2','salehpour2017-660-4'],
 ['人体每周3次持续8周904纳米','salt2025-stage1-active'],
 ['小鼠1050纳米每天1次持续10天300J/cm2','semyachkina2023-sleep'],
 ['小鼠1275纳米每天1次持续2周10J/cm2','aging2025-1275-10'],
 ['小鼠808纳米每天2次持续6周照射2.5分钟','bbb2025-app-ps1'],
 ['细胞808纳米每天2次持续3天照射10分钟','bbb2025-cell'],
 ['小鼠808纳米每周3次持续12周30Hz占空比50%2J/cm2','dl2025-30hz'],
 ['小鼠810纳米每天1次持续7天','develop2025-810-active'],
 ['小鼠810纳米每天1次持续5天共36次','develop2025-810-active'],
 ['人体735纳米每周2次持续4周','pvt2023-active'],
 ['人体850纳米每周2次持续8周照射30分钟','asd2024-active'],
 ['人体810纳米每周2次持续9周总18次189J/cm2','older2023-per-trial'],
];
for(const[q,id]of negatives)assert(!retrieveEvidence(index,studies,q).groups.some(g=>g.group==='course:'+id),q);
const noCard=index.papers.find(p=>p.id==='28735143');
assert.equal(noCard.doi,'10.1016/j.neurobiolaging.2017.06.025');
assert.equal(index.papers.filter(p=>p.id==='28735143').length,1,'existing DOI reused');
const key='28735143:course:salehpour2017-810-8';assert.equal(restoreParameterRows(index,[key])[0].key,key);
assert.equal(JSON.stringify(original),saved,'all original manual groups preserved');
console.log(JSON.stringify({positiveQueries:positives.length,negativeArmChecks:negatives.length,existingDOIAndManualGroupsPreserved:true}));
