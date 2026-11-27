"""Public locators extracted from workbook notes; never export the raw notes."""
import re


def legacy_location(text, source):
    """Old export format, retained only to recognize unedited imported fields."""
    parts = ['补充材料'] if source == 'Supplement' else []
    match = re.search(r'physical pp?\.\s*([\d,–— -]+)', text, re.I)
    if match:
        parts.append('PDF 第 ' + match[1].strip() + ' 页')
    parts.extend(dict.fromkeys(re.findall(r'(?:Table|Fig(?:ure)?\.?|表|图)\s*[Ss]?\d+[a-zA-Z]?', text, re.I)))
    return ' · '.join(parts) or {'Abstract': '摘要', 'Metadata': '题录', 'Main_Text': '正文', 'Table': '原文表格'}.get(source, '')


def location(text, source):
    # Extract only recognized coordinates. Raw text can contain private paths and hashes.
    parts = ['补充材料'] if source == 'Supplement' else []
    if re.search(r'缓存|搜索摘录', text):
        parts.append('缓存摘录')
    if '关联原试验' in text:
        parts.append('原试验')
    pages = re.search(r'(?:物理第|physical pp?\.\s*)([\d,、–— -]+)', text, re.I)
    if pages:
        parts.append('PDF 第 ' + pages[1].strip() + ' 页')
    printed = re.search(r'印刷(?:页|\s*p\.)\s*(约?\s*[\d–— -]+)', text, re.I)
    if printed:
        parts.append('印刷第 ' + printed[1].strip() + ' 页')
    for sheet in ('Summary_per_power', 'rawdata'):
        row = re.search(re.escape(sheet) + r'\s*第([\d–— -]+)行', text)
        if row:
            parts.append(sheet + ' 第 ' + row[1].strip() + ' 行')
    parts.extend(dict.fromkeys(re.findall(r'(?:Tables?|Fig(?:ure)?\.?|表|图)\s*[Ss]?\d+[a-zA-Z]?(?:[–—-][Ss]?\d+[a-zA-Z]?)?', text, re.I)))
    if source == 'Abstract' or re.search(r'\bAbstract\b', text, re.I):
        parts.append('摘要')
    if source == 'Metadata' or '日期元数据' in text:
        parts.append('题录')
    return ' · '.join(dict.fromkeys(parts)) or {'Main_Text': '正文', 'Table': '原文表格'}.get(source, '')


def requires_original(text, source):
    """An imported confirmed flag alone cannot turn cached snippets into full text."""
    return source in {'Abstract', 'Metadata'} or bool(re.search(r'缓存|搜索摘录|日期元数据|\bAbstract\b', text, re.I))


def matching_sources(item, rows):
    """Rows must already match paper, arm, field, value and kind.

    Equal values from a cached source and a PDF can coexist. Resolve the
    *displayed locator*, rather than assigning one status to both records.
    Unknown (possibly hand-edited) locators are left for manual reconciliation.
    """
    return [row for row in rows
            if legacy_location(row.get('F', ''), row.get('G', '')) == item['where']]
