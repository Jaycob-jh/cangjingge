# 参数查询回归

Excel导入前运行 `python scripts/tests/test_parameter_import.py`。默认预览：`python scripts/import_tpbm_parameters.py "<workbook.xlsx>"`；检查仓库外输出的 `report.json` 和 `preview.json`，需要追加时使用同一命令加 `--apply`。每次保留 `before.json`，没有内容变化时连原文件字节也不重写。报告目录可用 `--report-dir` 指定，必须在公开仓库外。

合并保留现有元数据、稳定ID、组别、显示名、数值、来源说明及核查状态；只追加新论文、新组或缺少的字段。已有字段的不同值、DOI/PMID身份冲突及仅题名疑似重复留在本地报告，不自动替换。现有组不继承其他组或文献层参数。阅读者页面不展示导入报告。

参数来源导出修改后运行 `python scripts/tests/test_parameter_provenance.py`。检查中英文页码、补充表行号、缓存范围、原试验与二次分析的区别，且不把本地路径和哈希导出。`source_review_required` 表示现有值仍需原文核对，与原有 `pending` 标记共同决定是否进入待核证据；不覆盖原核查标记。核清后按组、字段移除此附加标记，保留核查依据。

在项目根目录运行 `node scripts/tests/tpbm-query.mjs`。

研究卡或问题关联修改后运行 `python scripts/tests/test_tpbm_links.py`，检查两种单向关联都会被构建拒绝。正常数据由正式构建检查。

阅读入口修改后运行 `python scripts/tests/test_reading_links.py`，检查主文献 DOI、正式版/预印本、文中引用隔离及双向入口。多版本笔记在 front matter 中用 `doi:` 明确主版本；不改原有正文或版本链接。

覆盖具体脑区与侧别、中英文靶点、功率和时间单位换算、数值范围、DOI/PMID 及对照否定。使用与网页相同的纯函数模块，不另写一套解析逻辑。

这组检查不代替浏览器真实推理、缓存、筛选与移动端检查。页面修改后还须执行 `python scripts/build_site.py`，并验证生成的页面及导入模块。


免费证据检索修改后运行 `node scripts/tests/test_evidence.mjs`：区分实际测量与讨论提及、光衰减与症状减轻，不跨组拼参，保留比较条件并校验本地模型来源编号。DOI/PDF草稿修改后运行 `python scripts/tests/test_reading_draft.py`，检查题录冲突、原分类、页码、待核候选与人工编辑保护。

网页草稿运行 `node scripts/tests/test_browser_intake.mjs`；真实浏览器另查PDF本地提取（含中文）、JSON/QMD下载再导入、重复PDF、分类与人工字段保留及320–3840px布局。JSON草稿与含摘录材料只存仓库外。
