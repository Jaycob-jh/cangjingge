"""Local intake checks; never creates ReadCube records or contacts the network."""
from pathlib import Path
import json
import tempfile
import unittest
import pymupdf
from prepare_intake import prepare
from literature_common import normalize_doi

SCRATCH = Path('I:/Agents-workspace/Workspaces/cangjingge-work/intake-tests')

class IntakeTests(unittest.TestCase):
    def setUp(self):
        SCRATCH.mkdir(parents=True, exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(dir=SCRATCH)
        self.root = Path(self.tmp.name)
        self.state = self.root / 'state'
        self.inbox = self.root / 'pdfs'

    def tearDown(self):
        self.tmp.cleanup()

    def pdf(self, name, first='', second=''):
        path = self.root / name
        with pymupdf.open() as doc:
            doc.new_page().insert_text((50, 50), first)
            if second:
                doc.new_page().insert_text((50, 50), second)
            doc.save(path)
        return path

    def test_renamed_pdf_is_reused_and_original_retained(self):
        a = self.pdf('one.pdf', 'Paper DOI: 10.1002/advs.202523009')
        b = self.root / 'renamed.pdf'
        b.write_bytes(a.read_bytes())
        one = prepare(str(a), self.state, self.inbox)
        two = prepare(str(b), self.state, self.inbox)
        self.assertEqual(one['record_id'], two['record_id'])
        self.assertTrue(two['reused'])
        self.assertIsNone(two['doi'])  # a detected DOI is a candidate until verified
        self.assertEqual(two['doi_candidates'], ['10.1002/advs.202523009'])
        self.assertEqual(len(list(self.inbox.glob('*.pdf'))), 1)
        self.assertTrue(a.exists())

    def test_doi_url_case_and_explicit_pdf_link(self):
        one = prepare('https://doi.org/10.1002/ADVS.202523009?x=1', self.state, self.inbox)
        pdf = self.pdf('article.pdf', 'Paper title')
        two = prepare(str(pdf), self.state, self.inbox, 'doi:10.1002/advs.202523009')
        self.assertEqual(one['record_id'], two['record_id'])
        record = json.loads((self.state / 'queue.json').read_text(encoding='utf-8'))[0]
        self.assertEqual(record['readcube_status'], 'pending_lookup')
        self.assertEqual(record['public_status'], 'pending_curation')

    def test_scan_and_reference_doi_are_not_identity(self):
        scan = self.pdf('scan.pdf')
        prepare(str(scan), self.state, self.inbox)
        record = json.loads((self.state / 'queue.json').read_text(encoding='utf-8'))[0]
        self.assertTrue(record['extraction']['needs_ocr'])
        other = self.pdf('references.pdf', 'Title only', 'References: 10.1002/advs.202523009')
        result = prepare(str(other), self.state, self.inbox)
        self.assertEqual(result['doi_candidates'], [])

    def test_bad_input_and_repo_storage_are_rejected(self):
        with self.assertRaises(FileNotFoundError):
            prepare(str(self.root / 'missing.pdf'), self.state, self.inbox)
        with self.assertRaises(ValueError):
            normalize_doi('this is not a DOI')
        with self.assertRaises(ValueError):
            prepare('10.1002/advs.202523009', Path(__file__).resolve().parents[1], self.inbox)

if __name__ == '__main__':
    unittest.main()
