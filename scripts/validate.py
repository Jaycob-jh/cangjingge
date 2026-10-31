#!/usr/bin/env python3
"""Basic content and link validation. Standard library only; no Quarto needed."""
from __future__ import annotations
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
files = list(ROOT.rglob('*.qmd'))
errors = []
expected = {"赵晨光", "李智林", "贾海", "张龙", "李铭浩"}
people = (ROOT / 'people' / 'index.qmd').read_text(encoding='utf-8')
missing = expected - {name for name in expected if name in people}
if missing:
    errors.append(f"成员索引缺少：{', '.join(missing)}")
for file in files:
    text = file.read_text(encoding='utf-8')
    if not text.startswith('---\n') or '\n---\n' not in text[4:]:
        errors.append(f"缺失 YAML 前置信息：{file.relative_to(ROOT)}")
    # Verify Markdown links to local .qmd files.
    for dest in re.findall(r'\]\(([^)]+\.qmd)(?:#[^)]*)?\)', text):
        target = (file.parent / dest).resolve()
        if not target.is_file():
            errors.append(f"断开的 QMD 链接：{file.relative_to(ROOT)} -> {dest}")
    # Verify raw HTML href links to local .html/ directory pages.
    for href in re.findall(r'href="([^"]+)"', text):
        if href.startswith(('https://','http://','#','mailto:')):
            continue
        if href.endswith('/'):
            target = (file.parent / href / 'index.qmd').resolve()
        elif href.endswith('.html'):
            target = (file.parent / href.removesuffix('.html')).with_suffix('.qmd').resolve()
        else:
            continue
        if not target.exists():
            errors.append(f"断开的站内链接：{file.relative_to(ROOT)} -> {href}")

for path in ['_quarto.yml', '.github/workflows/publish.yml', 'assets/styles.css', 'assets/favicon.svg']:
    if not (ROOT / path).is_file():
        errors.append(f"缺少必要文件：{path}")
if errors:
    print('验证失败：')
    for err in errors:
        print(' -', err)
    sys.exit(1)
print(f'基础验证通过：{len(files)} 个 QMD 页面、5 位初始成员、站内链接与关键文件。')
