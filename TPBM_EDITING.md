# 维护经颅光刺激研究对比与问题页

研究内容编辑 `data/tpbm-studies.json`，问题页编辑 `data/tpbm-questions.json`。网页底部的“修改”链接会打开相应的 GitHub 源文件。

每篇研究使用稳定的 `id` 和 DOI。`fields` 保存研究对象、设计、照射参数、对照与测量时间；`results` 保存结果；两者的 `source` 均指向该研究 `sources` 中的原文位置。图表优先链接原刊或 PMC 的图表锚点，PDF 使用页码。保留原文单位、剂量层级和实际阅读版本，不用推算值覆盖原文。

问题页的 `evidence` 通过研究 `id` 和来源编号引用研究，`takeaways` 写实验设计中需要考虑的具体事项。一篇研究可以属于多个问题。

`scripts/build_tpbm.py` 生成 `library/tpbm/`、`research/questions/`、问题目录、文字索引及公开 JSON。生成页面不单独手改；改源数据后运行：

```sh
python scripts/build_site.py
```

检查页面、原文定位和手机对比操作后，将源码与完整 `docs/` 一起提交。GitHub Pages 保持 `main /docs`，不使用 GitHub Actions。全文下载、个人阅读记录和核对日志保留在仓库外。
