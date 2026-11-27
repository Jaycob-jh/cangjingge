import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_reading_links import primary_doi, compile_links


class ReadingLinks(unittest.TestCase):
    def test_citations_after_heading_are_not_primary(self):
        self.assertIsNone(primary_doi('---\ntitle: Guide\n---\nGeneral guide\n## References\n[paper](https://doi.org/10.1234/cited)'))

    def test_ambiguous_versions_require_explicit_identity(self):
        text = '---\ntitle: Versions\n---\n[formal](https://doi.org/10.1234/formal) [preprint](https://doi.org/10.1234/preprint)'
        self.assertIsNone(primary_doi(text))
        explicit = text.replace('title: Versions', 'title: Versions\ndoi: "https://doi.org/10.1234/FORMAL"')
        self.assertEqual(primary_doi(explicit), '10.1234/formal')

    def test_parentheses_inside_doi_survive_markdown(self):
        self.assertEqual(primary_doi('[DOI](https://doi.org/10.1016/S1053-8119(03)00483-X)'), '10.1016/s1053-8119(03)00483-x')

    def test_reciprocal_links_and_manual_fields(self):
        record = {'id': 'paper', 'doi': 'DOI:10.1234/Example', 'curated_path': 'papers/manual.html'}
        study = {'id': 'study', 'doi': '10.1234/example', 'questions': ['q']}
        topics = [{'id': 'topic', 'title': 'Topic', 'entries': [{'study_id': 'study'}, {'catalog_id': 'paper'}]}]
        note = '---\ndoi: 10.1234/example\ntitle: Note\n---\n## References\n[other](https://doi.org/10.1234/unrelated)'
        result = compile_links([record], [study], [{'id': 'q', 'title': 'Question'}], topics, [('note', note)])
        self.assertEqual(record['curated_path'], 'papers/manual.html')
        links = result['records']['paper']
        self.assertEqual({x['kind'] for x in links}, {'study', 'compare', 'note', 'topic', 'question'})
        self.assertEqual(len(links), 5)
        self.assertTrue(any(x['href'] == 'library/record.html#paper' for x in result['studies']['study']))
        self.assertFalse(any('unrelated' in x['href'] for x in links))


if __name__ == '__main__':
    unittest.main()
