# Codex：从这里开始 · 藏经阁 v0.2

请按顺序阅读：`AGENTS.md` → `README.md` → `ROADMAP.md`。

## 请先理解用户的核心需求

本项目不是要建一座科研团队官网。它是一座**以文献目录、研读札记、研究专题与知识积累为中心的“藏经阁”**。公开成员页是协作支撑信息；团队主页模板只能参考其布局，不能反过来决定产品定位。

## 立即要做的事情

1. 检查 `_quarto.yml`、首页 `index.qmd`、`assets/styles.css` 与 `people/` 展示是否完整。
2. 运行 `python scripts/build_people.py`、`python scripts/validate.py`。
3. 如果可安装或使用 Quarto，请运行 `python scripts/build_site.py`，修复正式构建问题，并验证 GitHub Pages 的相对链接、导航、搜索、列表筛选。
4. 保留文献、笔记、研究专题作为一级入口；不要为了模仿 Cui Lab 重做导航。
5. 以后新增成员信息，只编辑 `data/people.json`，确认本人授权后加入照片及履历。

## 推荐直接粘贴给 Codex 的任务

> 请以当前仓库为基础继续开发，不要从零重写。产品定位是科研文献整理与知识沉淀平台“藏经阁”，不是实验室官网。保持首页“典籍目录—研读札记—研究专题”的优先级，成员展示仅借鉴 Cui Lab 的 PI 独立卡片和分组人物矩阵。请先运行 `python scripts/build_site.py`，修复构建/站内链接问题，并将输出写入 `docs/`，校验 `docs/.nojekyll`，完成桌面和移动端验收。所有信息严格以现有资料为准，不虚构团队成员身份或成果，不引入任何付费服务。完成后汇报实际测试结果与后续改进建议。

## 当前范围说明

- 已实现：Quarto 静态首页、Quarto 文献/笔记 Listing、专题容器、成员自动生成、GitHub Pages 分支托管（`main /docs`）。
- 未实现：用户注册、私有 PDF 上传、动态知识图谱、RAG 问答。
- 项目版本为 v0.2，`docs/` 当前是可发布的初始静态快照，不是 Quarto 的真实构建产物。

## 部署硬约束（最新用户要求）

**禁止使用自定义 GitHub Actions 工作流。** 不得创建 `.github/workflows/`，不得把发布源设置成 `GitHub Actions`。

网站必须支持：Quarto 输出 `docs/` → `git add docs`、提交并推送 → GitHub `Settings → Pages → Deploy from a branch → main /docs`。

请阅读 [`DEPLOY_NO_ACTIONS.md`](DEPLOY_NO_ACTIONS.md)。当前 `docs/` 含一个本次打包的初始静态快照；请运行 `python scripts/build_site.py` 用正式 Quarto 生成物覆盖它，并校验成功后再提交。若 Quarto 无法获取，请如实标注未验证，不要恢复 Actions。
