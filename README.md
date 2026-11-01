# 藏经阁 Cangjingge

> **核心产品：科研文献整理与知识沉淀平台**。不是“研究团队官网”。成员页面只是协作入口之一。
>
> 初期由一人维护、免费部署于 GitHub Pages；后续通过 Pull Request 邀请团队成员共建，真正的私有 PDF 仓储、登录、任务分配与 AI 功能在后续自建。

本轮学术化改版见 [v3执行记录](REVAMP_V3.md)，文风规范见 [CONTRIBUTING_STYLE.md](CONTRIBUTING_STYLE.md)。基础架构继续使用Quarto与main /docs发布。

## 当前项目与构建状态

- 网站：https://jaycob-jh.github.io/cangjingge/
- 仓库：https://github.com/Jaycob-jh/cangjingge
- 本地命令：`python scripts/build_site.py`；Pages：Deploy from a branch → `main /docs`。
- 本轮已执行正式 Quarto 1.10.18 构建；`docs/` 已由正式产物替换，不再使用包内快照。
- Windows 可使用项目本地 `.tools/quarto/bin/quarto.exe`，构建脚本会自动发现；该工具目录不提交到 Git。其他电脑可按官方说明安装 Quarto。
- 当前改版核验：[REVAMP_V3.md](REVAMP_V3.md)；v0.2构建核验：[BUILD_REPORT.md](BUILD_REPORT.md)；开源参考：[DESIGN_REFERENCES.md](DESIGN_REFERENCES.md)。

## 一眼看懂

- **主要入口**：典籍目录 → 研读札记 → 研究专题
- **协作支持**：共建者页面、公开成果、内容提交指南
- **已有演示数据**：一篇明确标记为“平台方法参考”的 OpenScholar 论文；一篇平台阅读规范。**不是团队成果**
- **团队成员**：赵晨光（PI）、李智林、贾海、张龙、李铭浩。其余个人资料未确认，不公开虚构信息
- **成本**：免费 Quarto + GitHub Pages；无需域名、付费 API 或数据库
- **功能边界**：不提供动态用户注册、私有 PDF 登录权限和 RAG（这些是后续独立模块）

## 第一次部署到 GitHub Pages（完全不配置自定义 GitHub Actions）

推荐仓库：公开的 `组织名.github.io`（组织名与仓库前缀一致）。**本项目没有 `.github/workflows/`，不依赖 GitHub Actions 进行网站构建。**

### 路线 A：先用压缩包内的 `docs/` 发布演示（无需安装 Quarto）

1. 创建 GitHub Organization（或先用个人账号），新建公开仓库 `组织名.github.io`。
2. 把压缩包中的**全部文件**上传到仓库根目录，包括 `docs/`，保持目录结构，不要额外嵌套文件夹。
3. 打开 `Settings → Pages → Build and deployment → Source`，选择 **Deploy from a branch**。
4. 选择 `main` 分支、`/docs` 目录并保存，等待 GitHub Pages 发布。
5. 访问 `https://组织名.github.io/`。当前 `docs/` 是本次打包附带的**初始静态快照**；首次运行 Quarto 将用正式渲染输出替换它。

### 路线 B：修改内容后正式构建（推荐）

在电脑或 Codex 的 Quarto 环境执行：

```bash
python scripts/build_site.py
# 脚本依次：生成成员页 → 基础校验 → quarto render → 写入 docs/.nojekyll → 校验静态链接

git add .
git commit -m "Update knowledge archive"
git push origin main
```

