# AGENTS.md · 给 Codex / AI 开发助手

## 不可改变的产品定位（用户已经明确纠正过一次）

**藏经阁的目标是“协作式科研文献库 + 结构化阅读笔记 + 研究知识沉淀”，不是正式科研团队官网。**

- 一级信息优先级：`典籍目录 > 研读札记 > 研究专题 > 知识关联（未来）`。
- 成员页、公开成果与团队背景只是**围绕知识生产和协作的次要栏目**。
- Cui Lab 仅用于参考 PI 单独展示、肖像网格、分组与详情页的布局，不可复制品牌/素材，也不可转化为以人员、新闻、招生为主的首页。
- 不要未经确认重设整个产品方向，更不要把导航变成 About / Research / Team / Publications 为主的实验室主页。

## 栈与成本

- Quarto + GitHub Pages；免费静态 MVP，初期由维护者编辑。
- v0.2 不接付费 API，不租服务器，不引入数据库或复杂前端框架。
- 数据从 `.qmd` 和 `data/people.json` 来，维护者/Codex 本地 `quarto render`，提交 `docs/`；GitHub Pages 从 `main /docs` 发布。
- GitHub PR 协作是维护内容，不是网站的用户身份管理。

## 成员资料与编辑约束

- 赵晨光：PI / 团队负责人。
- 李智林、贾海的公开资料已由 Hai 在前一轮明确要求核对并发布，本轮迁移到 `data/people.json`，保留来源；张龙、李铭浩仍仅确认姓名及成员角色。
- 所有成员照片尚未授权提供，继续使用文字占位。
- 不得自动从其他网站匹配相同姓名来补充研究经历或联系方式。只有确认其身份且本人同意公开后再发布。

**编辑成员只能修改 `data/people.json`**，不要手改 `people/*.qmd`。运行 `python scripts/build_people.py` 统一生成。

## 开发优先级

1. 让文献卡片和研读札记更加结构化、容易批量维护。
2. 完善主题体系、标签词表、笔记与文献的互相引用。
3. 保留公开与私有内容边界，未来再加入用户登录、私有 PDF 仓储。
4. 只有真实需要时，扩展本地 AI / RAG 与知识图谱。

## 开发和测试要求

```bash
python scripts/build_people.py
python scripts/validate.py
quarto render
```

如果环境没有 Quarto，前两项基础测试必须完成；正式渲染只能由本地或 Codex 的 Quarto 环境执行。不要宣称未经执行的渲染已通过。

### 修改网页须遵守

- 保持已存在的论文、笔记与五位成员页面。
- 页面在手机和电脑上都能阅读；尊重 CSS 减少动画、可访问性和语义结构。
- 新内容须有可追溯出处；不要虚构成员的成果、团队领域、引用数和文献数量。
- 不公开订阅 PDF、未发表数据、密钥及私人联系信息。
- `reference/` 是截图和视觉预览资料，不是 Quarto 正式源码。

## 重要文件

`_quarto.yml`（菜单和搜索） · `index.qmd`（知识导向首页） · `library/`（典籍） · `notes/`（札记） · `research/`（专题） · `data/people.json`（成员事实源） · `scripts/build_people.py`（成员页生成） · `scripts/build_site.py`（无 Actions 的本地构建） · `docs/`（必须提交的可发布页面） · `DEPLOY_NO_ACTIONS.md`（部署教程）。

## 不使用 GitHub Actions（用户明确要求，必须遵守）

- **禁止**创建任何 `.github/workflows/*.yml` / `.yaml` 文件。不要提议或恢复 GitHub Actions 构建、部署、PR 自动检查方案。
- 正式发布链路：`python scripts/build_site.py` → 提交整个 `docs/` → GitHub Pages Source: `Deploy from a branch`, `main`, `/docs`。
- 成员资料变更后必须重新执行构建脚本；不能假定向 GitHub 推送 `.qmd` 会自动生成 HTML。
- 官方静态托管平台的内部发布过程不等于本项目使用了自定义 Actions。
