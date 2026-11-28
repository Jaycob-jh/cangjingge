import {common, range, targetMatches, categoryMatches, numericMatches, queryWarnings} from './tpbm-query.mjs';
const $ = id => document.getElementById(id);
const node = (tag, text) => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  return element;
};
const link = (text, href) => {
  const element = node('a', text);
  element.href = href;
  return element;
};
const selectors = {
  subject: ['对象', 'Subject_Type', {'Human':'人体','Animal':'动物','Cell':'细胞','Cadaver':'尸体组织','Ex_Vivo':'离体','Simulation':'仿真'}],
  health: ['健康状态', 'Health_Status', {'Healthy':'健康','Disease':'疾病','Mixed':'混合'}],
  mode: ['光模式', 'Light_Mode', {'CW':'连续光','PW':'脉冲光'}],
  control: ['对照', 'Control_Type', {'Sham':'假刺激','Active_Control':'主动对照','Heat_Control':'热对照','No_Treatment':'无处理','None':'无对照','Other':'其他对照'}],
  temperature: ['测温', 'Temperature_Measured', {'Yes':'记录测温'}],
};
const numeric = {
  wave:['波长 · nm','Wavelength_nm'], power:['功率 · mW','Power_mW'], irradiance:['辐照度 · mW/cm²','Irradiance_mW_cm2'],
  dose:['能量密度 · J/cm²','Fluence_J_cm2'], duration:['时间 · 分钟','Duration_min'], frequency:['脉冲频率 · Hz','Pulse_Frequency_Hz'],
  duty:['占空比 · %','Duty_Cycle_pct'], spot:['光斑 · cm²','Spot_Area_cm2'], sessions:['次数','Total_Sessions'],
};
const form = $('parameter-filters');
const coreFields = new Set(['subject', 'health', 'target', 'paper', 'wave']);
const primaryGrid = node('div');
primaryGrid.className = 'parameter-filter-grid';
const advanced = node('details');
advanced.id = 'parameter-advanced';
advanced.open = matchMedia('(min-width: 768px)').matches;
const advancedSummary = node('summary', '更多条件：光模式、对照、剂量与疗程');
const advancedGrid = node('div');
advancedGrid.className = 'parameter-filter-grid';
advanced.append(advancedSummary, advancedGrid);
const activeFilters = node('div');
activeFilters.className = 'parameter-active-filters';
activeFilters.setAttribute('aria-label', '已选条件');
form.append(primaryGrid, advanced, activeFilters);
const inputs = {};
function addField(key, label, field) {
  const wrap = node('label', label);
  field.name = key;
  wrap.append(field);
  wrap.dataset.filter = key;
  (coreFields.has(key) ? primaryGrid : advancedGrid).append(wrap);
  inputs[key] = field;
}
for (const [key, [label,, choices]] of Object.entries(selectors)) {
  const select = node('select');
  select.add(new Option('不限', ''));
  for (const [value, title] of Object.entries(choices)) select.add(new Option(title, value));
  addField(key, label, select);
}
for (const [key,label] of [['target','靶点'],['paper','题名 / DOI / PMID'], ...Object.entries(numeric).map(([key,[label]]) => [key,label])]) {
  const field = node('input');
  field.maxLength = 160;
  if (key in numeric) field.placeholder = '如 8–10、>=10、<=20';
  addField(key, label, field);
}
const reset = node('button', '清空筛选');
reset.type = 'reset';
const filterActions = node('div');
filterActions.className = 'parameter-actions';
const showResults = node('button', '查看结果 ↓');
showResults.type = 'button';
showResults.onclick = () => {
  $('parameter-status').tabIndex = -1;
  $('parameter-status').focus({preventScroll:true});
  $('parameter-status').scrollIntoView({block:'start'});
};
filterActions.append(showResults,reset);
form.append(filterActions);
function normalize(filters) {
  const clean = {};
  for (const [key, input] of Object.entries(inputs)) {
    const supplied = filters[key];
    const value = key in numeric && typeof supplied === 'number' ? String(supplied) : supplied;
    if (typeof value !== 'string' || !value.trim() || value.length > input.maxLength && input.maxLength > 0) continue;
    if (key in selectors && !Object.hasOwn(selectors[key][2], value)) continue;
    if (key in numeric && !range(value)) continue;
    clean[key] = key === 'paper' ? value.trim().replace(/^(?:doi\s*:\s*|https?:\/\/(?:dx\.)?doi\.org\/)/i, '').toLowerCase() : value.trim();
  }
  return clean;
}
function groundModel(question, proposed) {
  const explicit = common(question);
  // Parameter and comparison filters require a corresponding phrase or unit in the query.
  // The model can locate a more specific free-text target without inventing a term.
  const target = proposed.target;
  if (typeof target === 'string' && target.trim().length >= 2 && target.length <= 48) {
    const term = target.trim().replace(/^(?:离体|在体)\s*/, '');
    if (/(?:脑|皮层|叶|回|核|丘|沟|海马|颅|头皮|cortex|hippocampus|prefrontal|precuneus|scalp|skull|^M1$|^F[34]$)/i.test(term) && question.toLowerCase().includes(term.toLowerCase()) &&
        (!explicit.target || term.includes(explicit.target))) explicit.target = term;
  }
  const paper = proposed.paper;
  if (typeof paper === 'string' && /^(?:10\.\d{4,9}\/\S+|\d{7,9})$/i.test(paper) &&
      question.toLowerCase().includes(paper.toLowerCase())) explicit.paper = paper;
  return explicit;
}
const modelId = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
let data, modelLoading;
async function loadModel(button) {
  // Keep the existing WebLLM cache backend so earlier downloads remain reusable.
  const {CreateMLCEngine, hasModelInCache} = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm');
  let cached;
  try { cached = await hasModelInCache(modelId); } catch { /* Loader can still try. */ }
  if (button.disabled) status.textContent = cached
    ? '已找到本地权重，正在初始化 Qwen……'
    : '正在检查并加载 Qwen 权重，可继续手动筛选……';
  return CreateMLCEngine(modelId, {
    initProgressCallback: report => {
      if (!button.disabled) return;
      const progress = report.progress > 0 ? ' ' + Math.round(report.progress * 100) + '%' : '';
      const fromCache = report.text?.startsWith('Loading model from cache');
      const fetching = report.text?.startsWith('Fetching param cache');
      if (fromCache) cached = true;
      if (fetching) cached = false;
      status.textContent = fetching ? '正在下载缺少的权重' + progress + '，可继续手动筛选。'
        : cached ? '正在读取本地权重并初始化 Qwen' + progress + '……'
        : '正在初始化 Qwen' + progress + '……';
    },
  });
}
async function withTimeout(work, milliseconds) {
  let timer;
  try {
    return await Promise.race([work, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error('Model timed out')), milliseconds);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
const selected = new Map();
let offset = 20, pendingOffset = 15, filterRevision = 0;
const status = $('parameter-model-status');
function apply(filters) {
  const valid = normalize(filters);
  if (!Object.keys(valid).length) return false;
  for (const [key,input] of Object.entries(inputs)) input.value = valid[key] || '';
  refresh();
  return true;
}
$('parameter-query').addEventListener('submit', event => {
  event.preventDefault();
  status.textContent = apply(common($('parameter-prompt').value))
    ? '已填入可识别条件，请核对或补充。' : '未识别到支持的条件，可直接修改筛选。';
  status.textContent += ' ' + queryWarnings($('parameter-prompt').value).join(' ');
});
$('parameter-ai').onclick = async event => {
  const question = $('parameter-prompt').value.trim();
  if (!question) { status.textContent = '请先输入问题。'; return; }
  const button = event.currentTarget;
  const revision = filterRevision;
  const changed = () => revision !== filterRevision || question !== $('parameter-prompt').value.trim();
  button.disabled = true;
  try {
    if (!navigator.gpu) throw Error('WebGPU unavailable');
    if (!modelLoading) {
      status.textContent = '正在准备 Qwen2.5 1.5B……';
      // Ask only on a user action. The browser can decline and still use its normal cache.
      void navigator.storage?.persist?.().catch(() => {});
      modelLoading = loadModel(button)
        .catch(error => { modelLoading = undefined; throw error; });
    }
    const engine = await withTimeout(modelLoading, 900000);
    status.textContent = '正在解析筛选条件……';
    const result = await withTimeout(engine.chat.completions.create({
      messages: [
        {role:'system', content:'你是文献查询字段提取器。只输出 JSON 对象。优先提取照射靶点 target，逐字摘取用户写出的最具体脑区名，不含动词或其他条件。若有明确 DOI 或 PMID，可写 paper。没有给出的键不输出。不要推测实验条件。'},
        {role:'user', content:'想看额中回接受 850 纳米的研究。'},
        {role:'assistant', content:'{"target":"额中回"}'},
        {role:'user', content:'我要核对 PMID 28186867，不要求有假刺激。'},
        {role:'assistant', content:'{"paper":"28186867"}'},
        {role:'user',content:question},
      ],
      temperature:0, max_tokens:250, response_format:{type:'json_object'},
    }), 45000);
    const filters = JSON.parse(result.choices[0].message.content);
    if (changed()) { status.textContent = '筛选已编辑，本次模型结果未应用。'; return; }
    if (!filters || Array.isArray(filters) || typeof filters !== 'object' || !apply(groundModel(question, filters))) throw Error('No valid filters');
    status.textContent = 'Qwen 已填入条件，请检查是否漏掉限定词。' + queryWarnings(question).join(' ');
  } catch (error) {
    if (changed()) { status.textContent = '已保留当前筛选。'; return; }
    const applied = apply(common(question));
    status.textContent = applied ? '本次未能使用 Qwen，已用常见条件解析，可手动修正。' : '本次未能使用 Qwen，请手动填写筛选。';
  } finally { button.disabled = false; }
};
function entriesFor(paper, group, entries, pending) {
  return {paper,group,entries,pending,key:paper.id + ':' + group};
}
function match(row, filters) {
  for (const [key,value] of Object.entries(filters)) {
    if (key === 'paper') {
      if (![row.paper.title,row.paper.id,row.paper.doi,row.paper.author].join(' ').toLowerCase().includes(value.toLowerCase())) return false;
      continue;
    }
    const field = selectors[key]?.[1] || numeric[key]?.[1] || 'Target';
    const pool = row.entries.filter(item => item.field === field);
    if (!pool.some(item => {
      if (key in numeric) {
        return numericMatches(item.value, value);
      }
      if (key === 'target') return targetMatches(item.value,value);
      return categoryMatches(field,item.value,value);
    })) return false;
  }
  return true;
}
const origin = paper => paper.doi ? 'https://doi.org/' + encodeURI(paper.doi) : 'https://pubmed.ncbi.nlm.nih.gov/' + paper.id + '/';
function rowTitle(row) { return row.paper.group_labels?.[row.group] || row.group || '文献层记录 · 组别未拆分'; }
function evidence(row) {
  const list = node('ul');
  for (const item of row.entries) {
    const li = node('li', data.fields[item.field] + '：' + item.value + ' · ');
    const kind = {Direct:'直接记录',Calculated:'计算值',Converted:'换算值'}[item.kind];
    if (kind) li.append(kind + ' · ');
    if (item.source_review_required) li.append('待原文核对 · ');
    const source = /^PMC\d+$/.test(item.source_pmc || '')
      ? 'https://pmc.ncbi.nlm.nih.gov/articles/' + item.source_pmc + '/'
      : /^\d+$/.test(item.source_pmid || '')
        ? 'https://pubmed.ncbi.nlm.nih.gov/' + item.source_pmid + '/' : origin(row.paper);
    li.append(link(item.where || '原刊', source));
    if (item.source_note) li.append(' · ' + item.source_note);
    list.append(li);
  }
  return list;
}
function renderPicked() {
  const tray = $('parameter-picked');
  tray.replaceChildren();
  if (!selected.size) return;
  tray.append(node('h2','已选记录 · ' + selected.size + ' / 5'));
  const grid = node('div');
  grid.className = 'parameter-results-grid';
  for (const row of selected.values()) {
    const card = node('article');
    const remove = node('button','移除');
    remove.onclick = () => { selected.delete(row.key); render(); };
    card.append(node('h3',rowTitle(row)),link(row.paper.title,origin(row.paper)),evidence(row),remove);
    grid.append(card);
  }
  tray.append(grid);
  const ids = [...new Set([...selected.values()].map(row => row.paper.card).filter(Boolean))];
  if (ids.length) tray.append(link('在研究对比台查看 ' + ids.length + ' 篇全文卡', 'tpbm-compare.html?selected=' + encodeURIComponent(ids.join(','))));
}
function renderList(target, rows, limit, more, allowCompare) {
  target.replaceChildren();
  const grid = node('div');
  grid.className = 'parameter-results-grid';
  for (const row of rows.slice(0,limit)) {
    const article = node('article');
    article.append(node('h3',rowTitle(row)), link(row.paper.title,origin(row.paper)),
      node('p',[row.paper.author,row.paper.year,'PMID ' + row.paper.id].filter(Boolean).join(' · ')));
    const details = node('details');
    details.append(node('summary','查看 ' + row.entries.length + ' 条参数与出处'),evidence(row));
    article.append(details);
    if (allowCompare) {
      const button = node('button', selected.has(row.key) ? '已加入对比' : '加入对比');
      button.disabled = selected.has(row.key) || selected.size >= 5;
      button.onclick = () => { selected.set(row.key,row); render(); $('parameter-picked').scrollIntoView({block:'nearest'}); };
      article.append(button);
      if (row.paper.card) article.append(' · ', link('已整理全文卡', '../library/tpbm/' + row.paper.card + '.html'));
    }
    grid.append(article);
  }
  if (rows.length > limit) {
    const button = node('button','再显示 ' + Math.min(20,rows.length-limit) + ' 条');
    button.onclick = more;
    target.append(grid,button);
  } else target.append(grid);
}
function render() {
  if (!data) return;
  const raw = Object.fromEntries(Object.entries(inputs).map(([key,input]) => [key,input.value.trim()]));
  const filters = normalize(raw);
  const invalid = Object.keys(numeric).filter(key => raw[key] && !filters[key]);
  activeFilters.replaceChildren();
  const extraCount = Object.keys(raw).filter(key => raw[key] && !coreFields.has(key)).length;
  advancedSummary.textContent = '更多条件：光模式、对照、剂量与疗程' + (extraCount ? ' · 已选 ' + extraCount + ' 项' : '');
  for (const [key,value] of Object.entries(raw).filter(([,v]) => v)) {
    const label = selectors[key]?.[0] || numeric[key]?.[0] || (key === 'target' ? '靶点' : '题名 / DOI / PMID');
    const chip = node('button', label + '：' + value + (invalid.includes(key) ? '（检查格式）' : '') + ' ×');
    chip.type = 'button';
    chip.setAttribute('aria-label', '移除' + label + '：' + value);
    chip.onclick = () => { inputs[key].value = ''; refresh(); (activeFilters.querySelector('button') || showResults).focus(); };
    activeFilters.append(chip);
  }
  if (invalid.length) advanced.open = true;
  const rows = [], pending = [], candidates = [];
  if (!invalid.length) for (const paper of data.papers) for (const [group,entries] of Object.entries(paper.groups)) {
    const verified = entries.filter(item=>!item.pending && !item.source_review_required);
    const confirmed = entriesFor(paper,group,verified,false);
    if (verified.length) candidates.push(confirmed);
    if (verified.length && match(confirmed,filters)) rows.push(confirmed);
    const unverified = entries.filter(item=>item.pending || item.source_review_required);
    if (unverified.length) candidates.push(entriesFor(paper,group,entries,true));
    if (unverified.length && match(entriesFor(paper,group,entries,true),filters)) pending.push(entriesFor(paper,group,unverified,true));
  }
  rows.sort((a,b) => Number(Boolean(b.group))-Number(Boolean(a.group)) || Number(Boolean(b.paper.card))-Number(Boolean(a.paper.card)));
  $('parameter-status').textContent = invalid.length
    ? '请修正数值范围：' + invalid.map(key=>numeric[key][0]).join('、')
    : data.papers.length + ' 篇索引 · ' + rows.length + ' 条匹配（按首轮核查标记） · ' + pending.length + ' 条含待核证据';
  renderPicked();
  const results = $('parameter-results');
  renderList(results, rows, offset, () => {offset+=20;render();},true);
  if (!invalid.length && !rows.length) {
    results.prepend(node('p', pending.length
      ? '当前条件只找到含待核证据的记录，见下方。'
      : '当前条件没有匹配。可减少条件，或试用更宽的靶点词。'));
    if (pending.length) $('parameter-pending').open = true;
    if (!pending.length && Object.keys(filters).length) {
      const suggestions = node('div');
      suggestions.className = 'parameter-relax';
      for (const key of Object.keys(filters)) {
        const remaining = {...filters};
        delete remaining[key];
        const count = candidates.filter(row => match(row,remaining)).length;
        if (!count) continue;
        const label = selectors[key]?.[0] || numeric[key]?.[0] || (key === 'target' ? '靶点' : '题名 / DOI / PMID');
        const button = node('button', '去掉“' + label + '：' + filters[key] + '”后可查 ' + count + ' 条记录');
        button.type = 'button';
        button.onclick = () => { inputs[key].value = ''; refresh(); };
        suggestions.append(button);
      }
      if (suggestions.childElementCount) {
        suggestions.prepend(node('p','可选择放宽一项条件（包含待核记录）：'));
        results.append(suggestions);
      }
    }
  }
  const section = $('parameter-pending');
  section.querySelector('summary').textContent = '待核证据 · ' + pending.length + ' 条';
  renderList(section.querySelector('div'),pending,pendingOffset,()=>{pendingOffset+=20;render();},false);
}
function refresh() {
  filterRevision++; offset=20; pendingOffset=15;
  const url=new URL(location.href);url.searchParams.set('filters','1');
  for(const [key,input]of Object.entries(inputs)){url.searchParams.delete(key);url.searchParams.delete('f_'+key);if(input.value.trim())url.searchParams.set('f_'+key,input.value.trim());}
  history.replaceState(null,'',url);render();
}
form.addEventListener('input', refresh);
form.addEventListener('reset', () => setTimeout(refresh,0));
form.addEventListener('submit', event => event.preventDefault());
try {
  const response = await fetch('../assets/tpbm-parameters.json');
  if (!response.ok) throw Error('Index unavailable');
  data = await response.json();
  const incoming = new URL(location.href).searchParams.get('query');
  const url=new URL(location.href);
  if (incoming) $('parameter-prompt').value = incoming.slice(0,400);
  if (url.searchParams.get('filters')==='1') {
    const saved=normalize(Object.fromEntries(Object.keys(inputs).map(key=>[key,url.searchParams.get('f_'+key)||''])));
    for(const [key,value]of Object.entries(saved))inputs[key].value=value;
  } else if (incoming) apply(common(incoming));
  render();
} catch {
  $('parameter-status').textContent = '参数索引加载失败，请刷新页面。';
}
