"""Export public experiment parameters from the first-pass workbook."""
import zipfile, re, json
import xml.etree.ElementTree as E
from pathlib import Path
import sys, unicodedata
z=zipfile.ZipFile(sys.argv[1])
def root(p):return E.fromstring(z.read(p))
rels={n.get('Id'):n.get('Target') for n in root('xl/_rels/workbook.xml.rels')}
sheets={s.get('name'):rels[next(v for k,v in s.attrib.items() if k.endswith('}id'))] for s in root('xl/workbook.xml').findall('.//{*}sheet')}
def tab(n):
 p=sheets[n]
 def val(c):return ''.join(t.text or '' for t in c.findall('.//{*}t')) if c.get('t')=='inlineStr' else c.findtext('{*}v','')
 return [{re.match('[A-Z]+',c.get('r')).group():val(c) for c in r} for r in root(p.lstrip('/') if p.startswith('/') else 'xl/'+p).findall('.//{*}row')][1:]

FIELDS=dict(Wavelength_nm='波长 · nm',Light_Source='光源',Power_mW='功率 · mW',Irradiance_mW_cm2='辐照度 · mW/cm²',Spot_Area_cm2='光斑 · cm²',Fluence_J_cm2='能量密度 · J/cm²',Total_Energy_J='能量 · J',Duration_min='时间 · 分钟（按原记录口径）',Total_Sessions='次数',Light_Mode='光模式',Pulse_Frequency_Hz='脉冲频率 · Hz',Duty_Cycle_pct='占空比 · %',Target='靶点',Cooling='冷却',Subject_Type='对象类型',Health_Status='健康状态',Measurement_Type='测量类别',Temperature_Measured='测温',Temperature_Location='测温位置',Max_Delta_T_C='最大温升 · °C',Mean_Delta_T_C='平均温升 · °C',Warmth_Reported='报告热感',Adverse_Event_Occurred='报告不良事件',Control_Type='对照',Sham_Method='假刺激方法')
def norm(s):return re.sub(r'[^\w]+',' ',unicodedata.normalize('NFKC',s).casefold()).strip()
def doi(s):return re.sub(r'^(https?://(?:dx\.)?doi\.org/|doi:\s*)','',s.strip().lower())
def location(s,source):
    where=[]
    if source=='Supplement':where.append('补充材料')
    m=re.search(r'physical pp?\.\s*([\d,–— -]+)',s,re.I)
    if m:where.append('PDF 第 '+m[1].strip()+' 页')
    where.extend(dict.fromkeys(re.findall(r'(?:Table|Fig(?:ure)?\.?|表|图)\s*[Ss]?\d+[a-zA-Z]?',s,re.I)))
    return ' · '.join(where) or {'Abstract':'摘要','Metadata':'题录','Main_Text':'正文','Table':'原文表格'}.get(source,'')
def clean(s):
    return bool(s and len(s)<=200 and not re.search(r'https?://|@|SHA256|[A-Za-z]:[/\\]|\.pdf|[/\\].*[/\\]',s,re.I))
rows=tab('Literature_Data')
coverage=tab('首轮记录覆盖_逐篇')
assert rows and len(rows)==len(coverage)
cards={doi(x['doi']):x['id'] for x in json.loads(Path('data/tpbm-studies.json').read_bytes())['studies']}
papers={}
for row,cv in zip(rows,coverage,strict=True):
    assert norm(row['A'])==norm(cv['B'])
    pmid=cv['A']
    assert pmid.isdecimal() and pmid not in papers
    d=doi(row.get('D',''))
    d=d if re.fullmatch(r'10\.\d{4,9}/[\w.()/;:+-]+',d) else ''
    papers[pmid]=dict(id=pmid,title=row['A'],author=row['B'],year=row['C'],doi=d,card=cards.get(d,''),groups={})
for r in tab('Evidence'):
    pmid=r.get('A','').removeprefix('PMID:')
    field,value,group=(r.get(k,'').strip() for k in 'BCD')
    if pmid not in papers or field not in FIELDS or not clean(value):continue
    if value.casefold() in {'nr','na','nc','unclear','unknown','not reported'}:continue
    # A grouped row never inherits study-wide values or another group's values.
    if not group and re.search(r';|\b(?:group|arm)\s*:',value,re.I):continue
    if group and not clean(group):continue
    source=r.get('G','')
    item=dict(field=field,value=value,where=location(r.get('F',''),source),kind=r.get('H',''),pending=r.get('J')!='Yes' or source in ('Abstract','Metadata'))
    bucket=papers[pmid]['groups'].setdefault(group,[])
    if item not in bucket:bucket.append(item)
assert any(x['groups'] for x in papers.values())
payload=dict(topic='tpbm',fields=FIELDS,papers=list(papers.values()))
Path('assets/tpbm-parameters.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
print(len(papers),'papers;',sum(sum(bool(k) for k in x['groups']) for x in papers.values()),'named groups')
