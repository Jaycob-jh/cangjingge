# 维护经颅光刺激研究对比与问题页

研究内容编辑 `data/tpbm-studies.json`，问题页编辑 `data/tpbm-questions.json`。网页底部的“修改”链接会打开相应的 GitHub 源文件。

每篇研究使用稳定的 `id` 和 DOI。`fields` 保存研究对象、设计、照射参数、对照与测量时间；`results` 保存结果；两者的 `source` 均指向该研究 `sources` 中的原文位置。图表优先链接原刊或 PMC 的图表锚点，PDF 使用页码。保留原文单位、剂量层级和实际阅读版本，不用推算值覆盖原文。

问题页的 `evidence` 通过研究 `id` 和来源编号引用研究，`takeaways` 写实验设计中需要考虑的具体事项。一篇研究可以属于多个问题。

`scripts/build_tpbm.py` 生成 `library/tpbm/`、`research/questions/`、问题目录、文字索引及公开 JSON。生成页面不单独手改；改源数据后运行：

```sh
python scripts/build_site.py
```

检查页面、原文定位和手机对比操作后，将源码与完整 `docs/` 一起提交。GitHub Pages 保持 `main /docs`，不使用 GitHub Actions。全文下载、个人阅读记录和核对日志保留在仓库外。

## 专题书目与每日荐读（2026-11-22）

五个专题的正文编辑 `research/topic-*.qmd`；论文列表编辑 `data/topic-literature.json`。列表优先用 `catalog_id` 关联既有书目；已有全文研究卡但尚无目录条目时可用 `study_id`。`context` 可说明细胞实验、测量方法或联合干预，避免把它们当作同一种经颅刺激。

先按规范 DOI（去前缀、空白并转小写）查重，再兼查 PMID 与规范题名。复用已有 ID，只追加缺少的专题关联，保留原分类、措辞和人工字段。书库“已读”标记不等于实际读到全文。

每日荐读、补全文及新证据整理应同时维护：论文笔记 → 专题列表 → 全文研究卡 → 问题页。只查到书目或摘要的论文可进专题列表；参数与结果核对全文后再进对比台，并带图表号或 PDF 物理页码、阅读版本和单位。未报告、版本冲突和待核参数明确记录，不用计算值覆盖原文。

`scripts/build_topic_literature.py` 只生成 `research/_topic-literature/*.md` 并补入缺少的 include，不改专题正文。生成的列表不可手改。正式发布仍运行 `python scripts/build_site.py`，核对五页检索、书目/笔记/原文链接、研究对比、手机与超宽屏，并提交完整 `docs/`。

私有“脑活动与脑网络”专题继续只存 Hai 的私人目录，不加入公共专题列表、仓库、站点资源或搜索索引。公开书目不携带账户来源、私有附件链接、个人批注和导入统计。
