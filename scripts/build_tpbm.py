"""Build sourced study cards and question pages from the public curation data."""
from pathlib import Path
import json
import shutil
from html import escape

ROOT = Path(__file__).resolve().parents[1]
LABELS = {'population':'研究对象','design':'研究设计','wavelength':'波长','mode':'连续光 / 脉冲','target':'照射位置','irradiance':'辐照度 / 功率','spot':'光斑','duration':'照射时间与疗程','dose':'剂量','control':'对照怎么做','readout':'观察指标','timing':'测量时间'}

def link(s, key):
    r = s['sources'][key]
    return f"[{r['label']}]({r['url']})"

def main():
    data = json.loads((ROOT/'data/tpbm-studies.json').read_text(encoding='utf8'))
    questions = json.loads((ROOT/'data/tpbm-questions.json').read_text(encoding='utf8'))
    studies = data['studies']
    assert len({s['id'] for s in studies}) == len(studies)
    assert len({s['doi'].lower() for s in studies}) == len(studies)
    byid = {s['id']:s for s in studies}
    qids = {q['id'] for q in questions}
    (ROOT/'library/tpbm').mkdir(exist_ok=True)
    (ROOT/'research/questions').mkdir(exist_ok=True)
    for s in studies:
        assert set(s['fields']) == set(LABELS), s['id']
        assert set(s['questions']) <= qids
        for item in [*s['fields'].values(), *s['results']]:
            assert item['source'] in s['sources'], s['id']
        assert all(x['url'].startswith('https://') for x in s['sources'].values())
        lines = ['---', 'title: '+json.dumps(s['title_zh'],ensure_ascii=False), 'toc: true', 'css: ../../assets/tpbm-study.css', '---', '',
            f"**{s['short']} · {s['kind']}**", '', s['title'], '',
            f"*{s['journal']}* · [DOI: {s['doi']}](https://doi.org/{s['doi']}) · [阅读全文]({s['fulltext']})", '',
            f"阅读范围：{s['reading']}。", '',
            f"[加入研究对比](../../research/tpbm-compare.html?selected={s['id']}) · [按问题读](../../research/tpbm-questions.qmd)", '',
            '## 怎么做', '', '```{=html}', '<dl class="tp-study-fields">']
        for key,label in LABELS.items():
            f=s['fields'][key]
            src=s['sources'][f['source']]
            lines.append(f'<div><dt>{escape(label)}</dt><dd>{escape(f["value"])}<br><a href="{escape(src["url"],quote=True)}" target="_blank" rel="noopener">{escape(src["label"])}</a></dd></div>')
        lines += ['</dl>', '```']
        lines += ['', '## 结果怎么看', '']
        for r in s['results']: lines += [f"- {r['text']}（{link(s,r['source'])}）"]
        lines += ['', '## 对实验设计有什么用', '', s['interpretation'], '', '## 接着读', '']
        for q in questions:
            if q['id'] in s['questions']: lines += [f"- [{q['title']}](../../research/questions/{q['id']}.qmd)"]
        lines += ['', '[修改这篇研究的整理](https://github.com/Jaycob-jh/cangjingge/edit/main/data/tpbm-studies.json)', '']
        (ROOT/f"library/tpbm/{s['id']}.qmd").write_text('\n'.join(lines),encoding='utf8')
    index = ['---','title: "经颅光刺激：按问题读"','toc: false','page-layout: full','---','','从一个实验问题出发，把经典研究和后续进展放在一起读。每篇研究保留原文方法、图表和参数。','','[打开研究对比台](tpbm-compare.qmd){.btn .btn-primary}','','::: {.zk-grid}']
    for q in questions:
        assert set(q['studies']) <= set(byid)
        index += ['::: {.zk-card}',f"### [{q['title']}](questions/{q['id']}.qmd)",q['intro'],':::','']
        lines=['---','title: '+json.dumps(q['title'],ensure_ascii=False),'toc: true','---','',q['answer'],'',f"[对比本页研究](../tpbm-compare.html?question={q['id']}) · [全部问题](../tpbm-questions.qmd)",'','## 把研究放在一起看','']
        for block in q['evidence']:
            s=byid[block['study']]
            lines += [f"### {s['short']}：{block['heading']}",'',block['text'],'',f"[研究参数与结果](../../library/tpbm/{s['id']}.qmd) · "+' · '.join(link(s,k) for k in block['sources']),'']
        lines += ['## 做实验时看什么','']+['- '+x for x in q['takeaways']]
        lines += ['','## 相关研究','']+[f"- [{byid[i]['short']}：{byid[i]['title_zh']}](../../library/tpbm/{i}.qmd)" for i in q['studies']]
        lines += ['','[修改这页内容](https://github.com/Jaycob-jh/cangjingge/edit/main/data/tpbm-questions.json)','']
        (ROOT/f"research/questions/{q['id']}.qmd").write_text('\n'.join(lines),encoding='utf8')
    index += [':::','']
    (ROOT/'research/tpbm-questions.qmd').write_text('\n'.join(index),encoding='utf8')
    (ROOT/'library/tpbm-index.md').write_text('\n'.join(f"- [{s['short']}：{s['title_zh']}](../library/tpbm/{s['id']}.qmd)" for s in sorted(studies,key=lambda s:s['year'],reverse=True))+'\n',encoding='utf8')
    shutil.copyfile(ROOT/'data/tpbm-studies.json',ROOT/'assets/tpbm-studies.json')
    print(f'TPBM: {len(studies)} sourced studies, {len(questions)} question pages')

if __name__ == '__main__': main()
