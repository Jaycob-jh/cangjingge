# 藏经阁 Cangjingge · v0.1

> 零新增软件费用的团队学术门户。Quarto + GitHub Pages，支持五位初始成员资料页、公开文献目录、精读札记、站内搜索、分类筛选和未来团队协作。

**重要说明：** 这是可部署的公开静态网站 MVP，不是私有文献数据库。没有账号注册、PDF 私有上传和 RAG 问答。开发计划请见 `ROADMAP.md`。

## 当前站点

- 网站：https://jaycob-jh.github.io/cangjingge/
- 仓库：https://github.com/Jaycob-jh/cangjingge
- 名称统一使用 Cangjingge。成员资料来源见各自个人页。

## 已录入的团队成员

| 姓名 | 已确认角色 |
|---|---|
| 赵晨光 | PI / Principal Investigator |
| 李智林 | 博士后 |
| 贾海 | 博士研究生 |
| 张龙 | 团队成员（具体职务待补充） |
| 李铭浩 | 团队成员（具体职务待补充） |

不会推测成员的机构、学历、成果、研究方向、联系方式或照片；请经当事人同意后完善。

## 5 步上线到 GitHub Pages（不需要本地安装 Quarto）

### 第 1 步：创建 GitHub Organization（推荐）

1. 登录 GitHub，访问 <https://github.com/account/organizations/new>。
2. 选择适合的免费组织计划，创建一个未被占用的组织名，例如 `your-lab`。
3. 组织建立后，**公开**创建仓库，名称必须精确为 `your-lab.github.io`（把 `your-lab` 换成真实组织名）。
4. 如果暂时不创建组织，也可以在个人账号中创建 `你的用户名.github.io` 仓库。

> 组织名和 GitHub 用户名由 GitHub 校验是否可用。本项目**没有**替你创建任何线上仓库或邀请成员。

### 第 2 步：上传项目文件

把本压缩包中 `cangjingge/` 文件夹的**全部内容**放到仓库根目录；确保 `_quarto.yml` 与 `.github/workflows/publish.yml` 都在根目录相应位置。

推荐用 Git 命令（在电脑上解压后运行）：

```bash
cd cangjingge
git init
git branch -M main
git add .
git commit -m "Initial Cangjingge academic portal"
git remote add origin https://github.com/你的组织名/你的组织名.github.io.git
git push -u origin main
```

注意：不要把示例中的“你的组织名”原样运行。提交前可用 `python scripts/validate.py` 快速验证基础文件。

### 第 3 步：启用 Pages

仓库 → **Settings → Pages → Build and deployment → Source → GitHub Actions**。

本项目已自带 `.github/workflows/publish.yml`：push 到 `main` 后，GitHub 会自动安装 Quarto、生成 HTML 并发布，不需要云服务器、数据库或付费 API。

### 第 4 步：查看构建状态

仓库 → **Actions** → `Publish Cangjingge to GitHub Pages`。

首次上传如 Pages 尚未设置，完成步骤 3 后还可以在 Actions 页手动运行 `Run workflow`。

构建成功后访问：`https://你的组织名.github.io/`（个人仓库则是用户名）。

如果仓库名称不是 `组织名.github.io`，这是项目站点，地址通常会变成 `https://组织名.github.io/仓库名/`；本站相对路径设计能适应这两种部署路径。

### 第 5 步：修改内容

- 修改主页：`index.qmd`
- 修改导航和网站名称：`_quarto.yml`
- 修改样式：`assets/styles.css`
- 修改五位成员资料：`people/` 对应 `.qmd`
- 新增成员：复制 `templates/member.qmd` 到 `people/`，同时在 `people/index.qmd` 增加成员卡片
- 添加文献：复制 `templates/paper.qmd` 到 `library/papers/`，改名并填入真实数据
- 添加札记：复制 `templates/note.qmd` 到 `notes/posts/`，改名并填入内容
- 添加研究方向：复制 `templates/research-topic.qmd` 到 `research/`，并在 `research/index.qmd` 加链接
- 添加公开成果：修改 `publications/index.qmd`

只要保存并提交到 GitHub `main`，网页将自动构建更新。**文献目录与札记目录不需要手动添加索引链接**：Quarto Listing 自动生成列表、关键词过滤和分类筛选。

## 本地预览（可选）

安装免费开源的 [Quarto](https://quarto.org/docs/download/) 后：

```bash
quarto preview
```

或执行：

```bash
quarto render
python -m http.server 8000 --directory _site
```

浏览器访问 `http://localhost:8000`。

## 后续邀请成员协作

1. 组织 → **People → Invite member**，根据 GitHub 提示邀请团队成员。
2. 优先采用“创建分支 → Pull Request → 维护者审核 → 合并”的流程。
3. 个人履历与照片发布前取得当事人授权。
4. 保留独立私有仓库（例如 `research-library-private`）管理研究计划和内部笔记。**不要**将个人敏感信息、API Key、未公开实验记录或无权公开的订阅 PDF 放在公开仓库。
5. GitHub Pages 不提供用户登录或文件访问控制；后续如需“团队登录/上传私有 PDF/阅读任务”，再建设自建后端。

## 常见问题

**Q：为什么导入的 Zotero PDF 没直接上传到网站？**  
A：先保存 DOI、标题、作者和公开链接即可；订阅 PDF 的再传播可能受到许可限制。以后可以独立部署私有存储。

**Q：没有购买域名怎么办？**  
A：直接使用 GitHub Pages 免费二级域名即可。

**Q：GitHub Pages 登录功能在哪？**  
A：静态站点没有用户账户后端。GitHub 账号仅用于编辑仓库/提交 PR，不能直接变成站内的私有登录系统。

**Q：什么时候能把藏经阁做成内部平台？**  
A：出现真实团队协作需求后，再按 `ROADMAP.md` 的 P1/P2 阶段开发 Django + PostgreSQL / PDF.js 等模块。

## 成本与限制

- 源码：免费开源工具。GitHub Free 的公开仓库可使用 Pages；额度和服务条款以官方当前说明为准。
- 默认不购买服务器、域名、数据库托管、AI API。
- GitHub Actions/Pages 有使用配额和可接受使用政策；不要把网页当作大量 PDF 的网盘。
- 本仓库的自编模板与示例代码遵循 MIT 许可证；第三方项目、论文与资源保留原许可证。

## 参考文档

- Quarto 官方：<https://quarto.org/docs/websites/>
- Quarto GitHub Pages：<https://quarto.org/docs/publishing/github-pages.html>
- Quarto Listings：<https://quarto.org/docs/websites/website-listings.html>
- GitHub Pages 官方：<https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>
