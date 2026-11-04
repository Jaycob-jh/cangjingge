#!/usr/bin/env python3
"""Generate public literature cards from curated metadata, never from private PDFs."""
from pathlib import Path
import json
import re
from literature_common import normalize_doi

ROOT = Path(__file__).resolve().parents[1]
STAGES = {'已编目', '摘要已读', '全文已读', '精读已整理'}

def main():
    records = json.loads((ROOT / 'data/literature.json').read_text(encoding='utf-8'))
    seen = set()
    slugs = set()
    pages = []
    # Include preserved handwritten cards in the DOI uniqueness check.
    for card in (ROOT / 'library/papers').glob('*.qmd'):
        text = card.read_text(encoding='utf-8')
        if '<!-- generated: build_literature.py -->' not in text:
            match = re.search(r'https://doi\.org/([^\s)]+)', text)
            if match:
                doi = normalize_doi(match[1])
                if doi in seen:
                    raise ValueError(f'Duplicate DOI in handwritten cards: {card.name}')
                seen.add(doi)
    for p in records:
        doi = normalize_doi(p['doi'])
        slug = p['id']
        if doi in seen or slug in slugs or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
            raise ValueError(f'Duplicate DOI or invalid/duplicate slug: {slug}')
        if p['reading_status'] not in STAGES:
            raise ValueError(f'Unknown reading stage: {slug}')
        seen.add(doi)
        slugs.add(slug)
        # All publication dates are represented by their verified year; no invented day.
        front = {'title': p['title'], 'author': p['authors'][0] + ' et al.', 'date': str(p['year']),
                 'date-format': 'YYYY', 'reading-status': p['reading_status'],
                 'categories': p['topics'] + [p['reading_status']],
                 'description': p['summary'], 'toc': True}
        yaml = '\n'.join(f'{key}: {json.dumps(value, ensure_ascii=False)}' for key, value in front.items())
        body = [f'---\n{yaml}\n---\n',
                '## 书目信息\n',
                f"- **作者：** {'; '.join(p['authors'])}",
                f"- **发表信息：** *{p['journal']}*, {p['citation']} ({p['year']})",
                f'- **DOI：** [{doi}](https://doi.org/{doi})',
                f"- **阅读进度：** {p['reading_status']}\n",
                '## 研究内容\n', p['summary'] + '\n',
                '## 整理依据\n', p['basis'] + '\n',
                '## 关联阅读\n']
        body.extend(f"- [{link['title']}]({link['path']})" for link in p['related'])
        body.extend(['\n<details><summary>来源</summary>\n',
                     f"[期刊原文](https://doi.org/{doi})。{p['source_note']}\n", '</details>\n'])
        target = ROOT / 'library/papers' / f'{slug}.qmd'
        content = '\n'.join(body)
        if target.exists() and '<!-- generated: build_literature.py -->' not in target.read_text(encoding='utf-8'):
            raise ValueError(f'Refusing to replace a hand-authored card: {target.name}')
        pages.append((target, content + '\n<!-- generated: build_literature.py -->\n'))
    for target, content in pages:
        target.write_text(content, encoding='utf-8')
    print(f'文献页生成通过：{len(pages)} 篇，DOI 唯一；保留手写卡片。')

if __name__ == '__main__':
    main()
