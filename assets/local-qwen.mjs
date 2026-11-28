const modelId='Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
let loading;
export async function loadLocalQwen(report=()=>{}){
 if(!navigator.gpu)throw Error('当前浏览器不支持 WebGPU，仍可直接查证据。');
 if(!loading){
  void navigator.storage?.persist?.().catch(()=>{});
  loading=(async()=>{
   const {CreateMLCEngine,hasModelInCache}=await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm');
   let cached;try{cached=await hasModelInCache(modelId);}catch{}
   report(cached?'已找到本地权重，正在初始化 Qwen……':'正在检查并加载 Qwen 权重，可继续检索……');
   return CreateMLCEngine(modelId,{initProgressCallback:r=>{
    const progress=r.progress>0?' '+Math.round(r.progress*100)+'%':'';
    if(r.text?.startsWith('Loading model from cache'))cached=true;
    if(r.text?.startsWith('Fetching param cache'))cached=false;
    report(r.text?.startsWith('Fetching param cache')?'正在下载缺少的权重'+progress+'，可继续检索。':cached?'正在读取本地权重并初始化 Qwen'+progress+'……':'正在初始化 Qwen'+progress+'……');
   }});
  })().catch(e=>{loading=undefined;throw e;});
 }
 return loading;
}
