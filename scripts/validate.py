#!/usr/bin/env python3
"""Basic content and link validation. Standard library only; no Quarto needed."""
from __future__ import annotations
from pathlib import Path
import re
import sys
import json

ROOT = Path(__file__).resolve().parents[1]
# Validate authored content only, not portable tools or generated output.
files = [ROOT / 'index.qmd']
for folder in ('people', 'research', 'library', 'notes', 'publications', 'join', 'templates'):
    files.extend((ROOT / folder).rglob('*.qmd'))
errors = []
expected = {"赵晨光", "李智林", "贾海", "张龙", "李铭浩"}
people_data = json.loads((ROOT / 'data' / 'people.json').read_text(encoding='utf-8'))
people = (ROOT / 'people' / 'index.qmd').read_text(encoding='utf-8')
if not set(expected).issubset({member['name'] for member in people_data['members']}):
    errors.append('data/people.json 缺少最初五位成员')
for member in people_data['members']:
    member_file = ROOT / 'people' / (member['id'] + '.qmd')
    if not member_file.is_file():
        errors.append(f"缺少生成后的成员资料页：{member['id']}")
    elif member['name'] not in member_file.read_text(encoding='utf-8'):
        errors.append(f"成员资料页内容不一致：{member['id']}")
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

for path in ['_quarto.yml', 'assets/styles.css', 'assets/favicon.svg', 'data/people.json', 'scripts/build_people.py']:
    if not (ROOT / path).is_file():
        errors.append(f"缺少必要文件：{path}")
# Project explicitly forbids authored GitHub Actions workflows.
if list((ROOT / '.github' / 'workflows').glob('*.yml')) or list((ROOT / '.github' / 'workflows').glob('*.yaml')):
    errors.append('项目要求不使用 GitHub Actions，请删除 .github/workflows 中的工作流')
quarto_yml = (ROOT / '_quarto.yml').read_text(encoding='utf-8')
if 'output-dir: docs' not in quarto_yml:
    errors.append('Quarto 输出目录必须为 docs，以便从 main /docs 分支部署')
if (ROOT / 'docs').is_dir() and not (ROOT / 'docs' / '.nojekyll').exists():
    errors.append('docs/.nojekyll 必须存在，以禁用 Pages 默认 Jekyll 构建')
if errors:
    print('验证失败：')
    for err in errors:
        print(' -', err)
    sys.exit(1)
print(f'基础验证通过：{len(files)} 个 QMD 页面、{len(people_data["members"])} 位成员、站内链接与关键文件。')
