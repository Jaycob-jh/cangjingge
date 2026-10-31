#!/usr/bin/env python3
"""Generate Quarto team/profile pages from a single human-editable JSON file.

No network, paid services, or third-party Python dependencies are needed.
Run `python scripts/build_people.py` before `quarto render`.
"""
from __future__ import annotations

import html
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'people.json'
OUT = ROOT / 'people'

def esc(text: str) -> str:
    return html.escape(str(text), quote=True)

def yaml_string(text: str) -> str:
    return json.dumps(text, ensure_ascii=False)

def frontmatter(title: str, subtitle: str) -> str:
    return f'---\ntitle: {yaml_string(title)}\nsubtitle: {yaml_string(subtitle)}\ntoc: false\npage-layout: custom\ntitle-block-banner: false\nanchor-sections: false\n---\n\n'

def portrait(member: dict, *, large: bool = False, prefix: str = '../') -> str:
    name = esc(member['name'])
    photo = member.get('photo', '')
    cls = 'zk-portrait is-large' if large else 'zk-portrait'
    if photo:
        image = ROOT / photo
        if not image.is_file():
            raise ValueError(f"照片路径不存在：{photo}")
        if not photo.startswith('assets/people/') or '..' in Path(photo).parts:
            raise ValueError(f"照片必须存放在 assets/people/：{photo}")
        return f'<div class="{cls} has-photo"><img src="{prefix}{esc(photo)}" alt="{name}的成员照片" loading="lazy"></div>'
    # Distinct from real photographs: a typographic placeholder until permission is granted.
    initial = name[:1]
    return (f'<div class="{cls} is-placeholder" aria-label="{name}：尚未上传本人授权照片">'
            f'<span class="zk-portrait-monogram" aria-hidden="true">{initial}</span>'
            f'<span class="zk-portrait-caption">PHOTO PENDING</span></div>')

def render_items(items: list, empty: str) -> str:
    if not items:
        return f'<p class="zk-field-pending">{esc(empty)}</p>'
    return '<ul class="zk-profile-list">' + ''.join(f'<li>{esc(x)}</li>' for x in items) + '</ul>'

def optional_profile_sections(member: dict) -> str:
    """Keep the knowledge-contribution profile concise until details are confirmed."""
    sections = [
        ("03 / INTERESTS", "研究兴趣", member.get('research', [])),
        ("04 / BACKGROUND", "教育与科研经历", member.get('experience', [])),
        ("05 / PUBLICATIONS", "公开成果", member.get('publications', [])),
    ]
    out = []
    for marker, title, items in sections:
        if items:
            out.append(f'<section class="zk-profile-section"><span class="zk-eyebrow">{marker}</span><h2>{title}</h2>{render_items(items, "")}</section>')
    if member.get('links'):
        out.append(f'<section class="zk-profile-section"><span class="zk-eyebrow">06 / LINKS</span><h2>学术链接</h2>{render_links(member)}</section>')
    return "\n".join(out)

def profile_page(member: dict, group: dict) -> str:
    name, slug = esc(member['name']), member['id']
    pos = esc(member['position'])
    en = esc(member.get('name_en') or '')
    bio = esc(member.get('bio') or '个人简介待本人确认后发布。')
    photo = portrait(member, large=True)
    position_head = esc(group['subtitle'])
    about = f'''<div class="zk-profile-page zk-wide">
<nav class="zk-crumb" aria-label="面包屑"><a href="index.html">团队成员</a><span>/</span><span>{name}</span></nav>
<header class="zk-profile-hero">
  {photo}
  <div class="zk-profile-intro">
    <span class="zk-eyebrow">KNOWLEDGE CONTRIBUTORS / {position_head}</span>
    <h1>{name}</h1>
    {f'<p class="zk-profile-name-en">{en}</p>' if en else ''}
    <p class="zk-profile-position">{pos}</p>
    <div class="zk-profile-divider"></div>
    <p class="zk-profile-summary">{bio}</p>
    <a class="zk-text-link" href="index.html">← 返回团队成员</a>
  </div>
</header>
<div class="zk-profile-sections">
<section class="zk-profile-section"><span class="zk-eyebrow">01 / TOPICS</span><h2>参与的知识专题</h2>{render_items(member.get('topics', []), '已建立个人资料页，参与专题待维护者或本人补充。')}</section>
<section class="zk-profile-section"><span class="zk-eyebrow">02 / CONTRIBUTIONS</span><h2>文献整理与札记</h2>{render_items(member.get('contributions', []), '文献编目、研读札记与专题维护记录待补充。')}</section>
{optional_profile_sections(member)}
</div>
<div class="zk-profile-notice">资料依据已授权的公开来源整理；原始出处见学术链接，后续更新由本人或维护者核对。</div>
</div>'''
    return frontmatter(member['name'], member['position']) + '```{=html}\n' + about + '\n```\n'

