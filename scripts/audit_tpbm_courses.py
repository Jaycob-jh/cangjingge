"""Inventory every original parameter-index paper; write maintenance status outside the public repo."""
import argparse
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def inventory(base,courses):
    rows=[]
    for p in base['papers']:
        arms=[a for a in courses['arms'] if a['paper_id']==p['id']]
        counts=[{'group':g,'value':e['value'],'pending':bool(e.get('pending') or e.get('source_review_required'))}
                for g,es in p['groups'].items() for e in es if e['field']=='Total_Sessions']
        repeated=any(any(float(n)>1 for n in re.findall(r'\d+(?:\.\d+)?',str(e['value']))) for e in counts)
        status='has_reviewed_course_records' if arms else 'needs_original_course_review' if repeated else 'no_multiple_session_clue'
        rows.append(dict(pmid=p['id'],doi=p.get('doi',''),title=p['title'],status=status,multiple_session_clue=repeated,
                         original_counts=counts,reviewed_arm_ids=[a['id'] for a in arms],
                         note='已有组/阶段记录不等于整篇所有疗程均核完；次数线索也可能是交叉访视，须读原文。'))
    return dict(schema_version=1,index_papers=len(rows),multiple_session_candidates=sum(r['multiple_session_clue'] for r in rows),
                papers_with_reviewed_records=sum(bool(r['reviewed_arm_ids']) for r in rows),
                pending_candidates=sum(r['status']=='needs_original_course_review' for r in rows),records=rows)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,required=True);args=ap.parse_args()
    target=args.output.resolve()
    if target.is_relative_to(ROOT):raise SystemExit('维护清单必须保存在公开仓库外')
    read=lambda f:json.loads((ROOT/f).read_text(encoding='utf-8'))
    result=inventory(read('assets/tpbm-parameters.json'),read('data/tpbm-course-arms.json'))
    register=target.parent/'source-register.json'
    if register.exists():
        sources=json.loads(register.read_text(encoding='utf-8'))
        for row in result['records']:
            if row['pmid'] in sources:row['source_status']=sources[row['pmid']]
    target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='records'},ensure_ascii=False))

if __name__=='__main__':main()
