# Codex 开发指南 · 藏经阁 Cangjingge

> 本文件是 AI 编程助手接手本仓库时的项目约束。请先阅读 `CODEX_START_HERE.md`、`README.md` 与 `ROADMAP.md`。

## 项目定位与当前范围

- 这是一个 **Quarto + GitHub Pages 的免费静态学术团队门户**，而非后端文献管理平台。
- 初期由一位维护者管理，未来通过 GitHub Organization + Pull Request 邀请成员参与。
- v0.1 只应有公开内容：团队首页、成员资料、研究方向、文献索引、阅读笔记、团队成果和加入方式。
- 不要未经明确需求就引入收费云服务、付费 AI API、登录后端、私有 PDF 管理或大型前端框架。

## 团队成员（唯一已确认信息）

| 姓名 | 角色 |
| --- | --- |
| 赵晨光 | PI / Principal Investigator |
| 李智林 | 博士后 |
| 贾海 | 博士研究生 |
| 张龙 | 团队成员，具体职务待补充 |
| 李铭浩 | 团队成员，具体职务待补充 |

**严禁编造**成员所在单位、研究方向、学位、头像、联系地址和论文成果。示例论文 OpenScholar 仅用于演示文献卡片，不是团队发表成果。

## 文件职责

- `_quarto.yml`：菜单、搜索、站点基础配置。
- `index.qmd`：首页。
- `people/`：五位成员个人页及目录。
- `research/`：研究方向。
- `library/`：文献索引与单篇文献内容，引用 DOI，不传播未经授权的 PDF。
- `notes/`：阅读札记。
- `publications/`：团队成果（当前未填充未经确认的成果）。
- `join/`：协作入口。
- `templates/`：添加论文、笔记、专题、成员的可复制模板。
- `assets/styles.css`：主要视觉样式。
- `.github/workflows/publish.yml`：Quarto 自动发布到 GitHub Pages。
- `reference/`：供 AI 与维护者参照的静态预览/截图，**不是正式网站源代码**，且已由 `.gitignore` 排除，勿作为构建入口。

## 工作要求

1. 优先小范围修改，保留现有数据与页面导航；不要为了重构而删除模板。
2. 每次改动后运行 `python scripts/validate.py`。
3. 如果 Quarto 可用，再运行 `quarto render` 并检查 `_site/`；本项目 CI 会在 GitHub Actions 上运行正式构建。
4. 不要将 API Key、密钥、邮箱、未发表数据、研究组内部文档、订阅 PDF 等添加到公开文件。
5. 网站应能部署到 `https://<账号或组织名>.github.io/`，最好保留对 GitHub 项目子路径的兼容。
6. 增加文献请保持可追溯出处（DOI/原文链接/元数据来源），不得把他人成果列为团队出版物。
7. 修改 CSS 时检查桌面与移动端；保持页面中文阅读效果、可用性和无障碍可访问性。
8. 如果某项需求依赖账号登录或数据库，请单独提出后续架构方案，不要在静态站点上伪装成可用的私有功能。

## 适合 Codex 的第一批任务

- 校验和修复 GitHub Pages 构建流程；构建后检查链接、站内搜索与 Listing。
- 改进“文献卡片”模板，让 DOI、摘要、关键证据、标签更加结构化。
- 将站点名称、社交链接、导航项做成更容易配置的字段。
- 提供成员增加/更新流程（GitHub PR），但不要增加虚构资料。

## 常用命令

```bash
python scripts/validate.py
quarto render
quarto preview
```