def render_links(member: dict) -> str:
    links = member.get('links', [])
    if not links:
        return '<p class="zk-field-pending">ORCID、个人主页及其他联系方式待补充。</p>'
    out = []
    for link in links:
        url = str(link.get('url', ''))
        if not (url.startswith('https://') or url.startswith('mailto:')):
            raise ValueError('成员链接仅支持 https:// 或 mailto:')
        out.append(f'<li><a href="{esc(url)}" rel="noopener noreferrer">{esc(link.get("label", url))} ↗</a></li>')
    return '<ul class="zk-profile-list">'+''.join(out)+'</ul>'

def person_card(member: dict) -> str:
    slug = member['id']
    name = esc(member['name'])
    pos = esc(member['position'])
    return f'''<a href="{slug}.html" class="zk-member-card" aria-label="查看{name}的个人主页">
  {portrait(member)}
  <div class="zk-member-meta"><h3>{name}<span class="zk-member-arrow" aria-hidden="true">↗</span></h3><p>{pos}</p></div>
</a>'''

def main() -> None:
    data = json.loads(DATA.read_text(encoding='utf-8'))
    groups = {g['id']: g for g in data['groups']}
    members = data['members']
    if len({m['id'] for m in members}) != len(members):
        raise ValueError('成员 slug 不得重复')
    for member in members:
        if not re.fullmatch(r'[a-z][a-z0-9-]*', member['id']):
            raise ValueError(f'无效的成员标识：{member["id"]}')
        if member['group'] not in groups:
            raise ValueError(f'未知成员分组：{member["group"]}')
    pi = [m for m in members if m['group'] == 'pi']
    if not pi:
        raise ValueError('至少需要一名 PI')
    html_parts = [
        '<div class="zk-team-page zk-wide">',
        '<header class="zk-team-heading">',
        '  <span class="zk-eyebrow">OUR PEOPLE / 团队成员</span>',
        '  <h1>共建者，让知识持续生长。</h1>',
        '  <p>每位成员可以认领研究专题、维护文献索引、分享研读札记，让知识成果及其贡献长期可追溯。个人履历与其他信息经本人确认后再补充。</p>',
        f'  <div class="zk-team-count"><strong>{len(members):02}</strong><span>FOUNDING MEMBERS / 初始成员</span></div>',
        '</header>',
        '<section class="zk-team-group" aria-label="课题组负责人">',
        '<div class="zk-group-heading"><div><span class="zk-eyebrow">01 / LEADERSHIP</span><h2>课题组负责人</h2></div><span class="zk-group-en">Principal Investigator</span></div>',
    ]
    for m in pi:
        html_parts.extend([
            '<a class="zk-pi-feature" href="'+m['id']+'.html">',
            '  <div class="zk-pi-media">'+portrait(m,large=True)+'</div>',
            '  <div class="zk-pi-copy"><span class="zk-pi-overline">PRINCIPAL INVESTIGATOR</span>',
            '  <h3>'+esc(m['name'])+'</h3>',
            '  <p class="zk-pi-position">'+esc(m['position'])+'</p>',
            '  <p class="zk-pi-summary">'+esc(m.get('bio') or '个人简介、研究方向及学术履历将在确认后更新。')+'</p>',
            '  <span class="zk-pi-link">查看个人主页 <span aria-hidden="true">↗</span></span></div>',
            '</a>',
        ])
    html_parts.append('</section>')
    idx = 2
    for group_id, group in groups.items():
        if group_id == 'pi':
            continue
        items = [m for m in members if m['group'] == group_id]
        if not items:
            continue
        html_parts.extend([
            f'<section class="zk-team-group" aria-label="{esc(group["title"])}">',
            f'<div class="zk-group-heading"><div><span class="zk-eyebrow">{idx:02} / PEOPLE</span><h2>{esc(group["title"])}</h2></div><span class="zk-group-en">{esc(group["subtitle"])}</span></div>',
            '<div class="zk-team-portrait-grid">',
            *(person_card(m) for m in items),
            '</div></section>',
        ])
        idx += 1
    html_parts.extend([
        '<div class="zk-team-bottom">',
        '  <div><span class="zk-eyebrow">CONTRIBUTE TO THE ARCHIVE</span><h2>收录文献、研读证据、共建专题</h2><p>团队成员未来可通过 GitHub 提交公开书目、札记与专题页面；未公开科研材料仍保存在私有空间。</p></div>',
        '  <a class="zk-outline-link" href="../join/">共建指南 <span aria-hidden="true">↗</span></a>',
        '</div>',
        '<p class="zk-team-disclaimer">成员信息按已授权的公开资料维护，来源见个人页；尚未提供照片的成员使用文字占位。</p>',
        '</div>',
    ])
    OUT.mkdir(exist_ok=True)
    (OUT / 'index.qmd').write_text(frontmatter('阁中学人', 'People · 知识共建者')+'```{=html}\n'+'\n'.join(html_parts)+'\n```\n',encoding='utf-8')
    for member in members:
        (OUT / f"{member['id']}.qmd").write_text(profile_page(member, groups[member['group']]),encoding='utf-8')
    print(f'已由 data/people.json 生成 {len(members)} 份成员页 + 团队目录')

if __name__ == '__main__':
    main()
