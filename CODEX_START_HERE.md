# 交给 Codex 的项目说明 · 从这里开始

## 这是什么？

这是“藏经阁”v0.1 的**完整可编辑网站源码**，基于 Quarto + GitHub Pages，目标为零新增付费服务、先由一人维护、日后邀请团队成员共同编辑。

你可在 Codex 中打开或解压本包后，把以下任务直接发送给 Codex：

> 请先阅读 `AGENTS.md`、`README.md` 和 `ROADMAP.md`，检查这个藏经阁 Quarto 网站的现有结构。先运行 `python scripts/validate.py`，环境允许时安装/调用 Quarto 并执行 `quarto render`。修复一切阻止 GitHub Pages 部署的问题，但保留现有中文内容、视觉风格、五位成员、原有链接与文献模板。不要编造成员履历或团队论文，不要引入任何付费服务。完成后给我明确的部署步骤和更改摘要。

## 源码在哪里？

本 ZIP 解压后**根目录就是项目根目录**：`_quarto.yml`、`index.qmd`、`people/`、`.github/workflows/publish.yml` 都在根目录。无须再进第二层源码文件夹。

- `AGENTS.md`：Codex 自动阅读的编码约束。
- `README.md`：从 GitHub 注册/建仓到发布的操作说明。
- `ROADMAP.md`：后续路线，不属于 v0.1 已实现功能。
- `reference/static-preview/index.html`：可直接用浏览器打开的静态视觉预览，**不是 Quarto 正式构建产物**。
- `reference/screenshots/`：首页、文献目录与手机端参考截图。

`reference/` 已写入 `.gitignore`，默认不会随着 `git add .` 上传到公开仓库。预览是参考资料，不要将其内容当作第二套需要维护的网站。

## 当前明确已实现

- 首页及研究专题导航
- 成员：赵晨光（PI）、李智林、贾海、张龙、李铭浩，均有独立资料页
- 文献目录模板与示例 OpenScholar 文献
- 阅读札记模板与示例
- Quarto 站内搜索（依赖正式构建）
- GitHub Actions 部署工作流

## 当前明确未实现

- 公共用户自行注册、私人账号与身份认证
- PDF 私有上传 / 文档管理后端
- 团队内部权限管理、任务看板、评论数据库
- AI 文献问答、向量检索、知识图谱

这些功能需要后续扩展，不要当成已上线的能力。

## 如何验证

```bash
python scripts/validate.py
quarto render
```

若本地没有 Quarto，基础验证脚本不依赖第三方 Python 库；正式 Quarto 构建仍需在有 Quarto 的环境（例如 GitHub Actions）完成。

## 如何部署

1. 在 GitHub 中创建组织（或个人账号下使用），创建 `账号.github.io` 的 Public 仓库。
2. 将本 ZIP 解压后的源码推送到仓库 **main** 分支。
3. GitHub `Settings → Pages → Build and deployment → Source` 选 **GitHub Actions**。
4. `Actions` 页查看 `Publish Zangjingge to GitHub Pages` 的构建和发布状态。
5. 成功后访问 `https://账号.github.io/`。

GitHub Pages 适用于公开学术门户，不是受保护的私有网站；请勿上传未授权的内部文件或 PDF。
