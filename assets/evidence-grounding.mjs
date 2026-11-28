import {isPendingValue} from './parameter-scope.mjs';
export function makeEvidencePacket(cards,{maxStudies=3,maxChars=1400,fieldHints=[]}={}){
 const packet=[];let length=0;
 for(const study of cards.slice(0,maxStudies)){
  const hinted=[...new Set(fieldHints.filter(h=>h.study.id===study.id).map(h=>h.field))].map(key=>[key,study.fields[key]]);
  const candidates=[...hinted,['population',study.fields.population],['design',study.fields.design],...study.results.map((item,i)=>['result'+i,{...item,value:item.text,source:item.source}])];
  for(const [field,item]of candidates){
   if(!item?.value||isPendingValue(item)||!study.sources[item.source])continue;
   const source=study.sources[item.source],text=item.value;
   // Keep whole passages; do not cut units or sentences to fit a model context.
   if(length+text.length>maxChars)continue;
   packet.push({id:'E'+(packet.length+1),text,study:study.short,studyId:study.id,doi:study.doi,url:source.url,locator:source.label,field});length+=text.length;
  }
 }
 return packet;
}
export function validateEvidenceSelection(output,packet){
 if(!output||!Array.isArray(output.ids)||output.ids.length>Math.max(packet.length,4))throw Error('模型未返回可核对的证据编号。');
 const sources=new Map(packet.map(p=>[p.id,p]));const selected=[];
 for(const id of output.ids){if(typeof id!=='string'||!sources.has(id.toUpperCase()))throw Error('模型引用不在本次证据中，未显示该结果。');const item=sources.get(id.toUpperCase());if(!selected.includes(item))selected.push(item);}
 return selected.slice(0,4);
}
