import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {common} from '../../assets/tpbm-query.mjs';
import {composeCourseIndex} from '../../assets/tpbm-course.mjs';
import {retrieveEvidence,restoreParameterRows} from '../../assets/tpbm-evidence.mjs';
const read=f=>JSON.parse(readFileSync(new URL('../../'+f,import.meta.url),'utf8'));
const base=read('assets/tpbm-parameters.json'),before=JSON.stringify(base),courses=read('assets/tpbm-course-arms.json');
const index=composeCourseIndex(base,courses),studies=read('data/tpbm-studies.json');
const positive=[
 ['人体808纳米每周两次持续三周共六次剂量84J/cm2','cassano2015-active'],
 ['823纳米每周2次持续8周总16次','elated2-active-plan'],
 ['823纳米每周2次持续8周剂量40到60J/cm2','elated2-active-plan'],
 ['810纳米每周2次持续2周24.6J/cm2','salt2017-tc-phase1'],
 ['810纳米每周1次持续10周24.6J/cm2','salt2017-tc-phase2'],
 ['810纳米每周1到2次持续12周24.6J/cm2','salt2017-tc-whole'],
 ['1060到1080纳米每天2次持续8周','nizam2021-active'],
 ['1064纳米每周7次持续1周总7次','qu2022-active'],
 ['实际完成16次','elated2-active-completed-01'],
 ['假刺激组每周2次持续3周共6次','cassano2015-sham'],
];
for(const[q,id]of positive){const r=retrieveEvidence(index,studies,q);assert(r.recognized,q);assert(r.groups.some(g=>g.group==='course:'+id),q);}
const negative=[
 '823纳米每周2次持续8周剂量60J/cm2', // Escalating doses are not eight constant weeks at 60.
 '810纳米每周2次持续12周24.6J/cm2', // First two weeks cannot supply whole-course frequency.
 '810纳米每周2次持续2周10.65J/cm2', // Cranial schedule cannot borrow intranasal dose.
 '每周2次持续8周实际完成16次', // A protocol schedule cannot supply a case's actual attendance.
 '假刺激组每周2次持续8周823纳米', // No emitted wavelength in an inactive sham arm.
 '1064纳米持续3周', // Follow-up is not the seven-day intervention.
 '1060到1080纳米每周14次持续8周总112次', // No multiplication into reported attendance.
 '1064纳米每周7次持续1周180J/cm2', // Unreported dose is not inferred from time and intensity.
];
for(const q of negative){const r=retrieveEvidence(index,studies,q);assert.equal(r.groups.length,0,q);assert.equal(r.documentCandidates.length,0,q);}
const parsing=[
 ['每周至少两次，持续至少三周',{perWeek:'>=2',courseWeeks:'>=3'}],
 ['每天一次持续十四天',{perDay:'1',courseWeeks:'2'}],
 ['每周2次持续8周',{perWeek:'2',courseWeeks:'8'}],
 ['每周2次持续8周总16次',{perWeek:'2',courseWeeks:'8',sessions:'16'}],
 ['方案总次数16次',{sessions:'16',countBasis:'Planned'}],
];
for(const[q,f]of parsing)assert.deepEqual(common(q),f,q);
for(const q of ['每周2次和每周3次','每周2次或3次','随访3周','持续2周和持续12周'])assert(!retrieveEvidence(index,studies,q).recognized,q);
assert.equal(JSON.stringify(base),before,'composition must preserve original manual records');
const manual=structuredClone(base);manual.fields.Course_Weeks='Hai的标签';
assert.equal(composeCourseIndex(manual,courses).fields.Course_Weeks,'Hai的标签');
assert.throws(()=>composeCourseIndex(index,courses),/已有人工记录/);
const row=retrieveEvidence(index,studies,positive[0][0]).groups.find(g=>g.group==='course:cassano2015-active');
const selectedKey=row.paper.id+':'+row.group;
assert.equal(restoreParameterRows(index,[selectedKey])[0].key,selectedKey,'course selection survives restoration');
for(const arm of courses.arms)for(const entry of arm.entries){assert.equal(entry.course_plan_id,arm.id);assert(entry.where&&entry.source_url.startsWith('https://'));}
console.log(JSON.stringify({papers:new Set(courses.arms.map(a=>a.doi)).size,armPhaseRecords:courses.arms.length,positive:positive.length,negative:negative.length,parsing:parsing.length,ambiguous:4,preservedManualRecords:true}));
