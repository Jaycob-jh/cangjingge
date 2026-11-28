import assert from 'node:assert/strict';
import fs from 'node:fs';
import {composeCourseIndex} from '../../assets/tpbm-course.mjs';
import {retrieveEvidence} from '../../assets/tpbm-evidence.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const base=read('assets/tpbm-parameters.json'),courses=read('data/tpbm-course-arms.json'),index=composeCourseIndex(base,courses),studies=read('data/tpbm-studies.json');
const positive=[
 ['动物808.5纳米共2次照射2分钟','rabbit2012-exp1-double'],
 ['动物808纳米每天1次持续4周照射30分钟','depression2016-restraint'],
 ['动物810纳米共3次50mW/cm2照射12分钟','bdnf2016-3'],
 ['动物808纳米每天1次持续5天共5次','abeta2017-main'],
 ['动物810纳米共1次36J/cm2','pain2018-head-single'],
 ['动物808纳米每天1次持续7天照射2分钟','neonatalhi2018'],
 ['动物808纳米共4次8mW/cm2','gci2018-4'],
 ['人体823纳米每周2次持续8周共16次','elated2secondary-whole'],
 ['动物830纳米每周3次持续12周照射30分钟','strokeled2019-3'],
 ['动物808纳米共3次37mW/cm2照射2分钟','epc2019-delayed'],
 ['人体810纳米每周3次实际完成3次10Hz','dementia2022-week1'],
 ['动物830纳米每天1次持续2周照射12分钟','reserpine2023-active'],
 ['动物660纳米每天1次持续10天照射2.5分钟','aginginflammation2021'],
 ['动物810纳米每天1次持续58天照射2.5分钟','metabolomics2021-aged'],
 ['动物810纳米共3次25mW/cm2照射12分钟','xuan2014-3'],
 ['动物1050纳米每天1次持续10天','age2025-3m'],
 ['动物635纳米每天1次持续30天10mW/cm2 6J/cm2','jnk2020-app-ps1'],
 ['动物每天2次持续7天照射2.5分钟1000Hz','blivet2018-combined-2-5-abdomen']
 ,['动物830纳米每天1次持续2周照射2分钟15.28J/cm2','reserpine2023-active-point']
 ,['动物660纳米每天1次持续10天照射0.5分钟100J/cm2','aginginflammation2021-point']
 ,['动物670纳米每天2次持续3天照射5分钟15J/cm2','quirk2012-tbi-3']
 ,['动物810纳米每天1次持续58天照射2.5分钟','spatialaging2021-aged-whole']
 ,['动物810纳米每天1次持续28天共28次','spatialaging2021-young-pretreatment']
 ,['动物810纳米每天1次持续9天照射2.5分钟','spatialaging2021-young-behavior-washout']
 ,['人体870纳米每周3次持续6周共18次照射20分钟','naeser2014-whole']
 ,['人体633纳米实际完成18次照射20分钟','naeser2014-completed']
 ,['人体870纳米每周3次持续6周13J/cm2照射10分钟','naeser2014-set-b']
 ,['动物800纳米每天1次持续7天照射2分钟60J/cm2','khuman2012-repeated']
];
function matches(q,id){assert(courses.arms.some(a=>a.id===id),id);const r=retrieveEvidence(index,studies,q);assert(r.recognized,q);return r.groups.some(g=>g.group==='course:'+id);}
for(const [q,id] of positive)assert(matches(q,id),q+' → '+id);
for(const [q,id] of [
 ['动物808.5纳米共2次20mW/cm2','rabbit2012-exp1-double'],
 ['动物810纳米共3次50mW/cm2','xuan2014-3'],
 ['人体823纳米共16次照射30分钟','elated2secondary-whole'],
 ['人体823纳米共16次照射30分钟','elated2secondary-week6-option'],
 ['人体810纳米实际完成23次','dementia2022-whole'],
 ['动物830纳米每周3次实际完成36次','strokeled2019-3'],
 ['动物810纳米每天1次共7次','pain2018-head-single'],
 ['动物每天2次持续7天照射2.5分钟1000Hz','blivet2018-combined-2-5-head'],
 ['动物808纳米每天1次持续14天','epc2019-delayed']
 ,['动物830纳米每天1次持续2周照射12分钟15.28J/cm2','reserpine2023-active']
 ,['动物660纳米每天1次持续10天照射2.5分钟100J/cm2','aginginflammation2021']
 ,['动物670纳米每天2次持续10天','quirk2012-tbi-3']
 ,['人体870纳米每周3次持续6周13J/cm2照射20分钟','naeser2014-whole']
 ,['人体700纳米实际完成18次照射20分钟','naeser2014-completed']
 ,['动物810纳米持续58天实际完成58次','spatialaging2021-aged-whole']
 ,['动物800纳米每天1次持续7天105J/cm2','khuman2012-repeated']
])assert(!matches(q,id),'Cross-arm/phase/attendance borrowing: '+q+' → '+id);
const bad=structuredClone(courses);delete bad.documents['34291201'];assert.throws(()=>composeCourseIndex(base,bad),/身份核验/);
const wrong=structuredClone(courses);wrong.arms.find(a=>a.id==='epc2019-delayed').paper_id='111';assert.throws(()=>composeCourseIndex(base,wrong),/身份核验/);
const original=read('assets/tpbm-parameters.json');assert.deepEqual(base,original);
console.log(`Final course review: ${positive.length} real-paper queries, 16 anti-borrowing cases and PMID/PMC identity guards passed.`);
