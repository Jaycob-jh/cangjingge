#!/usr/bin/env python3
"""Publish only the curated catalog schema; source item IDs stay outside Git."""
from pathlib import Path
import argparse, json
from literature_common import normalize_doi

ROOT=Path(__file__).resolve().parents[1]
FIELDS={'id','title','authors','year','doi','journal','volume','issue','pages','type',
        'topics','sources','reading_status','summary','curated_path'}

def main():
    catalog=json.loads((ROOT/'data/catalog.json').read_text(encoding='utf-8'))
    ids=set(); dois=set(); topics={t['id'] for t in catalog['topics']}
    for r in catalog['records']:
        if set(r)-FIELDS or r['id'] in ids or not r['title'].strip():
            raise ValueError('Catalog schema/identity error')
        ids.add(r['id'])
        if r.get('doi'):
            doi=normalize_doi(r['doi'])
            if doi in dois: raise ValueError('Duplicate DOI: '+doi)
            dois.add(doi)
        if set(r['topics'])-topics: raise ValueError('Unknown topic')
        if r.get('curated_path') and not (ROOT/'library'/r['curated_path']).with_suffix('.qmd').is_file():
            raise ValueError('Missing curated card')
    if len(ids)!=catalog['stats']['catalog_records']: raise ValueError('Catalog count mismatch')
    (ROOT/'assets/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(f'完整目录验证通过：{len(ids)} 条，{len(topics)} 类；公开字段及 DOI 唯一性通过。')

def extend_search():
    catalog=json.loads((ROOT/'assets/catalog.json').read_text(encoding='utf-8'))
    path=ROOT/'docs/search.json'
    index=json.loads(path.read_text(encoding='utf-8'))
    index=[r for r in index if not str(r.get('objectID','')).startswith('catalog:')
           and str(r.get('href','')).split('#')[0]!='library/record.html']
    topics={t['id']:t['name'] for t in catalog['topics']}
    count=0
    for r in catalog['records']:
        if r.get('curated_path'): continue  # Quarto already indexes these pages.
        # Quarto appends ?q= to its results; keep our identifier in the fragment.
        index.append({'objectID':'catalog:'+r['id'],'href':'library/record.html#'+r['id'],
          'title':r['title'],'section':'','text':' · '.join(str(x) for x in
          [*r['authors'],r['journal'],r['year'],r.get('doi'),*[topics[t] for t in r['topics']]] if x)})
        count+=1
    path.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'全站搜索已加入 {count} 条目录文献；保留原有卡片、札记与专题索引。')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--search-index',action='store_true')
    if parser.parse_args().search_index: extend_search()
    else: main()
