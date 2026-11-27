from copy import deepcopy
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from import_tpbm_parameters import merge_parameters, read_workbook, write_if_unchanged, main

OUT = Path('I:/Agents-workspace/Outputs/cangjingge/parameter-import-tests')


def item(value='810', field='Wavelength_nm', **extra):
    return dict(field=field, value=value, kind='Direct', where='PDF 第 2 页', pending=False, **extra)


def payload(groups=None, identifier='123', doi='10.1234/example'):
    return {'topic': 'tpbm', 'fields': {'Wavelength_nm': '波长'}, 'papers': [
        {'id': identifier, 'doi': doi, 'title': 'Example study', 'author': 'Author',
         'year': '2023', 'card': 'manual-card', 'groups': groups or {'Home': [item()]}}]}


class PreservingImport(unittest.TestCase):
    def test_same_value_keeps_manual_locator_status_and_notes(self):
        current = payload()
        current['papers'][0]['group_labels'] = {'Home': '居家装置'}
        current['papers'][0]['groups']['Home'][0].update(
            where='Hai 核对后的第 7 页', pending=True,
            source_review_required=True, source_note='保留计时说明')
        before = deepcopy(current)
        merged, report = merge_parameters(current, payload())
        self.assertEqual(merged, before)
        self.assertEqual(current, before)
        self.assertEqual(report['existing_evidence_kept'], 1)

    def test_edited_value_is_reported_and_not_reintroduced(self):
        current = payload({'Home': [item('850')]})
        merged, report = merge_parameters(current, payload())
        self.assertEqual(merged, current)
        self.assertEqual(report['conflicts'][0]['reason'], 'existing_field_differs')

    def test_only_missing_fields_groups_and_papers_are_added(self):
        current = payload()
        incoming = payload({'Home': [item(), item('40', 'Pulse_Frequency_Hz')],
                            'OtherDevice': [item('633')]})
        incoming['papers'].append(payload(identifier='456', doi='10.1234/second')['papers'][0])
        incoming['papers'][1]['title'] = 'Another study'
        merged, report = merge_parameters(current, incoming)
        self.assertEqual(len(merged['papers']), 2)
        self.assertEqual(merged['papers'][0]['groups']['Home'][0], current['papers'][0]['groups']['Home'][0])
        self.assertEqual([x['field'] for x in merged['papers'][0]['groups']['OtherDevice']], ['Wavelength_nm'])
        again, _ = merge_parameters(merged, incoming)
        self.assertEqual(again, merged)
        self.assertEqual(len(report['added_fields']), 1)

    def test_doi_normalization_keeps_stable_id_and_metadata(self):
        current = payload(identifier='stable-id', doi='https://doi.org/10.1234/EXAMPLE')
        incoming = payload(identifier='123', doi='DOI:10.1234/example')
        incoming['papers'][0]['author'] = 'Different author spelling'
        merged, _ = merge_parameters(current, incoming)
        self.assertEqual(merged, current)

    def test_identifier_collisions_and_conflicting_doi_are_withheld(self):
        current = payload()
        incoming = payload(doi='10.1234/different')
        merged, report = merge_parameters(current, incoming)
        self.assertEqual(merged, current)
        self.assertEqual(report['conflicts'][0]['reason'], 'doi_conflict')
        current['papers'].append(payload(identifier='456', doi='10.1234/second')['papers'][0])
        incoming = payload(identifier='123', doi='10.1234/second')
        merged, report = merge_parameters(current, incoming)
        self.assertEqual(merged, current)
        self.assertEqual(report['conflicts'][0]['reason'], 'identifier_collision')

    def test_title_only_duplicate_is_a_review_candidate(self):
        current = payload(doi='')
        merged, report = merge_parameters(current, payload(identifier='456', doi=''))
        self.assertEqual(merged, current)
        self.assertEqual(report['conflicts'][0]['reason'], 'title_duplicate_candidate')

    def test_noop_preserves_file_bytes_and_concurrent_edit_wins(self):
        OUT.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=OUT) as directory:
            self.assertTrue(Path(directory).resolve().is_relative_to(OUT.resolve()))
            path = Path(directory)/'index.json'
            before = json.dumps(payload(), indent=2).encode()
            path.write_bytes(before)
            self.assertFalse(write_if_unchanged(path, payload(), before))
            self.assertEqual(path.read_bytes(), before)
            path.write_bytes(before+b'\n')
            with self.assertRaisesRegex(RuntimeError, 'changed during import'):
                write_if_unchanged(path, payload(), before)
            self.assertEqual(path.read_bytes(), before+b'\n')

    def test_shared_string_workbook_and_private_source_filtering(self):
        OUT.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=OUT) as directory:
            self.assertTrue(Path(directory).resolve().is_relative_to(OUT.resolve()))
            path = Path(directory)/'input.xlsx'
            def row(values):
                cells = ''.join(f'<c r="{column}2" t="inlineStr"><is><t>{value}</t></is></c>' for column,value in values.items())
                return '<worksheet><sheetData><row/>'+f'<row>{cells}</row></sheetData></worksheet>'
            with zipfile.ZipFile(path, 'w') as z:
                z.writestr('xl/workbook.xml', '<workbook xmlns:r="urn:rel"><sheets><sheet name="Literature_Data" r:id="a"/><sheet name="首轮记录覆盖_逐篇" r:id="b"/><sheet name="Evidence" r:id="c"/></sheets></workbook>')
                z.writestr('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="a" Target="a.xml"/><Relationship Id="b" Target="b.xml"/><Relationship Id="c" Target="c.xml"/></Relationships>')
                z.writestr('xl/sharedStrings.xml', '<sst><si><t>Example study</t></si></sst>')
                z.writestr('xl/a.xml', row({'A':'Example study','B':'Author','C':'2023','D':'Unclear'}).replace('<c r="A2" t="inlineStr"><is><t>Example study</t></is></c>', '<c r="A2" t="s"><v>0</v></c>'))
                z.writestr('xl/b.xml', row({'A':'123','B':'Example study'}))
                z.writestr('xl/c.xml', row({'A':'123','B':'Wavelength_nm','C':'810','D':'Home','F':'I:/private/input.pdf 物理第2页 SHA256 abc','G':'Main_Text','H':'Direct','J':'Yes'}))
            result = read_workbook(path)
            self.assertEqual(result['papers'][0]['doi'], '')
            self.assertEqual(result['papers'][0]['groups']['Home'][0]['where'], 'PDF 第 2 页')
            self.assertNotIn('I:/private', json.dumps(result))
            target = Path(directory)/'index.json'
            reports = Path(directory)/'reports'
            args = [str(path), '--index', str(target), '--report-dir', str(reports)]
            with redirect_stdout(io.StringIO()):
                main(args)
            self.assertFalse(target.exists(), 'preview must not create the live index')
            with redirect_stdout(io.StringIO()):
                main([*args, '--apply'])
            self.assertEqual(json.loads(target.read_bytes()), result)
            edited = json.loads(target.read_bytes())
            edited['papers'][0]['groups']['Home'][0].update(value='850', source_note='人工修正')
            target.write_text(json.dumps(edited, ensure_ascii=False, indent=2), encoding='utf8')
            before = target.read_bytes()
            with redirect_stdout(io.StringIO()):
                main([*args, '--apply'])
            self.assertEqual(target.read_bytes(), before)
            last = json.loads(sorted(reports.glob('*/report.json'))[-1].read_bytes())
            self.assertEqual(last['conflicts'][0]['reason'], 'existing_field_differs')
            self.assertFalse(last['index_written'])


if __name__ == '__main__':
    unittest.main()
