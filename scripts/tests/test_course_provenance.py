"""Protect arm/phase identity and original public source locations."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('courses',ROOT/'scripts/build_tpbm_courses.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CourseProvenance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        read=lambda f:json.loads((ROOT/f).read_text(encoding='utf-8'))
        cls.data=read('data/tpbm-course-arms.json')
        cls.studies={s['id']:s for s in read('data/tpbm-studies.json')['studies']}
        cls.base=read('assets/tpbm-parameters.json')
    def test_sources_validate_without_mutation(self):
        before=copy.deepcopy(self.data)
        self.assertEqual(module.validate(self.data,self.studies,self.base),len(self.data['arms']))
        self.assertEqual(self.data,before)
    def test_cross_arm_entry_rejected(self):
        data=copy.deepcopy(self.data)
        data['arms'][0]['entries'][0]['course_plan_id']='another-arm'
        with self.assertRaises(ValueError):module.validate(data,self.studies,self.base)
    def test_sham_cannot_borrow_emitted_wavelength(self):
        data=copy.deepcopy(self.data)
        sham=next(a for a in data['arms'] if a['emission']=='none')
        entry=copy.deepcopy(sham['entries'][0]);entry['field']='Wavelength_nm';entry['value']='808'
        sham['entries'].append(entry)
        with self.assertRaises(ValueError):module.validate(data,self.studies,self.base)
    def test_wrong_paper_source_rejected(self):
        data=copy.deepcopy(self.data)
        data['arms'][0]['entries'][0]['source_url']='https://pmc.ncbi.nlm.nih.gov/articles/PMC123/'
        with self.assertRaises(ValueError):module.validate(data,self.studies,self.base)
    def test_pending_not_published_as_verified(self):
        data=copy.deepcopy(self.data);data['arms'][0]['entries'][0]['pending']=True
        with self.assertRaises(ValueError):module.validate(data,self.studies,self.base)
    def test_actual_attendance_cannot_be_calculated(self):
        data=copy.deepcopy(self.data)
        arm=next(a for a in data['arms'] if any(e['field']=='Session_Count_Basis' and e['value']=='Completed' for e in a['entries']) and any(e['field']=='Total_Sessions' for e in a['entries']))
        next(e for e in arm['entries'] if e['field']=='Total_Sessions')['kind']='Calculated'
        with self.assertRaisesRegex(ValueError,'实际完成次数'):module.validate(data,self.studies,self.base)
    def test_non_card_document_identity_rejected(self):
        data=copy.deepcopy(self.data)
        key=next(iter(data['documents']))
        data['documents'][key]['doi']='10.0000/wrong-paper'
        with self.assertRaises(ValueError):module.validate(data,self.studies,self.base)
    def test_document_path_cannot_point_to_another_pmc(self):
        data=copy.deepcopy(self.data)
        key=next(iter(data['documents']))
        data['documents'][key]['url']='https://pmc.ncbi.nlm.nih.gov/articles/PMC123/'
        with self.assertRaises(ValueError):module.validate(data,self.studies,self.base)

if __name__=='__main__':unittest.main()
