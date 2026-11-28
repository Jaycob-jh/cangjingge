import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {composeCourseIndex} from '../../assets/tpbm-course.mjs';
import {retrieveEvidence,restoreParameterRows} from '../../assets/tpbm-evidence.mjs';
const read=f=>JSON.parse(readFileSync(new URL('../../'+f,import.meta.url),'utf8'));
const base=read('assets/tpbm-parameters.json'),saved=JSON.stringify(base),courses=read('data/tpbm-course-arms.json'),index=composeCourseIndex(base,courses),studies=read('data/tpbm-studies.json');
const positive=[
 ['动物持续10天照射61分钟','age2025-3m'],
 ['动物660纳米每天1次持续3天照射2分钟','mtbi2025-660'],
 ['人体810纳米共9次','mmt2025-active'],
 ['动物660纳米每天1次持续6天照射30分钟','lps2024-660'],
 ['动物825纳米每周3次持续12周照射2分钟','sco2024-sco-laser'],
 ['人体每周3次持续12周照射20分钟','japan2024-frontal'],
 ['动物1050纳米每天1次持续14天30J/cm2','glioma2024-glioma-sleep'],
 ['动物660纳米共2次照射20分钟','zcorzo2024-mixed-male-660'],
 ['动物830纳米每天1次持续3天照射12分钟','psd2023-young'],
 ['动物1267纳米持续2周32J/cm2','lymph2023-32'],
 ['动物1267纳米持续1周32J/cm2','insulin2023-dm'],
 ['人体670纳米每天1次持续4天照射20分钟','atp2023-four-day'],
 ['动物1050纳米每天1次持续7天500J/cm2','meningeal2023-sleep'],
 ['人体635纳米每周6次持续12周照射12分钟','pd2023-posthoc-635'],
 ['动物630纳米每天1次持续5天43.5J/cm2','tlt2022-alz'],
 ['人体每周6次持续12周照射12分钟','pdprotocol2022-initial-red'],
 ['动物473纳米每天6次持续7天40Hz','blue2022-head-led'],
 ['动物810纳米每天1次持续5天照射24分钟','nocfo2022-male-active'],
 ['动物810纳米每天1次持续58天照射2.5分钟','chronic2022-young'],
 ['动物660纳米每天1次持续14天共14次照射10分钟','hibd2022-rat'],
 ['动物940纳米每天2次持续3天','implant2022-post-940'],
 ['人体每周2次持续4周照射30分钟','microbiome2022-phase2'],
 ['动物808纳米每周5次持续6周10Hz占空比88%','blast2021-blast'],
 ['动物810纳米每天1次持续58天','aged2021-58day'],
 ['动物808纳米每天1次持续5天照射2分钟','gci2021-ir'],
 ['人体每周3次持续40周','pd2021-a-home'],
 ['动物808纳米每天1次持续7天照射2分钟','uwt2021-pbm'],
 ['动物635纳米每天1次持续30天照射10分钟','depression2021-cums'],
 ['动物635纳米每天1次持续30天照射10分钟','jnk2020-app-ps1'],
 ['动物每天1次持续7天照射3分钟','interval2020-long'],
 ['动物670纳米每天1次持续7天照射3分钟','mptp2019-pbm'],
 ['动物675纳米共13次3.594J/cm2','lps2019-10-whole'],
 ['人体810纳米每周2次持续9周照射1.5分钟','rehab2019-active'],
 ['人体每周3次持续6周共18次照射20分钟','tbi2019-whole'],
 ['动物810纳米每天1次持续14天33.3J/cm2','gbi2019-coq10'],
 ['动物每天2次持续7天照射2.5分钟','blivet2018-combined-2-5'],
 ['动物808纳米每天1次持续4周2.5mW/cm2','syn2015-chronic-2-5'],
 ['动物670纳米每周5次持续4周4J/cm2','ad2014-k3'],
 ['动物810纳米每天1次持续14天共14次18J/cm2','tbi2013-active-14'],
 ['人体810纳米实际完成3次照射10分钟','insomnia2025-active-completed'],
 ['人体850纳米每周3次持续3周共8次照射8分钟','dyscalculia2025-active'],
 ['动物1064纳米每天1次持续4天照射5分钟','enos2024-wt'],
 ['动物1267纳米每天1次持续7天4J/cm2','ivh2023-newborn-rat'],
 ['人体1064纳米实际完成5次照射20分钟','tbi2022-completed-5'],
 ['人体1064纳米每天1次持续1周照射12分钟','hu2023-active'],
 ['人体1070纳米每周3次持续4周照射14分钟','covid2023-head'],
 ['人体850纳米每周2次共30次照射8分钟','aphasia2023-cluster'],
 ['动物1070纳米每天1次持续60天40Hz','microglia2021-40'],
 ['动物810纳米每天1次持续14天占空比88%8J/cm2','noise2021-ee-pbm'],
 ['人体870纳米每周3次持续6周共18次照射39分钟','naeser2019-d'],
 ['动物810纳米每周3次持续3周16J/cm2','depression2019-16'],
 ['动物904纳米每天1次持续21天7J/cm2','stroke2019-21'],
 ['动物810纳米每天1次持续5天33.3J/cm2','restraint2018-coq10'],
 ['人体每天1次持续4周共28次照射6分钟','dementia2017-active'],
 ['人体1064纳米每周1次持续5周照射8分钟','older2017-cognition'],
 ['动物808纳米每周3次持续2周共6次照射4分钟','beagle2017-repeat'],
 ['人体1064纳米共2次照射8分钟','abm2016-left'],
];
const negative=[
 ['人体850纳米每周3次持续3周共9次','dyscalculia2025-active'],
 ['人体850纳米每周3次持续3周实际完成8次','dyscalculia2025-active'],
 ['动物每天1次持续7天照射2.5分钟','blivet2018-combined-2-5'],
 ['动物每天2次持续7天照射20分钟','blivet2018-combined-20'],
 ['人体1064纳米每周1次持续8周实际完成5次','tbi2022-completed-5'],
 ['人体1064纳米实际完成8次','tbi2022-planned'],
 ['人体1064纳米每天1次持续4周照射12分钟','hu2023-active'],
 ['人体1064纳米每天1次持续1周共7次','hu2023-active'],
 ['人体1070纳米每周3次持续4周','covid2023-body'],
 ['人体660纳米每周3次持续4周','covid2023-head'],
 ['人体810纳米每周2次共30次照射8分钟','aphasia2023-helmet'],
 ['人体850纳米每周2次共30次照射20分钟','aphasia2023-cluster'],
 ['人体870纳米每周3次持续6周39J/cm2照射39分钟','naeser2019-d'],
 ['动物810纳米每周3次持续3周4J/cm2照射0.166666666667分钟','depression2019-4'],
 ['动物904纳米每天1次持续21天','stroke2019-3'],
 ['人体每周3次持续12周','pd2021-a-clinic-1'],
 ['人体每周1次持续40周','pd2021-a-home'],
 ['人体每天1次持续4周实际完成28次','dementia2017-active'],
 ['人体每周6次持续12周实际完成72次','pd2023-posthoc-635'],
 ['动物1267纳米每天1次持续7天9J/cm2','ivh2023-newborn-rat'],
 ['动物660纳米每天1次持续5天','zcorzo2024-mixed-male-660'],
 ['动物808纳米每天1次持续4周','syn2015-pilot-5-phase1'],
 ['动物808纳米每天1次持续8天','syn2015-chronic-2-5'],
 ['动物675纳米共13次','lps2019-10-initial'],
 ['人体810纳米每周2次持续9周照射60分钟','rehab2019-active'],
 ['动物635纳米每天1次持续30天共30次','jnk2020-app-ps1'],
 ['动物635纳米每天1次持续30天','tbi2013-active-14'],
 ['假刺激组人体810纳米实际完成3次','insomnia2025-sham-completed'],
];
for(const[,id]of [...positive,...negative])assert(courses.arms.some(a=>a.id===id),'test references missing arm '+id);
assert.equal(new Set(positive.map(([,id])=>courses.arms.find(a=>a.id===id).paper_id)).size,57,'every course paper covered');
for(const[q,id]of positive){const r=retrieveEvidence(index,studies,q);assert(r.recognized,'parse: '+q);assert(r.groups.some(g=>g.group==='course:'+id),'missing '+id+': '+q);}
for(const[q,id]of negative)assert(!retrieveEvidence(index,studies,q).groups.some(g=>g.group==='course:'+id),'crossed '+id+': '+q);
for(const id of ['38702415','37284247','26082699','34092636','24024040'])assert(!courses.arms.some(a=>a.paper_id===id),'visits or peripheral route promoted to course');
assert(!courses.arms.some(a=>a.id==='blast2021-sham-injury'),'nonexistent normal+active cohort');
for(const id of ['tbi2022-completed-5','tbi2022-completed-6','tbi2022-completed-8']){
 const a=courses.arms.find(a=>a.id===id);assert(!a.entries.some(e=>e.field==='Sessions_Per_Week'),'planned rate inherited into variable actual schedule');
 const key=a.paper_id+':course:'+a.id;assert.equal(restoreParameterRows(index,[key])[0].key,key);
}
assert.equal(JSON.stringify(base),saved,'original manual data changed');
console.log(JSON.stringify({papersCovered:57,positiveQueries:positive.length,negativeArmChecks:negative.length,reviewedNonCourses:5,manualBasePreserved:true,actualRatesNotInvented:true}));
