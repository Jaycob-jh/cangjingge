const targetNames = {'前额叶':'prefrontal','运动皮层':'motor cortex','顶叶':'parietal','枕叶':'occipital','海马':'hippocamp','头皮':'scalp'};
const targetAliases = {...targetNames, '中央后回':'postcentral', '楔前叶':'precuneus', '背外侧前额叶':'dorsolateral prefrontal', '颅骨':'skull'};
const sideTerms = {
  right: /右(?:侧|半球)?|\b(?:right|rt\.?)\b/i,
  left: /左(?:侧|半球)?|\b(?:left|lt\.?)\b/i,
  bilateral: /双侧|两侧|\bbilateral(?:ly)?\b|\bboth sides\b/i,
};
function targetSide(text) {
  if (sideTerms.bilateral.test(text) || (sideTerms.left.test(text) && sideTerms.right.test(text))) return 'bilateral';
  if (sideTerms.right.test(text)) return 'right';
  if (sideTerms.left.test(text)) return 'left';
  return '';
}
function targetMatches(value, query) {
  const side = targetSide(query);
  const region = query.toLowerCase().replace(/^(?:右侧?|左侧?|双侧|两侧|right\b|left\b|bilateral\b)\s*/u, '');
  const synonyms = [region, targetAliases[region]];
  if (/^(?:dlpfc|dorsolateral prefrontal(?: cortex)?|背外侧前额叶)$/i.test(region)) synonyms.push('dlpfc', 'dorsolateral prefrontal', 'dorsolateral pfc');
  if (region === '前额叶' || region === 'prefrontal') synonyms.push('dlpfc');
  if (region === '背外侧前额叶') synonyms.push('dlpfc');
  const text = value.toLowerCase();
  if (text.includes(query.toLowerCase()) && (!side || targetSide(text) === side)) return true;
  if (!side) return synonyms.some(term => term && text.includes(term));
  // Bind the side to the same target phrase and exclude combined or alternative laterality.
  if (targetSide(text) !== side) return false;
  return text.split(/[,;，；、]|\b(?:and|or)\b/).some(part =>
    targetSide(part) === side && synonyms.some(term => term && part.includes(term)));
}
function range(value) {
  const bound = value.trim().normalize('NFKC').match(/^(>=|<=|>|<|≥|≤)\s*(\d+(?:\.\d+)?)$/);
  if (bound) {
    const n = Number(bound[2]);
    // Open bounds keep their exact operator; matching is handled by numericMatches.
    return bound[1].includes('>') || bound[1] === '≥' ? [n,Infinity] : [0,n];
  }
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(?:[-–—~～至到]\s*(\d+(?:\.\d+)?))?$/);
  if (!match) return null;
  const min = Number(match[1]), max = Number(match[2] ?? match[1]);
  return Number.isFinite(max) && min <= max ? [min,max] : null;
}
function common(text) {
  text = text.normalize('NFKC').replace(/平方厘米/g, 'cm2').replace(/毫瓦/g, 'mW').replace(/焦耳/g, 'J');
  // Convert an entire reported range, not only its upper endpoint.
  const convert = (value, scale) => value.split(/\s*[-–—~～至到]\s*/).map(n => String(Number((Number(n)*scale).toPrecision(12)))).join('–');
  text = text.replace(/(\d+(?:\.\d+)?(?:\s*[-–—~～至到]\s*\d+(?:\.\d+)?)?)\s*W(?![a-z])/g, (_,n) => convert(n,1000)+'mW')
    .replace(/(\d+(?:\.\d+)?(?:\s*[-–—~～至到]\s*\d+(?:\.\d+)?)?)\s*(?:秒|seconds?\b|s\b)/gi, (_,n) => convert(n,1/60)+'分钟');
  const out = {};
  for (const [key, unit] of Object.entries({wave:'nm|纳米',power:'mw(?!\\s*/)',irradiance:'mw\\s*/\\s*cm[²2]',dose:'j\\s*/\\s*cm[²2]',duration:'分钟|min',frequency:'hz|赫兹',duty:'%',spot:'cm[²2]',sessions:'次'})) {
    const m = text.match(new RegExp('(\\d+(?:\\.\\d+)?(?:\\s*[-–—~～至到]\\s*\\d+(?:\\.\\d+)?)?)\\s*(?:' + unit + ')','i'));
    if (m && !(key === 'spot' && /\/\s*$/.test(text.slice(0,m.index)))) out[key] = m[1];
  }
  const number = '(\\d+(?:\\.\\d+)?(?:\\s*[-–—~～至到]\\s*\\d+(?:\\.\\d+)?)?)';
  for (const [key, unit, scale] of [
    ['power', 'W(?!\\s*/)', 1000],
    ['irradiance', 'W\\s*/\\s*cm2', 1000],
    ['duration', '秒|seconds?\\b|s\\b', 1 / 60],
  ]) {
    if (out[key]) continue;
    const found = text.match(new RegExp(number + '\\s*(?:' + unit + ')', 'i'));
    if (found) out[key] = found[1].split(/\s*[-–—~～至到]\s*/).map(v => String(Number((Number(v) * scale).toPrecision(12)))).join('–');
  }
  // Associate a comparator with the same quantity, before or after the unit.
  const specs = {wave:['nm|纳米',1],power:['mW(?!\\s*/)',1],irradiance:['mW\\s*/\\s*cm2',1],dose:['J\\s*/\\s*cm2',1],duration:['分钟|min',1],frequency:['hz|赫兹',1],duty:['%',1],spot:['cm2',1],sessions:['次',1]};
  for (const [key,[unit]] of Object.entries(specs)) {
    const pattern = new RegExp('(至少|不低于|大于等于|不小于|超过|大于|不超过|至多|最多|不高于|小于等于|低于|小于|>=|<=|≥|≤|>|<)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:' + unit + ')', 'i');
    const m = text.match(pattern);
    if (m && !(key === 'spot' && /\/\s*$/.test(text.slice(0,m.index)))) {
      const op = /^(?:至少|不低于|大于等于|不小于|>=|≥)$/.test(m[1]) ? '>=' : /^(?:超过|大于|>)$/.test(m[1]) ? '>' : /^(?:低于|小于|<)$/.test(m[1]) ? '<' : '<=';
      out[key] = op + m[2];
    }
  }
  if (/成人|患者|人体|人脑|人类|human/i.test(text)) out.subject = 'Human';
  if (/小鼠|大鼠|动物|mouse|rat\b/i.test(text)) out.subject = 'Animal';
  if (/离体|ex vivo/i.test(text)) out.subject = 'Ex_Vivo';
  if (/细胞|cell/i.test(text)) out.subject = 'Cell';
  if (/仿真|模拟|simulation/i.test(text)) out.subject = 'Simulation';
  if (/患者|疾病|disease/i.test(text)) out.health = 'Disease';
  if (/健康/.test(text)) out.health = 'Healthy';
  if (!/非连续|不要连续|排除连续/.test(text) && /连续光|连续波|\bcw\b/i.test(text)) out.mode = 'CW';
  if (!/非脉冲|不要脉冲|排除脉冲/.test(text) && /脉冲(?:光|照射)?|\bpw\b/i.test(text)) out.mode = 'PW';
  if (!/无假刺激|没有假刺激|不要求(?:有)?假刺激/.test(text) && /假刺激|sham/i.test(text)) out.control = 'Sham';
  if (/热对照|温热对照|heat.control/i.test(text)) out.control = 'Heat_Control';
  if (/无处理|不处理|no.treatment/i.test(text)) out.control = 'No_Treatment';
  if (/无对照|没有对照/.test(text)) out.control = 'None';
  if (!/不要求.*(?:测温|温升)/.test(text) && /必须.*测温|只看.*测温|必须.*温升|只看.*实测温升/.test(text)) out.temperature = 'Yes';
  for (const term of Object.keys(targetAliases).sort((a,b) => b.length-a.length)) {
    const found = text.match(new RegExp('(?:右侧?|左侧?|双侧|两侧)?' + term));
    if (found) { out.target = found[0]; break; }
  }
  if (!out.target) {
    const found = text.match(/\b(?:(?:right|left|bilateral)\s+)?(?:dorsolateral\s+(?:prefrontal(?:\s+cortex)?|pfc)|prefrontal(?:\s+cortex)?|motor cortex|parietal|occipital|hippocampus|precuneus|postcentral|scalp|skull|dlpfc)\b/i);
    if (found) out.target = found[0];
  }
  const identifier = text.match(/(?:doi\s*:\s*|https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/[^\s，。；;]+)/i)
    || text.match(/\bPMID\s*:?\s*(\d{7,9})\b/i);
  if (identifier) out.paper = identifier[1].replace(/[.,]+$/, '').toLowerCase();
  return Object.fromEntries(Object.entries(out).filter(([,v]) => v));
}

