#!/usr/bin/env python3
"""Publish only the curated catalog schema; source item IDs stay outside Git."""
from pathlib import Path
import json
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

if __name__=='__main__': main()
