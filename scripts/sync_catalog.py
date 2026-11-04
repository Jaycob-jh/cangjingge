#!/usr/bin/env python3
"""Merge sanitized H snapshots into a public catalog. No remote writes or PDF reads."""
from pathlib import Path
import argparse, hashlib, json, re, unicodedata
from collections import Counter, defaultdict
from datetime import date
from literature_common import normalize_doi
ROOT = Path(__file__).resolve().parents[1]

def title_key(text):
    return ''.join(c for c in unicodedata.normalize('NFKC', text).casefold() if c.isalnum())

def year_of(value):
    m=re.search(r'(?<!\d)(?:18|19|20)\d{2}(?!\d)', str(value or ''))
    return int(m[0]) if m else None

def doi_of(value):
    if not value: return None
    try: return normalize_doi(str(value))
    except ValueError: return None

def merge(work):
    zl=json.loads((work/'zotero-collections.json').read_text(encoding='utf-8'))
    rl=json.loads((work/'readcube-lists.json').read_text(encoding='utf-8'))
    zi=json.loads((work/'zotero-items.json').read_text(encoding='utf-8'))
    ri=json.loads((work/'readcube-items.json').read_text(encoding='utf-8'))
    topics={}
    lookup={}
    for source,lists in [('Zotero',zl),('ReadCube',rl)]:
        for r in lists:
            data=r.get('data',r); name=data.get('name','')
            m=re.match(r'^(0[1-7](?:\.\d{2})?)\s+(.+)$',name)
            if m:
                code,label=m.groups()
                topics[code]={'id':code,'name':label,'parent':code[:2] if '.' in code else None}
                lookup[(source,r.get('key',r.get('id')))]=code
            elif name=='CuiLab 实验室文章':
                topics['cuilab']={'id':'cuilab','name':name,'parent':None}
                lookup[(source,r.get('key',r.get('id')))]='cuilab'
    incoming=[]
    for p in zi:
        authors=[' '.join(filter(None,[a.get('firstName'),a.get('lastName')])).strip() or a.get('name','') for a in p.get('creators',[]) if a.get('creatorType')=='author']
        incoming.append({'source':'Zotero','source_id':p['key'],'title':p.get('title') or '', 'authors':authors,'year':year_of(p.get('date')),'doi':doi_of(p.get('DOI')),'journal':p.get('publicationTitle') or '', 'volume':p.get('volume') or '', 'issue':p.get('issue') or '', 'pages':p.get('pages') or '', 'type':p.get('itemType') or 'article','topics':sorted({lookup[('Zotero',c)] for c in p.get('collections',[]) if ('Zotero',c) in lookup})})
    for p in ri:
        a=p['article']
        incoming.append({'source':'ReadCube','source_id':p['id'],'title':a.get('title') or '', 'authors':a.get('authors') or [],'year':year_of(a.get('year')),'doi':doi_of(p.get('doi')),'journal':a.get('journal') or '', 'volume':a.get('volume') or '', 'issue':a.get('issue') or '', 'pages':a.get('pagination') or '', 'type':'article','topics':sorted({lookup[('ReadCube',c)] for c in p.get('list_ids',[]) if ('ReadCube',c) in lookup})})
    # Two passes: DOI identity first, then exact normalized title + year for no-DOI copies.
    records={}; provenance=defaultdict(list); pending=[]
    by_title=defaultdict(set)
    for p in incoming:
        if not p['title'].strip():
            pending.append({'source':p['source'],'source_id':p['source_id'],'reason':'missing_title'}); continue
        if p['doi']: by_title[(title_key(p['title']),p['year'])].add('doi:'+p['doi'])
    for p in incoming:
        if not p['title'].strip(): continue
        key='doi:'+p['doi'] if p['doi'] else None
        if key is None:
            candidates=by_title.get((title_key(p['title']),p['year']),set())
            key=next(iter(candidates)) if len(candidates)==1 else 'title:'+title_key(p['title'])+':'+str(p['year'])
        # A citation needs a public identifier or publication information.
        if not key.startswith('doi:') and not (p['journal'] and p['authors'] and p['year']):
            pending.append({'source':p['source'],'source_id':p['source_id'],'title':p['title'],'reason':'incomplete_public_citation'}); continue
        provenance[key].append({'source':p['source'],'id':p['source_id']})
        if key not in records:
            records[key]={k:v for k,v in p.items() if k not in ('source','source_id')}
            records[key]['sources']=[p['source']]
            records[key]['reading_status']='已编目'
        else:
            r=records[key]
            r['sources']=sorted(set(r['sources']+[p['source']]))
            r['topics']=sorted(set(r['topics']+p['topics']))
            for field in ['doi','title','authors','year','journal','volume','issue','pages']:
                if not r[field] and p[field]: r[field]=p[field]
    curated=json.loads((ROOT/'data/literature.json').read_text(encoding='utf-8'))
    for p in curated:
        key='doi:'+normalize_doi(p['doi'])
        if key not in records:
            records[key]={'title':p['title'],'authors':p['authors'],'year':p['year'],'doi':p['doi'],'journal':p['journal'],'volume':'','issue':'','pages':p['citation'],'type':'article','topics':[],'sources':[]}
        r=records[key]
        r.update(title=p['title'],authors=p['authors'],journal=p['journal'],reading_status=p['reading_status'],summary=p['summary'],curated_path='papers/'+p['id']+'.html')
    # Preserve the existing hand-authored OpenScholar card and stable URL.
    key='doi:10.1038/s41586-025-10072-4'
    if key not in records:
        records[key]={'title':'Synthesizing scientific literature with retrieval-augmented language models','authors':['Akari Asai et al.'],'year':2026,'doi':'10.1038/s41586-025-10072-4','journal':'Nature','volume':'650','issue':'','pages':'857–863','type':'article','topics':[],'sources':[],'reading_status':'方法参考'}
    records[key]['curated_path']='papers/openscholar.html'
    for key,r in records.items(): r['id']='paper-'+hashlib.sha256(key.encode()).hexdigest()[:16]
    ordered=sorted(records.values(),key=lambda r:(-(r['year'] or 0),r['title'].casefold()))
    stats={'readcube_h_records':len(ri),'zotero_h_records':len(zi),'catalog_records':len(ordered),'sources_both':sum(set(r['sources'])=={'ReadCube','Zotero'} for r in ordered),'readcube_only':sum(r['sources']==['ReadCube'] for r in ordered),'zotero_only':sum(r['sources']==['Zotero'] for r in ordered),'with_doi':sum(bool(r['doi']) for r in ordered),'pending_source_records':len(pending),'source_duplicates_removed':sum(max(0,len(v)-1) for v in provenance.values())}
    catalog={'updated':date.today().isoformat(),'stats':stats,'topics':sorted(topics.values(),key=lambda t:t['id']),'records':ordered}
    (ROOT/'data/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    private={'stats':stats,'pending':pending,'provenance':{records[k]['id']:v for k,v in provenance.items()}}
    (work/'merge-report.json').write_text(json.dumps(private,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(stats,ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshots',type=Path)
    merge(parser.parse_args().snapshots)

