# v3 学术化改版执行记录

输入：Hai提供的cangjingge_academic_revamp_kit_v3.zip。执行日期：2026-11-01。

## 已修改

- 将包内首页适配到现有Quarto项目：文献索引、研读札记、专题评述仍为核心，团队与贡献维持次级菜单；增加GitHub入口。
- 采用具体、客观的学术表达，增加CONTRIBUTING_STYLE.md；保留既有文章和5位成员的URL。
- 成员目录改用学术名录文案；成员仍由data/people.json生成，保留此前已核实的身份、来源与照片占位。
- 成果页按原始作者署名收录3篇真实论文；通过实验室页面与Crossref元数据交叉核对标题、作者关联、年份、期刊、卷页和DOI。

## 未照搬的内容

附件属于待适配材料，不覆盖用户指令与项目AGENTS.md。未采用包内改回_site的配置、静态手写成员页、占位邮箱、缺失头像、无个人标识的Scholar/ORCID通用首页，以及未核实的专利、预印本和论文。没有把贾海改为研究员，也没有新增张龙和李铭浩的未经核实研究职责。原始包保留本地，不上传包含这些内容的原始材料。

## 论文来源

- 李智林：[实验室个人页](https://cuilab.cibr.ac.cn/Team/PostdoctoralFellow/f149cc0c2f8c4700a5ab0ba41f4006c2.htm)；[Brain Stimulation, 2024, 17(6), 1307–1316](https://doi.org/10.1016/j.brs.2024.11.010)。
- 赵晨光：[北京师范大学研究报道](https://brain.bnu.edu.cn/kyjz/ab1e27fe84a74ae98c602d3fdccbe6ac.htm)；[PLOS Biology, 2023, 21(3), e3002014](https://doi.org/10.1371/journal.pbio.3002014)。
- 贾海：[实验室个人页](https://cuilab.cibr.ac.cn/Team/GraduateStudents/f22ecff986ab44879be91ef9c2bbf0c0.htm)；[IEEE TNSRE, 2023, 31, 1311–1320](https://doi.org/10.1109/TNSRE.2023.3243992)。

作者单位与成果归属以论文原文为准；本页是成员公开论文索引。

## 验证

- `python scripts/build_site.py`：正式Quarto构建成功，14页静态链接验证通过；搜索索引、docs/.nojekyll均存在。
- Playwright Chromium：14页 × 320/390/768/1440宽度，共56项检查通过；无横向溢出、无HTML误显示为代码。
- 已目视检查桌面与手机首页；保留全部五位成员、文献示例和阅读规范。
- 保持本地构建、提交docs、GitHub Pages main /docs发布；没有创建自定义workflow。

运行证据和原始附件审阅材料保留本地项目工作目录；正式网页仅包含经核实、适合公开的内容。
