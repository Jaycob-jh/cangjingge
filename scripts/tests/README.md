# 参数查询回归

在项目根目录运行 `node scripts/tests/tpbm-query.mjs`。

研究卡或问题关联修改后运行 `python scripts/tests/test_tpbm_links.py`，检查两种单向关联都会被构建拒绝。正常数据由正式构建检查。

覆盖具体脑区与侧别、中英文靶点、功率和时间单位换算、数值范围、DOI/PMID 及对照否定。使用与网页相同的纯函数模块，不另写一套解析逻辑。

这组检查不代替浏览器真实推理、缓存、筛选与移动端检查。页面修改后还须执行 `python scripts/build_site.py`，并验证生成的页面及导入模块。
