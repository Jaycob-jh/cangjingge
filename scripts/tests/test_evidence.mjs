import {queryWarnings} from '../../assets/tpbm-query.mjs';
// Offline regressions for retrieval logic; these synthetic records are not scientific evidence.
import assert from 'node:assert/strict';
import {retrieveEvidence,parseEvidenceQuestion} from '../../assets/tpbm-evidence.mjs';
import {makeEvidencePacket,validateEvidenceSelection} from '../../assets/evidence-grounding.mjs';
const source={label:'test locator',url:'https://example.org/figure-1'};
const study={id:'fixture',short:'Fixture',doi:'10.9999/fixture',year:2020,title:'Light attenuates memory deficits',title_zh:'记忆测试',kind:'测试数据',reading:'测试',measures:['fNIRS'],sources:{s:source},fields:{population:{value:'测试对象',source:'s'},design:{value:'测试设计',source:'s'},mode:{value:'40 Hz 脉冲光与连续光',source:'s'},wavelength:{value:'810 nm',source:'s'},readout:{value:'fNIRS',source:'s'}},results:[{text:'测试结果只用于回归',source:'s'}],interpretation:'讨论里提到 EEG，不表示实际测量。'};
const index={papers:[{id:'test',doi:study.doi,title:study.title,groups:{a:[{field:'Wavelength_nm',value:'810'},{field:'Duration_min',value:'8'},{field:'Light_Mode',value:'PW'},{field:'Pulse_Frequency_Hz',value:'40'}],b:[{field:'Wavelength_nm',value:'1064'},{field:'Duration_min',value:'10'},{field:'Light_Mode',value:'CW'}]}}]};
assert.equal(retrieveEvidence(index,{studies:[study]},'EEG').cards.length,0,'discussion mention cannot stand in for a measurement');
assert.equal(retrieveEvidence(index,{studies:[study]},'光穿透').cards.length,0,'attenuates symptoms is not optical attenuation');
assert.equal(retrieveEvidence(index,{studies:[study]},'810nm 10分钟').groups.length,0,'cannot join groups to satisfy filters');
const pairs=retrieveEvidence(index,{studies:[study]},'810和1064nm');assert.equal(pairs.groups.length,2);assert.deepEqual(pairs.variants,[{wave:'810'},{wave:'1064'}]);
const modes=retrieveEvidence(index,{studies:[study]},'40Hz脉冲光和连续光');assert.equal(modes.groups.length,2);assert(!('frequency'in modes.variants.find(v=>v.mode==='CW')));
assert.equal(retrieveEvidence(index,{studies:[study]},'至少10Hz和40Hz').recognized,false);
assert.equal(retrieveEvidence(index,{studies:[study]},'40Hz黄光治愈癌症').cards.length,0);
const packet=makeEvidencePacket([study]);assert.throws(()=>validateEvidenceSelection({ids:['E999']},packet));assert.equal(validateEvidenceSelection({ids:['E1','E1']},packet).length,1);assert.equal(validateEvidenceSelection({ids:[]},packet).length,0);assert(packet.every(e=>e.url===source.url));
console.log(JSON.stringify({retrievalRegressionCases:7,sourceBinding:true,unknownReferenceRejected:true,duplicateReferenceRemoved:true}));

assert.equal(queryWarnings('不要求有假刺激').length,0);assert(queryWarnings('不要连续光').length>0);
