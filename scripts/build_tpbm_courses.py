"""Validate the additive arm/phase ledger and publish it without changing old parameter records."""
from pathlib import Path
import json
import re
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
EXTRA={'Sessions_Per_Week','Sessions_Per_Day','Course_Weeks','Session_Count_Basis','Intervention_Arm','Protocol_Note'}

def validate(data,studies,base):
    if data.get('schema_version')!=1 or not isinstance(data.get('arms'),list): raise ValueError('疗程文件格式无效')
    seen=set()
    for arm in data['arms']:
        if not re.fullmatch(r'[a-z0-9-]+',arm['id']) or arm['id'] in seen: raise ValueError('疗程组ID重复或无效')
        seen.add(arm['id']);study=studies[arm['study_id']]
        if arm['doi'].lower()!=study['doi'].lower(): raise ValueError('疗程DOI与原研究不一致')
        if not re.fullmatch(r'\d+',arm['paper_id']): raise ValueError('需要规范PMID')
        expected=re.search(r'PMC\d+',study['fulltext']).group(0)
        entries=arm['entries'];fields={e['field'] for e in entries}
        if not {'Subject_Type','Intervention_Arm','Session_Count_Basis'}<=fields: raise ValueError('缺少组别或次数口径')
        if arm['emission']=='none' and fields&{'Wavelength_nm','Fluence_J_cm2','Irradiance_mW_cm2','Power_mW'}: raise ValueError('不出光假刺激不能借用主动组出光参数')
        for item in entries:
            if item['field'] not in set(base['fields'])|EXTRA: raise ValueError('疗程字段拼写无效')
            if item.get('course_plan_id')!=arm['id']: raise ValueError('参数来自另一个组或阶段')
            if item.get('pending') is not False or item.get('source_review_required') is not False: raise ValueError('疗程匹配只接收已核对记录')
            u=urlparse(item['source_url'])
            if u.scheme!='https' or u.netloc!='pmc.ncbi.nlm.nih.gov' or expected not in u.path or not item['where']: raise ValueError('需要同篇原文的公开位置')
            if item['kind'] not in ['Direct','Converted','Calculated']: raise ValueError('缺少记录/换算口径')
    return len(seen)

def main():
    data=json.loads((ROOT/'data/tpbm-course-arms.json').read_text(encoding='utf-8'))
    studies={s['id']:s for s in json.loads((ROOT/'data/tpbm-studies.json').read_text(encoding='utf-8'))['studies']}
    base=json.loads((ROOT/'assets/tpbm-parameters.json').read_text(encoding='utf-8'))
    count=validate(data,studies,base)
    content=json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n';target=ROOT/'assets/tpbm-course-arms.json'
    if not target.exists() or target.read_text(encoding='utf-8')!=content: target.write_text(content,encoding='utf-8')
    print(f'疗程原文与组别校验通过：{count} 条方案/阶段记录；原参数库未改写。')

if __name__=='__main__': main()
