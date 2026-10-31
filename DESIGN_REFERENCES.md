# 开源项目参考与采用边界

核对日期：2026-11-01。下列项目仅作为内容组织和交互设计参考，本轮未安装其依赖或复制其源码。

| 项目 | 用途与维护证据 | 依赖与许可 | 本项目采用范围 |
|---|---|---|---|
| [Academic Digital Garden](https://github.com/rdesmartin/academic-digital-garden) | 论文笔记、BibTeX条目和反向链接；最近默认分支提交2026-06-08，未发现正式Release；仍有2023年的依赖更新PR待处理 | Jekyll/Ruby及插件；LICENSE声明MIT，GitHub自动识别为NOASSERTION | 参考“论文卡片—笔记—专题”的关联方式；保留Quarto，暂不迁移或自动导入BibTeX |
| [Quartz](https://github.com/jackyzha0/quartz) | Markdown知识库、搜索、反向链接；默认分支v5，最近默认分支提交2026-09-20；有2026-10更新的Issue/PR | MIT；Node >=22、npm >=10.9.2及多项插件 | 参考双向关联的阅读体验；本轮不引入图谱、Node站点框架或插件系统 |
| [RobertsLab](https://github.com/RobertsLab/lab-website) | Quarto条目元数据、Listing、README维护指南及main/docs发布；最近默认分支提交2026-10-31 | Quarto；仓库API未声明许可证 | 只参考内容目录与本地渲染/分支发布，不复制代码、成员素材或实验室首页结构 |

选择：保留现有Quarto + Python标准库。三项核心入口继续为典籍目录、研读札记、研究专题；成员和成果置于次级菜单。

资料入口：[Quarto分支发布说明](https://quarto.org/docs/publishing/github-pages.html)、[Academic Digital Garden README](https://github.com/rdesmartin/academic-digital-garden#readme)、[Quartz package.json](https://github.com/jackyzha0/quartz/blob/v5/package.json)、[RobertsLab维护指南](https://github.com/RobertsLab/lab-website/blob/main/README.md)。维护日期为本轮查询快照，不代表所有功能均已独立验证。
