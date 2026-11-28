// One explicitly enabled, local browser snapshot. No PDF binaries or network calls.
export const draftStorageKey='cangjingge.reading-draft.v1';
export function createDraftStore(storage,validate){
  function load(){
    const token=storage.getItem(draftStorageKey);
    if(token===null)return {token:null,draft:null,savedAt:null};
    let envelope;
    try{envelope=JSON.parse(token);}catch{throw Error('本机副本无法读取；当前编辑未更改。可导入备份 JSON。');}
    if(envelope?.version!==1||typeof envelope.savedAt!=='string'||!Number.isFinite(Date.parse(envelope.savedAt)))throw Error('本机副本格式不支持；当前编辑未更改。');
    return {token,draft:validate(envelope.draft),savedAt:envelope.savedAt};
  }
  function save(draft,expected){
    if(storage.getItem(draftStorageKey)!==expected)throw Error('本机副本已在其他页面更改，已停止自动保存；当前编辑仍在。请先下载 JSON，再恢复或处理本机副本。');
    const envelope={version:1,savedAt:new Date().toISOString(),draft:validate(draft)};
    const token=JSON.stringify(envelope);
    storage.setItem(draftStorageKey,token);
    return {token,draft:envelope.draft,savedAt:envelope.savedAt};
  }
  function remove(expected){
    if(storage.getItem(draftStorageKey)!==expected)throw Error('本机副本已更改，未删除。请重新查看。');
    storage.removeItem(draftStorageKey);
  }
  return {load,save,remove,token:()=>storage.getItem(draftStorageKey)};
}
