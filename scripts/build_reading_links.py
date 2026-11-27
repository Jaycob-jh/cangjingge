"""Connect existing public content by primary DOI, without rewriting its fields."""
from pathlib import Path
import json
import re
from urllib.parse import urlsplit
from literature_common import normalize_doi

ROOT = Path(__file__).resolve().parents[1]


def primary_doi(text):
    parts = text.split('---', 2)
    front, body = (parts[1], parts[2]) if text.startswith('---') and len(parts) == 3 else ('', text)
    explicit = re.search(r'^doi:\s*[\"\']?([^\s\"\'#]+)', front, re.M)
    if explicit:
        return normalize_doi(explicit[1])
    lead = re.split(r'^##\s', body, maxsplit=1, flags=re.M)[0][:2000]
    matches = set()
    for value in re.findall(r'https?://(?:dx\.)?doi\.org/(10\.[^\s<>]+)', lead):
        while value.endswith(')') and value.count(')') > value.count('('):
            value = value[:-1]
        matches.add(normalize_doi(value))
    return next(iter(matches)) if len(matches) == 1 else None


def note_title(text, fallback):
    match = re.search(r'^title:\s*(.+)$', text, re.M)
    return match[1].strip().strip('\"\'') if match else fallback


def compile_links(catalog, studies, questions, topics, notes):
    bydoi = {normalize_doi(r['doi']): r for r in catalog if r.get('doi')}
    byid = {r['id']: r for r in catalog}
    study_bydoi = {normalize_doi(s['doi']): s for s in studies}
    study_byid = {s['id']: s for s in studies}
    notes_bydoi = {}
    for name, text in notes:
        doi = primary_doi(text)
        if doi:
            notes_bydoi.setdefault(doi, []).append({'kind': 'note', 'title': note_title(text, name), 'href': f'notes/posts/{name}.html'})
    topics_bydoi = {}
    for topic in topics:
        for entry in topic['entries']:
            record = byid[entry['catalog_id']] if 'catalog_id' in entry else study_byid[entry['study_id']]
            if record.get('doi'):
                topics_bydoi.setdefault(normalize_doi(record['doi']), []).append({'kind': 'topic', 'title': topic['title'], 'href': f'research/topic-{topic["id"]}.html'})
    qtitles = {q['id']: q['title'] for q in questions}

    def related(doi):
        links = []
        study = study_bydoi.get(doi)
        if study:
            links.extend([
                {'kind': 'study', 'title': '参数与图表', 'href': f'library/tpbm/{study["id"]}.html'},
                {'kind': 'compare', 'title': '加入对比', 'href': f'research/tpbm-compare.html?selected={study["id"]}'},
            ])
        links.extend(notes_bydoi.get(doi, []))
        links.extend(topics_bydoi.get(doi, []))
        if study:
            links.extend({'kind': 'question', 'title': qtitles[qid], 'href': f'research/questions/{qid}.html'} for qid in study['questions'])
        return list({link['href']: link for link in links}.values())

    records = {r['id']: related(normalize_doi(r['doi'])) for r in catalog if r.get('doi')}
    records = {key: links for key, links in records.items() if links}
    study_links = {}
    for study in studies:
        doi = normalize_doi(study['doi'])
        record = bydoi.get(doi)
        links = ([{'kind': 'catalog', 'title': '书目信息', 'href': f'library/record.html#{record["id"]}'}] if record else [])
        links.extend(link for link in related(doi) if link['kind'] not in {'study', 'compare'})
        study_links[study['id']] = links
    return {'records': records, 'studies': study_links}


def main():
    catalog = json.loads((ROOT/'data/catalog.json').read_text('utf-8'))['records']
    studies = json.loads((ROOT/'data/tpbm-studies.json').read_text('utf-8'))['studies']
    questions = json.loads((ROOT/'data/tpbm-questions.json').read_text('utf-8'))
    topics = json.loads((ROOT/'data/topic-literature.json').read_text('utf-8'))['topics']
    notes = [(p.stem, p.read_text('utf-8-sig')) for p in sorted((ROOT/'notes/posts').glob('*.qmd'))]
    index = compile_links(catalog, studies, questions, topics, notes)
    for links in [*index['records'].values(), *index['studies'].values()]:
        for link in links:
            path = urlsplit(link['href'])
            assert not path.scheme and not path.netloc
            assert (ROOT/path.path).with_suffix('.qmd').is_file(), link
    (ROOT/'assets/reading-links.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
    print(f'Reading links: {len(index["records"])} catalog records, {len(index["studies"])} study cards')


if __name__ == '__main__':
    main()
