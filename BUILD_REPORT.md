# v0.2 本地构建与验收记录

日期：2026-11-01。

## 已修改

- 导入Hai提供的v0.2包，保持“典籍目录 > 研读札记 > 研究专题”的导航层次，成员与成果放在次级菜单。
- 删除原`.github/workflows/publish.yml`，不增加任何自定义workflow。构建改为`python scripts/build_site.py`，静态产物提交`docs/`，Pages源设为main /docs。
- 修复首页与成员生成器中缩进HTML被Pandoc误当代码的问题，HTML模板改用明确的raw HTML块。
- 自定义封面使用Quarto custom布局；索引栏保留complementary语义，避免aside被Quarto当作文章边注放入额外网格列。
- 中文语言标识改为`zh`，正式HTML输出为`zh-Hans`，消除Pandoc翻译文件警告。依据：[Quarto官方问题记录](https://github.com/quarto-dev/quarto-cli/issues/14416)。
- 增加键盘焦点样式、减少动画偏好及长文本换行；保留现有色彩与核心栏目。
- 上轮已授权公开的三位成员资料迁入`data/people.json`，保留出处；只通过JSON维护成员，未新增照片或私密信息。
- 文献示例与阅读规范增加互相链接及专题索引入口。未虚构真实研究专题或论文精读成果。
- 校验仅扫描项目内容目录；新增正式Quarto产物、搜索索引及HTML误显示为代码的检查，避免将包内快照误记为正式构建。

## 验证证据

| 项目 | 结果 |
|---|---|
| 本地构建命令 | `python scripts/build_site.py` 成功退出 |
| 运行环境 | Windows；Python 3.14；Quarto 1.10.18便携版 |
| 工具来源 | quarto-dev/quarto-cli 官方v1.10.18发布包，SHA-256与发布校验文件一致 |
| Quarto ZIP SHA-256 | `4e824652ff0da3f646868277582ed59c0872d1456e35350b7d7cdc4243ee18c2` |
| 源码验证 | 18份QMD（含模板）、5位成员、核心文件和站内链接通过 |
| 正式渲染 | 14个HTML页面，`docs/.nojekyll`和`docs/search.json`生成，最终构建日志无警告 |
| 静态链接与资源 | `python scripts/verify_pages.py`通过全部14页 |
| 响应式 | Playwright Chromium，320/390/768/1440宽度，各检查首页、文献目录/详情、札记目录/详情、专题目录、成员目录/详情，共32项通过，无横向页面溢出、无HTML误显示为代码 |
| 手机导航 | 390宽度展开菜单后，点击典籍目录可进入对应页面 |
| 站内搜索 | OpenScholar查询返回文献卡片及章节结果 |
| 文献筛选 | 输入无匹配词后条目隐藏，输入Asai后条目恢复；使用实际键盘事件触发Quarto原生筛选 |
| 控制台 | 测试会话无错误或警告 |

浏览器检查使用Playwright skill，仅用于验收与定位页面问题，没有引入前端依赖。

## 未修改与边界

不增加登录、数据库、PDF仓储、RAG或知识图谱；不改变项目定位。研究专题保持待填充状态，现有1篇文献示例与1篇平台阅读规范不冒充团队科研成果。成员头像仍为文字占位。

## 后续维护

修改`.qmd`或`data/people.json` → 执行`python scripts/build_site.py` → 提交源码和整个`docs/` → push到main。GitHub仅发布预构建的docs，不代运行Quarto。

开源参考、许可和采用边界见[DESIGN_REFERENCES.md](DESIGN_REFERENCES.md)。本轮只借鉴组织与交互方式，未复制第三方源码或安装其依赖。
