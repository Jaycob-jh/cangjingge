"""Read a workbook and preview or append missing parameters without replacing edits."""
import argparse
from copy import deepcopy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import tempfile
import unicodedata
import zipfile
import xml.etree.ElementTree as E
from literature_common import normalize_doi
from parameter_provenance import location, requires_original

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORTS = Path('I:/Agents-workspace/Outputs/cangjingge/parameter-import')


def doi(value):
    # The workbook uses values such as "Unclear" for DOI still to be checked.
    try:
        return normalize_doi(value)
    except ValueError:
        return ''

FIELDS=dict(Wavelength_nm='波长 · nm',Light_Source='光源',Power_mW='功率 · mW',Irradiance_mW_cm2='辐照度 · mW/cm²',Spot_Area_cm2='光斑 · cm²',Fluence_J_cm2='能量密度 · J/cm²',Total_Energy_J='能量 · J',Duration_min='时间 · 分钟（按原记录口径）',Total_Sessions='次数',Light_Mode='光模式',Pulse_Frequency_Hz='脉冲频率 · Hz',Duty_Cycle_pct='占空比 · %',Target='靶点',Cooling='冷却',Subject_Type='对象类型',Health_Status='健康状态',Measurement_Type='测量类别',Temperature_Measured='测温',Temperature_Location='测温位置',Max_Delta_T_C='最大温升 · °C',Mean_Delta_T_C='平均温升 · °C',Warmth_Reported='报告热感',Adverse_Event_Occurred='报告不良事件',Control_Type='对照',Sham_Method='假刺激方法')

def clean(s):
    return bool(s and len(s)<=200 and not re.search(r'https?://|@|SHA256|[A-Za-z]:[/\\]|\.pdf|[/\\].*[/\\]',s,re.I))

def norm(s):
    return re.sub(r'[^\w]+', ' ', unicodedata.normalize('NFKC', s).casefold()).strip()


def read_workbook(path, studies=()):
    with zipfile.ZipFile(path) as archive:
        def root(name):
            return E.fromstring(archive.read(name))
        rels = {n.get('Id'): n.get('Target') for n in root('xl/_rels/workbook.xml.rels')}
        sheets = {s.get('name'): rels[next(v for k, v in s.attrib.items() if k.endswith('}id'))]
                  for s in root('xl/workbook.xml').findall('.//{*}sheet')}
        shared = [''.join(t.text or '' for t in n.findall('.//{*}t'))
                  for n in root('xl/sharedStrings.xml')] if 'xl/sharedStrings.xml' in archive.namelist() else []
        def value(cell):
            raw = cell.findtext('{*}v', '')
            if cell.get('t') == 's':
                return shared[int(raw)]
            if cell.get('t') == 'inlineStr':
                return ''.join(t.text or '' for t in cell.findall('.//{*}t'))
            return raw
        def tab(name):
            target = sheets[name]
            target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            return [{re.match('[A-Z]+', c.get('r')).group(): value(c) for c in row}
                    for row in root(target).findall('.//{*}row')][1:]
        rows=tab('Literature_Data')
        coverage=tab('首轮记录覆盖_逐篇')
        assert rows and len(rows)==len(coverage)
        cards={doi(x['doi']):x['id'] for x in studies}
        papers={}
        for row,cv in zip(rows,coverage,strict=True):
            assert norm(row['A'])==norm(cv['B'])
            pmid=cv['A']
            assert pmid.isdecimal() and pmid not in papers
            d=doi(row.get('D',''))
            d=d if re.fullmatch(r'10\.\d{4,9}/[\w.()/;:+-]+',d) else ''
            papers[pmid]=dict(id=pmid,title=row['A'],author=row['B'],year=row['C'],doi=d,card=cards.get(d,''),groups={})
        for r in tab('Evidence'):
            pmid=r.get('A','').removeprefix('PMID:')
            field,value,group=(r.get(k,'').strip() for k in 'BCD')
            if pmid not in papers or field not in FIELDS or not clean(value):continue
            if value.casefold() in {'nr','na','nc','unclear','unknown','not reported'}:continue
            # A grouped row never inherits study-wide values or another group's values.
            if not group and re.search(r';|\b(?:group|arm)\s*:',value,re.I):continue
            if group and not clean(group):continue
            source=r.get('G','')
            item=dict(field=field,value=value,where=location(r.get('F',''),source),kind=r.get('H',''),pending=r.get('J')!='Yes' or source in ('Abstract','Metadata'))
            if requires_original(r.get('F',''),source) or not re.search(r'\d|§',item['where']):
                item['source_review_required']=True
            bucket=papers[pmid]['groups'].setdefault(group,[])
            if item not in bucket:bucket.append(item)
        assert any(x['groups'] for x in papers.values())
        payload=dict(topic='tpbm',fields=FIELDS,papers=list(papers.values()))
        return payload


