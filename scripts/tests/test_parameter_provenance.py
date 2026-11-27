import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from parameter_provenance import location, requires_original


class ParameterProvenance(unittest.TestCase):
    def test_coordinates_without_private_notes(self):
        self.assertEqual(location('I:/private/26889965.pdf 物理第2页；SHA256 abc', 'Main_Text'), 'PDF 第 2 页')
        self.assertEqual(location('paper.pdf physical pp.3–5', 'Main_Text'), 'PDF 第 3–5 页')
        self.assertEqual(location('Supplementary_Data3. Temperature.xlsx，rawdata 第10–13行，B:M及O列；SHA256 abc', 'Supplement'), '补充材料 · rawdata 第 10–13 行')
        self.assertEqual(location('file.docx, supplementary Tables S1–S4', 'Supplement'), '补充材料 · Tables S1–S4')

    def test_cached_printed_pages_keep_scope_and_uncertainty(self):
        text = '作者版PDF网页缓存，印刷页约742–745，https://private.example/file.pdf'
        self.assertEqual(location(text, 'Main_Text'), '缓存摘录 · 印刷第 约742–745 页')
        self.assertTrue(requires_original(text, 'Main_Text'))
        self.assertTrue(requires_original('paper.pdf 物理第1–2页，Abstract', 'Main_Text'))
        self.assertFalse(requires_original('paper.pdf 物理第2页', 'Main_Text'))

    def test_trial_and_secondary_analysis_are_distinct(self):
        self.assertEqual(location('关联原试验 32926117.pdf 物理第3页；本二次分析 38805733.pdf 物理第3页确认同试验', 'Main_Text'), '原试验 · PDF 第 3 页')
        self.assertTrue(requires_original('PubMed日期元数据 file.xml', 'Main_Text'))
        self.assertEqual(location('local.xml passage 30', 'Main_Text'), '正文')


if __name__ == '__main__':
    unittest.main()
