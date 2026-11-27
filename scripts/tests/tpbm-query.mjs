import assert from 'node:assert/strict';
import {common, targetMatches, range} from '../../assets/tpbm-query.mjs';
const cases = [
 ['健康成人右侧背外侧前额叶，0.25 W，照射300秒', {subject:'Human',health:'Healthy',target:'右侧背外侧前额叶',power:'250',duration:'5'}],
 ['850纳米左侧前额叶，0.05 W/cm²，60秒', {wave:'850',target:'左侧前额叶',irradiance:'50',duration:'1'}],
 ['右侧前额叶 1平方厘米 40赫兹', {target:'右侧前额叶',spot:'1',frequency:'40'}],
 ['800至850纳米 0.1–0.2 W 120到300秒 50%占空比', {wave:'800至850',power:'100–200',duration:'2–5',duty:'50'}],
 ['人脑 right DLPFC 1064 nm', {subject:'Human',target:'right DLPFC',wave:'1064'}],
 ['小鼠 810纳米 不要求有假刺激', {subject:'Animal',wave:'810'}],
 ['核查 DOI:10.1038/S41598-019-42693-X', {paper:'10.1038/s41598-019-42693-x'}],
 ['PMID 28186867', {paper:'28186867'}],
];
for (const [query, expected] of cases) assert.deepEqual(common(query), expected,query);
for (const [value,query,expected] of [
 ['right dorsolateral prefrontal cortex','右侧背外侧前额叶',true],
 ['right DLPFC','右侧背外侧前额叶',true],
 ['right dorsolateral PFC','right DLPFC',true],
 ['left dorsolateral prefrontal cortex','右侧背外侧前额叶',false],
 ['bilateral dorsolateral prefrontal cortex','右侧背外侧前额叶',false],
 ['right prefrontal cortex','右侧背外侧前额叶',false],
 ['left motor cortex and right prefrontal cortex','右侧前额叶',false],
 ['right prefrontal cortex','右侧前额叶',true],
]) assert.equal(targetMatches(value,query),expected,JSON.stringify({value,query}));
assert.deepEqual(range('8–10'),[8,10]);
assert.equal(range('10-8'),null);
console.log(JSON.stringify({queries:cases.length,targetCases:8,rangeCases:2,passed:true}));