def merge_parameters(existing, incoming):
    """Append missing papers, arms and fields; current content always wins."""
    result = deepcopy(existing)
    report = {'added_papers': [], 'added_groups': [], 'added_fields': [],
              'conflicts': [], 'existing_evidence_kept': 0}
    if existing.get('topic') != incoming.get('topic'):
        raise ValueError('Cannot merge different parameter topics')
    for field, label in incoming['fields'].items():
        result['fields'].setdefault(field, label)
    papers = result['papers']
    for paper in incoming['papers']:
        incoming_doi = doi(paper.get('doi', ''))
        by_id = [p for p in papers if p['id'] == paper['id']]
        by_doi = [p for p in papers if incoming_doi and doi(p.get('doi', '')) == incoming_doi]
        matches = [p for p in papers if p in by_id or p in by_doi]
        if len(matches) > 1:
            report['conflicts'].append({'id': paper['id'], 'reason': 'identifier_collision'})
            continue
        if not matches:
            same_title = [p for p in papers if norm(p['title']) == norm(paper['title'])]
            if same_title:
                report['conflicts'].append({'id': paper['id'], 'reason': 'title_duplicate_candidate',
                                            'existing_ids': [p['id'] for p in same_title]})
                continue
            papers.append(deepcopy(paper))
            report['added_papers'].append(paper['id'])
            continue
        current = matches[0]
        current_doi = doi(current.get('doi', ''))
        if incoming_doi and current_doi and incoming_doi != current_doi:
            report['conflicts'].append({'id': paper['id'], 'reason': 'doi_conflict',
                                        'existing_id': current['id']})
            continue
        # Metadata, display names and all current evidence attributes are kept.
        # A title/DOI metadata difference is a review item, not a silent update.
        if norm(current['title']) != norm(paper['title']):
            report['conflicts'].append({'id': current['id'], 'reason': 'title_difference'})
            continue
        for group, entries in paper['groups'].items():
            if group not in current['groups']:
                current['groups'][group] = deepcopy(entries)
                report['added_groups'].append({'id': current['id'], 'group': group})
                continue
            bucket = current['groups'][group]
            # Compare to the original bucket, so a genuinely missing field can
            # receive all its incoming readings without treating the second as a conflict.
            fields = {item['field'] for item in bucket}
            keys = {(item['field'], item['value'], item['kind']) for item in bucket}
            for item in entries:
                key = (item['field'], item['value'], item['kind'])
                if key in keys:
                    report['existing_evidence_kept'] += 1
                elif item['field'] in fields:
                    report['conflicts'].append({'id': current['id'], 'group': group,
                                                'field': item['field'], 'incoming_value': item['value'],
                                                'reason': 'existing_field_differs'})
                elif item not in bucket:
                    bucket.append(deepcopy(item))
                    report['added_fields'].append({'id': current['id'], 'group': group,
                                                   'field': item['field'], 'value': item['value']})
    return result, report


def write_if_unchanged(path, payload, expected):
    """Do not overwrite an edit made after the preview was calculated."""
    actual = path.read_bytes() if path.exists() else None
    if actual != expected:
        raise RuntimeError('Index changed during import; preview saved, current file retained')
    if actual is not None and json.loads(actual) == payload:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf8', newline='\n',
                                         dir=path.parent, suffix='.tmp', delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(payload, handle, ensure_ascii=False, separators=(',', ':'))
            handle.write('\n')
        # Check once more after preparing the file; a concurrent user edit wins.
        if (path.read_bytes() if path.exists() else None) != expected:
            raise RuntimeError('Index changed during import; current file retained')
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    return True


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--index', type=Path, default=ROOT/'assets/tpbm-parameters.json')
    parser.add_argument('--report-dir', type=Path, default=DEFAULT_REPORTS)
    parser.add_argument('--apply', action='store_true', help='Append missing data after saving preview and backup')
    args = parser.parse_args(argv)
    report_root = args.report_dir.resolve()
    if report_root.is_relative_to(ROOT):
        parser.error('Import reports contain maintenance data; save --report-dir outside the public repository')
    if not Path('I:/').is_dir():
        parser.error('I: is unavailable; no report or index was written')
    expected = args.index.read_bytes() if args.index.exists() else None
    studies = json.loads((ROOT/'data/tpbm-studies.json').read_bytes())['studies']
    incoming = read_workbook(args.workbook, studies)
    existing = json.loads(expected) if expected is not None else {'topic': incoming['topic'], 'fields': {}, 'papers': []}
    merged, report = merge_parameters(existing, incoming)
    destination = report_root / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S-%fZ')
    destination.mkdir(parents=True)
    if expected is not None:
        (destination/'before.json').write_bytes(expected)
    (destination/'preview.json').write_text(json.dumps(merged, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf8')
    report.update({'mode': 'apply' if args.apply else 'preview', 'changed': merged != existing,
                   'papers': len(merged['papers']), 'index_written': False})
    report_path = destination/'report.json'
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
    if args.apply:
        report['index_written'] = write_if_unchanged(args.index, merged, expected)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps({'report': str(report_path), 'mode': report['mode'], 'changed': report['changed'],
                      'index_written': report['index_written'], 'conflicts': len(report['conflicts'])}, ensure_ascii=False))


if __name__ == '__main__':
    main()
