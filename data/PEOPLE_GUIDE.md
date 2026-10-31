# 成员资料维护规范

**唯一可修改的数据源**：`data/people.json`。修改后执行：

```bash
python scripts/build_people.py
python scripts/validate.py
```

`people/` 内的 `.qmd` 会由脚本重写，不要手工修改。

## 当前确认信息

赵晨光（PI），李智林、贾海、张龙、李铭浩（团队成员，具体职务待确认）。

## 字段说明

- `id`：用于 URL 的英文字母标识，保持唯一。
- `name`：成员显示姓名。
- `group`：分组标识；仅在成员职务经过本人确认后再移动到博士后、研究生、研究助理等分组。
- `position`：显示职务。
- `name_en`、`bio`、`research`、`experience`、`publications`、`links`：公开前确认本人同意。
- `topics`：该成员负责或参与的公开知识专题。
- `contributions`：公开的文献索引、精读札记或维护记录，**不是虚构的贡献排行榜**。
- `photo`：为空使用文字占位；真实照片需本人授权，并存放 `assets/people/`。

最初的个人详情页面以“参与专题”和“文献整理与札记”优先。未确认的履历字段不会提前展示。

> 姓名和成员职务存在重名风险。不要从第三方网页自动抓取同名人员的照片、经历和联系方式，并当作团队成员资料。