确保已安装 [Quarto CLI](https://quarto.org/docs/download/)；只需 Python 标准库，无需额外付费服务。Quarto 配置 `project.output-dir: docs`。**不要把 `docs/` 加入 `.gitignore`**。`docs/.nojekyll` 用于防止 GitHub Pages 再运行默认 Jekyll 构建。

> GitHub 官方仍可能在 Pages 发布历史中显示其平台**内部**的 Pages 部署流程。这与在仓库中创建或运行我们自己的 `.github/workflows/*.yml` 不同；项目本身不使用自定义 GitHub Actions。

详细操作见 [`DEPLOY_NO_ACTIONS.md`](DEPLOY_NO_ACTIONS.md)。

### 本地预览

```bash
python scripts/build_people.py
python scripts/validate.py
quarto preview
```

如果尚未安装 Quarto，压缩包里的 `docs/index.html` 也可以直接用浏览器打开查看静态快照。当前制作环境没有 Quarto CLI，因此**尚未执行正式 Quarto 渲染**；可通过 Codex 补做最终渲染验证。

## 更新什么文件？

| 目标 | 修改位置 | 说明 |
|---|---|---|
| 首页 / 内容优先级 | `index.qmd` | 保持典籍、札记、专题为首要入口 |
| 导航和搜索 | `_quarto.yml` | Quarto 自带站内搜索 |
| 视觉样式 | `assets/styles.css` | 不使用第三方付费字体或外部 CDN |
| **团队成员** | **`data/people.json`** | 唯一成员数据源，不直接修改 `people/*.qmd` |
| 成员页生成模板 | `scripts/build_people.py` | 运行后生成 `people/` 目录中的页面 |
| 新增文献 | `templates/paper.qmd` → `library/papers/` | 保存 DOI、作者、出处、版本 |
| 新增札记 | `templates/note.qmd` → `notes/posts/` | 证据与判断分开记录 |
| 新增专题 | `templates/research-topic.qmd` → `research/` | 在 `research/index.qmd` 增加专题索引链接 |
| 成员协作说明 | `join/index.qmd` | 当前采用 GitHub PR 审核发布 |

### 如何添加/修改成员

在 `data/people.json` 的 `members` 数组里增加或编辑一条。常用字段：

```json
{
  "id": "new-member",
  "name": "待确认姓名",
  "name_en": "",
  "group": "members",
  "position": "团队成员",
  "photo": "",
  "bio": "",
  "topics": [],
  "contributions": [],
  "research": [],
  "experience": [],
  "publications": [],
  "links": []
}
```

- `group` 可选 `pi`、`postdoc`、`graduate`、`assistant`、`members`、`alumni` 等。**只有得到真实职务后再修改分组**。
- `photo` 默认为空，使用清晰的文字占位；如经本人授权提供照片，将文件放入 `assets/people/` 并填写相对路径，例如 `assets/people/new-member.jpg`。
- `topics` 表示参与的公开研究专题，`contributions` 记录可核验的公开文献、札记或编目贡献；目前均为空。
- 修改成员数据后，运行 `python scripts/build_people.py`；修改后必须手动运行 `python scripts/build_site.py`，重新生成 `docs/` 并提交。
- `people/*.qmd` 是生成文件，直接修改会被下次生成覆盖。

详情见 [`data/PEOPLE_GUIDE.md`](data/PEOPLE_GUIDE.md)。

## 内容与安全边界

- 公共网站**仅展示有权公开的内容**，包括书目信息、公开的独立笔记和经许可的个人资料。
- 版权受限 PDF、未发表结果、内部会议记录、受保密要求限制的数据，不可上传到 Pages 公共仓库。
- 私有 Zotero 组库、已有机构授权资源或未来自建 Django + PostgreSQL + 文件存储是独立层，不由静态网站公开。
- GitHub 仓库邀请成员，只代表**维护内容**的权限，不是站内登录系统。

## 设计参考与边界

- [Cui Lab](https://cuilab.cibr.ac.cn/Team/index.htm)：**只借鉴成员分组、PI 单独展示与详情页层次**，没有使用其代码、照片、品牌或团队内容。
- [RobertsLab/lab-website](https://github.com/RobertsLab/lab-website)：Quarto 页面组织与团队数据维护思路。
- [Quarto Listings](https://quarto.org/docs/websites/website-listings.html)：文献和札记条目列表、筛选与分类。

藏经阁的主页、导航、知识流与数据模型独立设计，**不把它改成实验室宣传网站**。

## 验证和后续

- `python scripts/validate.py`：基础内容与站内链接检查。
- `python scripts/build_site.py`：本地或 Codex 执行 Quarto 渲染，并将静态站点写入可发布的 `docs/`。
- `docs/`：可直接发布的初始静态网页快照；首轮正式 Quarto 构建会覆盖。`reference/screenshots/` 保留原设计截图供 Codex 参考。
- `CODEX_START_HERE.md` 和 `AGENTS.md`：交给 Codex 的首要说明；`ROADMAP.md` 为后续能力计划。
