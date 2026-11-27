"""Render curated topic bibliographies without rewriting topic prose or catalog fields."""
from pathlib import Path
from html import escape
import json,re
from literature_common import normalize_doi
from build_reading_links import primary_doi
ROOT=Path(__file__).resolve().parents[1]

def main():
    topics=json.loads((ROOT/'data/topic-literature.json').read_text(encoding='utf-8'))['topics']
    catalog=json.loads((ROOT/'data/catalog.json').read_text(encoding='utf-8'))['records']
    studies=json.loads((ROOT/'data/tpbm-studies.json').read_text(encoding='utf-8'))['studies']
    byid={r['id']:r for r in catalog}; bystudy={s['id']:s for s in studies}
    catalog_bydoi={normalize_doi(r['doi']):r for r in catalog if r.get('doi')}
    bydoi={normalize_doi(s['doi']):s for s in studies}; notes={}
    for p in sorted((ROOT/'notes/posts').glob('*.qmd')):
        text=p.read_text(encoding='utf-8-sig')
        doi=primary_doi(text)
        if doi:notes.setdefault(doi,[]).append((p,text))
    assert len({t['id'] for t in topics})==len(topics)
    out=ROOT/'research/_topic-literature';out.mkdir(exist_ok=True)
    for t in topics:
        entries=[]; seen=set()
        for e in t['entries']:
            assert set(e)-{'context'} in ({'catalog_id'},{'study_id'}), e
            r=byid[e['catalog_id']] if 'catalog_id' in e else bystudy[e['study_id']]
            doi=normalize_doi(r.get('doi',''));key=doi or r['id']
            assert key not in seen, (t['id'],key)
            seen.add(key);s=bydoi.get(doi);entries.append((r,s,doi))
        entries.sort(key=lambda x:(-int(x[0].get('year') or 0),x[0]['title']))
        lines=['## 相关论文','','按题名、作者、年份或 DOI 筛选。已整理全文的论文可直接查看参数、图表或加入对比。','','[修改论文列表](https://github.com/Jaycob-jh/cangjingge/edit/main/data/topic-literature.json)','','```{=html}',f'<section class="topic-bibliography" aria-label="{escape(t["title"])}相关论文">','<label class="topic-search">查找本专题论文<input type="search" placeholder="题名、作者、年份或 DOI" data-topic-search></label>',f'<p data-topic-count aria-live="polite">{len(entries)} 篇论文</p>','<div class="topic-papers">']
        for r,s,doi in entries:
            title=r['title'];metadata=catalog_bydoi.get(doi,r);authors='; '.join(metadata.get('authors',[])[:3]);meta=' · '.join(str(x) for x in [metadata.get('year'),authors,metadata.get('journal')] if x)
            source='https://doi.org/'+doi if doi else r.get('url') or r.get('fulltext'); assert source.startswith('https://'), r['id']
            preprint=doi.startswith(('10.1101/','10.21203/','10.48550/'))
            lines += ['<article class="topic-paper">',f'<h3><a href="{escape(source,quote=True)}">{escape(title)}</a></h3>',f'<p>{escape(meta)}'+(' · 预印本' if preprint else '')+'</p>',f'<p class="topic-doi">{escape(doi)}</p>','<p class="topic-paper-links">']
            links=[]
            book=catalog_bydoi.get(doi)
            if book:links.append(f'<a href="../library/record.html#{book["id"]}">查看书目</a>')
            for p,text in notes.get(doi,[]):links.append(f'<a href="../notes/posts/{p.stem}.html">论文笔记</a>')
            if s:
                links += [f'<a href="../library/tpbm/{s["id"]}.html">参数与图表</a>',f'<a href="tpbm-compare.html?selected={s["id"]}">加入对比</a>']
            context=next((e.get('context','') for e in t['entries'] if e.get('catalog_id')==r['id'] or e.get('study_id')==r['id']),'')
            lines += [' · '.join(links),'</p>']
            if context:lines.append('<p>'+escape(context)+'</p>')
            lines.append('</article>')
        lines+=['</div>','<p data-topic-empty hidden>没有匹配论文，试试更短的词或 DOI。</p>','</section>','<script src="../assets/topic-literature.js"></script>','```','']
        (out/(t['id']+'.md')).write_text('\n'.join(lines),encoding='utf-8')
        page=ROOT/('research/topic-'+t['id']+'.qmd');body=page.read_text(encoding='utf-8-sig');include='{{< include _topic-literature/'+t['id']+'.md >}}'
        if include not in body:
            marker='[修改本专题]';pos=body.index(marker) if marker in body else len(body)
            body=body[:pos]+include+'\n\n'+body[pos:];page.write_text(body,encoding='utf-8')
        print(t['id'],len(entries))
if __name__=='__main__':main()
