# 藏经阁 v0.2｜不使用 GitHub Actions 的部署手册

## 本项目的实际配置

- 仓库：`Jaycob-jh/cangjingge`（项目站点）。
- 网站：`https://jaycob-jh.github.io/cangjingge/`。
- Pages：`Deploy from a branch` → `main` → `/docs`。
- 构建：`python scripts/build_site.py`，Quarto 1.10.18；本机便携版在 `.tools/quarto/`，不提交。
- 不创建、恢复或运行自定义 workflow。下文组织站点示例只用于新建部署，现有仓库无需改名。

## 前提
- 免费 GitHub 账号、公开仓库；推荐 `组织名/组织名.github.io`。
- 项目根目录含 `_quarto.yml`、`index.qmd`、`docs/`、`scripts/`，没有 `.github/workflows/`。
- 首次体验可以直接使用打包的 `docs/`；日常更新建议本地安装 [Quarto](https://quarto.org/docs/download/)。

## 第一次发布（直接发布包内 docs）

1. 创建公开的 `YOUR-ORG.github.io` 仓库，将包内的所有文件上传到仓库根目录。
2. GitHub 仓库 > `Settings` > `Pages`。
3. `Build and deployment` 的 Source 选 **Deploy from a branch**（不是 GitHub Actions）。
4. Branch 选 **main**，Folder 选 **/docs**，保存。
5. 首次发布成功后，站点是 `https://YOUR-ORG.github.io/`。

**不要只上传 `_quarto.yml` / `.qmd` 而漏掉 `docs/`**。Pages 不会为你运行 Quarto。

## 更新页面的本地命令

安装 Quarto 后（需 Python3）：

```bash
python scripts/build_site.py
# 成功后应有 docs/index.html、docs/.nojekyll
python scripts/verify_pages.py

git add .
git commit -m "Update Cangjingge archive"
git push origin main
```

脚本会先由 `data/people.json` 重新生成成员页，再执行基础校验，运行 Quarto 渲染到 `docs/`，最后创建 `.nojekyll` 并检查站内链接。

直接运行 `quarto render` 也可以，但请自行确认 `docs/.nojekyll` 存在，重新运行 `python scripts/verify_pages.py`。使用 `python scripts/build_site.py` 更稳妥。

## Codex 的工作方式

给 Codex 的首轮指令：

> 请读取 AGENTS.md 与 CODEX_START_HERE.md。禁止添加 GitHub Actions，保持藏经阁以文献、札记、专题为核心。先执行 python scripts/build_site.py，修复出现的 Quarto 渲染或静态链接问题。确定 docs/ 已生成且包含 .nojekyll，然后提交源码与 docs/。GitHub Pages 的 Source 为 Deploy from a branch，分支 main，目录 /docs。

## 常见问题

- **修改 `.qmd` 后网站不变**：尚未运行构建脚本或尚未提交 `docs/` 的更新。
- **Pages 404**：检查仓库名和组织名、Pages Source、main 分支、`docs/index.html`。
- **CSS 不生效**：确认 `docs/assets/styles.css` 存在；若是项目站点，检查相对路径。
- **站内某链接失效**：运行 `python scripts/verify_pages.py`，确认相对链接未跳出 docs 根目录。
- **站点能访问但源码不能直接显示**：GitHub Pages 只发布 `docs/` 里的静态 HTML，属于预期行为。
- **GitHub 的 Actions 页出现 Pages 任务**：GitHub 的 Pages 后台可能显示自身的内部部署运行记录，但你不需要创建或配置任何自定义 Actions 工作流。平台内部流程并不改变本项目的无 Actions 构建方式。

## 隐私和著作权

只发布获准公开的内容；不要提交内部文献全文、私人照片、邮箱、密钥或未发表成果。
