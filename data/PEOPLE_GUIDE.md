# 成员资料维护

成员内容统一保存在 `data/people.json`。运行 `python scripts/build_site.py` 生成个人页、目录和可发布站点。

## 字段

- `id`：稳定的页面标识，修改会影响已有链接。
- `name`、`name_en`、`position`：姓名与职务。
- `group`：目录分组，与 `groups` 中的标识对应。
- `bio`：直接介绍机构、角色与研究方向。
- `research`、`experience`、`publications`：研究兴趣、教育与科研经历、公开成果。
- `topics`、`contributions`：专题与内容贡献；有实际条目时再填写。
- `links`：资料来源与学术链接，在个人页的可展开资料栏中显示。
- `photo`：本地照片相对路径，例如 `assets/people/jia-hai.jpg`。
- `photo_source`：照片来源的 `label`、`url`、`image_url` 与 `accessed` 日期。

没有内容的板块自动隐藏，没有照片的成员使用姓名标识。正文不叙述资料搜索或核查过程；来源链接集中保留在资料栏。

成员照片与来源按官方人员页对应关系维护。已有页面保持稳定的 `id`；仅更新内容和照片时无需更改地址。
