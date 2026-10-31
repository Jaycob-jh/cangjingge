#!/usr/bin/env python3
"""Check generated /docs HTML, assets and internal relative links (stdlib only)."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlparse
import sys
import json
import re
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.urls=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ('a','link') and a.get('href'): self.urls.append((tag,a['href']))
        if tag in ('img','script','iframe') and a.get('src'): self.urls.append((tag,a['src']))

def main():
    errors=[]
    pages=list(DOCS.rglob('*.html'))
    if not (DOCS/'index.html').is_file(): errors.append('缺少 docs/index.html')
    if not (DOCS/'.nojekyll').is_file(): errors.append('缺少 docs/.nojekyll')
    home = (DOCS/'index.html').read_text(encoding='utf-8') if (DOCS/'index.html').is_file() else ''
    if not re.search(r'<meta name="generator" content="quarto-', home):
        errors.append('docs/ 必须是正式 Quarto 构建产物，不能以静态快照代替')
    search = DOCS/'search.json'
    if not search.is_file():
        errors.append('缺少正式站内搜索索引 search.json')
    elif not json.loads(search.read_text(encoding='utf-8')):
        errors.append('站内搜索索引为空')
    for path in pages:
        parser=Links()
        text = path.read_text(encoding='utf-8')
        parser.feed(text)
        if path == DOCS/'index.html' or path.parent == DOCS/'people':
            if re.search(r'<pre[^>]*>\s*<code[^>]*>.*?&lt;(?:div|section|article|a)\b', text, re.S):
                errors.append(f'{path.relative_to(ROOT)} 将页面 HTML 错误渲染为代码块')
        for tag,url in parser.urls:
            u=urlparse(url)
            if u.scheme or u.netloc or url.startswith(('#','//','mailto:','data:','javascript:')): continue
            rel=unquote(u.path)
            if not rel: continue
            # GitHub Pages organization site root; absolute paths are checked against docs root
            dest=(DOCS/rel.lstrip('/')) if rel.startswith('/') else (path.parent/rel)
            if dest.is_dir(): dest=dest/'index.html'
            if not dest.exists(): errors.append(f'{path.relative_to(ROOT)} 中的 {tag} 链接无效：{url}')
    if errors:
        print('站点校验失败：\n'+'\n'.join(' - '+e for e in errors[:60]))
        sys.exit(1)
    print(f'站点链接验证通过：{len(pages)} 个 HTML 页面，docs/.nojekyll 已就绪。')
if __name__=='__main__': main()
