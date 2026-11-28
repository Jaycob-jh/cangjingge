import copy,hashlib,importlib.util,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts'))
import create_reading_draft as m
class Tests(unittest.TestCase):
 def setUp(self):
  folder=ROOT.parent/'cangjingge-work/intake-tests-v1';folder.mkdir(parents=True,exist_ok=True);self.tmp=tempfile.TemporaryDirectory(dir=folder);self.addCleanup(self.tmp.cleanup);self.out=Path(self.tmp.name)
 def test_existing_doi_and_original_topics(self):
  draft,text=m.make_draft(doi='https://doi.org/10.1002/LSM.22471',topics=['extra-topic']);self.assertEqual(draft['duplicates']['study_ids'],['tian-2016']);self.assertIn('paper-d91856d1ed049d2d',draft['duplicates']['catalog_ids']);self.assertEqual(draft['topics'][:-1],draft['original_topics']);self.assertEqual(draft['topics'][-1],'extra-topic');self.assertFalse(draft['reading_scope']['fulltext_reviewed']);self.assertEqual(text,[])
 def test_no_overwrite_manual_draft(self):
  draft,text=m.make_draft(doi='10.1002/lsm.22471');first=m.save_draft(draft,text,self.out);p=Path(first['directory'])/'note.qmd';p.write_text('Hai manual content',encoding='utf8');second=m.save_draft(draft,text,self.out);self.assertFalse(second['created']);self.assertEqual(p.read_text('utf8'),'Hai manual content')
  revised=m.save_draft(draft,text,self.out,new_revision=True);self.assertTrue(revised['created']);self.assertNotEqual(revised['directory'],first['directory'])
 def test_conflicting_title_doi_not_merged(self):
  title='Transcranial laser stimulation improves human cerebral oxygenation';draft,_=m.make_draft(doi='10.9999/different',title=title);self.assertFalse(draft['duplicates']['catalog_ids']);self.assertTrue(draft['duplicates']['same_title_catalog_ids']);self.assertTrue(draft['conflicts']);self.assertNotIn('authors',draft['bibliography'])
 def test_title_only_and_no_doi(self):
  title='TRANScRANIAL LASER STIMULATION IMPROVES HUMAN CEREBRAL OXYGENATION!';draft,_=m.make_draft(title=title);self.assertEqual(draft['identity']['doi'],'10.1002/lsm.22471');self.assertEqual(draft['identity']['source'],'catalog_title_candidate')
  new,_=m.make_draft(title='Unknown manuscript title');self.assertIsNone(new['identity']['doi']);self.assertEqual(new['duplicates']['catalog_ids'],[])
 def test_domain_fields_separate(self):
  for domain,required in [('tpbm','波长_nm'),('fmri','TR_ms'),('sleep-eeg','睡眠分期规则')]:
   draft,_=m.make_draft(doi='10.1002/lsm.22471',domain=domain);self.assertIn(required,draft['field_template']);self.assertEqual(draft['groups'],[]);self.assertEqual(draft['evidence'],[])
 def test_crossref_conflicts_preserve_catalog(self):
  with patch.object(m,'crossref',return_value={'doi':'10.1002/lsm.22471','title':'Conflicting external title','year':2099,'source_url':'https://api.crossref.org/works/test'}):draft,_=m.make_draft(doi='10.1002/lsm.22471',lookup=True)
  self.assertEqual(draft['bibliography']['year'],2016);self.assertNotEqual(draft['bibliography']['title'],'Conflicting external title');self.assertEqual(len(draft['conflicts']),2)
 def test_pdf_scope_candidates_and_draft_privacy(self):
  import fitz
  p=self.out/'source.pdf'
  with fitz.open()as doc:
   a=doc.new_page();a.insert_text((50,50),'DOI 10.1002/lsm.22471\nAbstract.\nBody text 10.9999/reference');b=doc.new_page();b.insert_text((50,50),'Page two');doc.save(p)
  draft,text=m.make_draft(pdf=p,pages=1);self.assertEqual(draft['identity']['doi'],'10.1002/lsm.22471');self.assertEqual(draft['reading_scope']['pdf_text_extracted_pages'],[1]);self.assertTrue(draft['identity']['pdf_identity_review_required']);qmd=m.qmd_for(draft);self.assertNotIn(str(p),qmd);self.assertNotIn('Body text',qmd);self.assertNotIn('\ndoi:',qmd);self.assertIn('draft: true',qmd)
 def test_multiple_header_dois_not_auto_selected(self):
  import fitz
  p=self.out/'multiple.pdf'
  with fitz.open()as doc:
   a=doc.new_page();a.insert_text((50,50),'DOI 10.1002/lsm.22471\nDOI 10.9999/other\nAbstract.');doc.save(p)
  draft,_=m.make_draft(pdf=p);self.assertIsNone(draft['identity']['doi']);self.assertEqual(len(draft['pdf']['header_doi_candidates']),2)
 def test_literal_mentions_pending_and_page_bound(self):
  values,figures=m.pdf_mentions([{'pdf_page':4,'text':'810 nm, 40 Hz, 250 mW/cm², 50% are mentioned near Fig. 2b.'}]);self.assertEqual(len(values),4);self.assertTrue(all(v['pending']and v['source_review_required']and v['group']is None and v['pdf_page']==4 for v in values));self.assertEqual(figures[0]['pdf_page'],4);self.assertFalse(figures[0]['figure_reviewed'])
 def test_explicit_doi_pdf_conflict(self):
  import fitz
  p=self.out/'conflict.pdf'
  with fitz.open()as doc:
   page=doc.new_page();page.insert_text((50,50),'DOI 10.1002/lsm.22471\nAbstract.');doc.save(p)
  draft,_=m.make_draft(doi='10.9999/other',pdf=p);self.assertTrue(any(x.get('pdf_candidates')for x in draft['conflicts']));self.assertFalse(draft['duplicates']['catalog_ids'])
 def test_area_units_and_timestamp_boundary(self):
  values,_=m.pdf_mentions([{'pdf_page':1,'text':'20 mm²; 3 T; 20 ms; 2023T12; 10 mJ/cm²'}]);self.assertEqual([x['unit']for x in values],['mm2','T','ms','mJ/cm2'])
 def test_repository_output_forbidden(self):
  draft,text=m.make_draft(doi='10.1002/lsm.22471')
  with self.assertRaises(ValueError):m.save_draft(draft,text,ROOT/'private/drafts')
 def test_changed_source_requests_new_revision(self):
  draft,text=m.make_draft(doi='10.1002/lsm.22471');m.save_draft(draft,text,self.out);changed=copy.deepcopy(draft);changed['domain']='fmri';self.assertTrue(m.save_draft(changed,text,self.out)['new_revision_needed'])
if __name__=='__main__':unittest.main()