export {common, range, targetMatches};
// Keep stored scientific values intact; normalize only known filter vocabulary.
export function categoryMatches(field, value, query) {
  const actual = String(value).toLowerCase(), requested = String(query).toLowerCase();
  if (field === 'Temperature_Measured' && requested === 'yes') {
    return actual === 'measured' || actual === 'yes';
  }
  return actual === requested;
}

// Compare the stored reported interval as a whole; never infer its midpoint.
export function numericMatches(actualValue, requested) {
  const actual = range(String(actualValue)), wanted = range(String(requested));
  if (!actual || !wanted) return false;
  const op = String(requested).trim().match(/^(>=|<=|>|<|≥|≤)/)?.[1];
  if (op === '>') return actual[0] > wanted[0];
  if (op === '<') return actual[1] < wanted[1];
  return actual[0] >= wanted[0] && actual[1] <= wanted[1];
}

export function queryWarnings(text) {
  const warnings = [];
  if (/不要|排除|非连续|非脉冲|不含|除了/.test(text)) warnings.push('排除条件尚未自动应用，请核对筛选；当前结果不保证满足排除要求。');
  if (/最佳|最优|哪个更好|哪种更好|推荐.*参数|应该.*(?:剂量|波长)/.test(text)) warnings.push('检索可列出研究用过的参数；研究条件不同，不能据此自动判定最佳方案。');
  if (/显著|疗效|改善|提升|有效|机制|结果/.test(text)) warnings.push('参数筛选不判断疗效或显著性，请同时阅读研究结果与对照设计。');
  return warnings;
}
