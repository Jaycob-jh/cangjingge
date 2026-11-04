"""Identity and source-boundary regression checks for the batch catalog."""
from pathlib import Path
from tempfile import TemporaryDirectory
import json, unittest
import sync_catalog

class CatalogTests(unittest.TestCase):
    def setUp(self):
        root=Path('I:/Agents-workspace/Workspaces/cangjingge-work/catalog-tests')
        root.mkdir(parents=True,exist_ok=True)
        self.tmp=TemporaryDirectory(dir=root)
        self.root=Path(self.tmp.name)
        (self.root/'data').mkdir()
        (self.root/'data/literature.json').write_text('[]',encoding='utf-8')
        self.original_root=sync_catalog.ROOT
        sync_catalog.ROOT=self.root

    def tearDown(self):
        sync_catalog.ROOT=self.original_root
        self.tmp.cleanup()

    def export(self, z, r):
        fixtures={'zotero-items.json':z,'readcube-items.json':r,
          'zotero-collections.json':[{'key':'ZCOL','data':{'name':'02.04 tPBM'}}],
          'readcube-lists.json':[{'id':'RCOL','name':'06.01 MRI'}]}
        for name,data in fixtures.items():
            (self.root/name).write_text(json.dumps(data),encoding='utf-8')
        sync_catalog.merge(self.root)
        return json.loads((self.root/'data/catalog.json').read_text(encoding='utf-8'))['records']

    def z(self, doi='10.1000/AbC', title='Shared paper', year='2024'):
        return {'key':'PRIVATE-Z-KEY','title':title,'DOI':doi,'date':year,
          'publicationTitle':'Journal','creators':[{'creatorType':'author','firstName':'Full','lastName':'Name'}],
          'collections':['ZCOL'],'notes':'PRIVATE NOTE MUST NEVER APPEAR'}

    def r(self, doi='10.1000/abc', title='Shared paper'):
        return {'id':'PRIVATE-R-ID','doi':doi,'article':{'title':title,'year':2024,
          'authors':['F. Name'],'journal':'Journal'},'list_ids':['RCOL']}

    def test_doi_case_merge_preserves_topics_and_public_fields(self):
        rows=self.export([self.z()],[self.r()])
        r=next(x for x in rows if x['doi']=='10.1000/abc')
        self.assertEqual(r['topics'],['02.04','06.01'])
        self.assertEqual(r['sources'],['ReadCube','Zotero'])
        self.assertEqual(r['authors'],['Full Name'])
        self.assertEqual(r['reading_status'],'已编目')
        self.assertNotIn('PRIVATE',json.dumps(rows))

    def test_no_doi_copy_links_only_to_unambiguous_title_year(self):
        rows=self.export([self.z(None)],[self.r()])
        r=[x for x in rows if x['title']=='Shared paper']
        self.assertEqual(len(r),1)
        self.assertEqual(r[0]['sources'],['ReadCube','Zotero'])
        rows=self.export([self.z(None)],[self.r(),self.r('10.1000/other')])
        self.assertEqual(len([x for x in rows if x['title']=='Shared paper']),3)

    def test_incomplete_records_wait_and_record_identity_is_stable(self):
        before=self.export([self.z()],[self.r()])
        after=self.export([self.z()],[self.r(),self.r('10.1000/missing','')])
        self.assertEqual([x['id'] for x in before],[x['id'] for x in after])
        report=json.loads((self.root/'merge-report.json').read_text(encoding='utf-8'))
        self.assertEqual(len(report['pending']),1)

if __name__=='__main__': unittest.main()
