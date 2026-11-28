# DOI/PDF 整理草稿

免费运行，不用API。正式书目、研究卡和笔记不会被本工具改写。

## 网页操作

打开 [整理一篇论文](https://jaycob-jh.github.io/cangjingge/research/reading-intake.html)：

1. 输入DOI或题名查重；或在PDF区域选择本机文件、指定物理页码。PDF在本浏览器处理，不上传，首页DOI只是身份候选。
2. 已有书目沿用分类与稳定内容链接。Crossref按钮仅查询公开DOI题录，补缺，不改已有值；差异单列。
3. 逐实验组添加参数或结果。PDF单位线索可以挑入，但不自动判断字段/组别、峰值/平均值或脑内/表面剂量。填好原文位置与公开出处后，才可勾选人工已核；修改记录后恢复待核。
4. 下载JSON保留全部编辑、原分类、原有额外字段及PDF文字线索；再次打开页面可导入继续。JSON含本地摘录，应保存在自己的文件夹。新建或导入另一篇前会提示保存，刷新离开有未保存提示。
5. QMD为draft:true的论文笔记骨架和人工整理表，不自动带入PDF文字、私有路径和私人备注。核对后由维护者按原流程正式入库。没有自动发布/批量写库权限。

更换研究方向保留已填内容，字段提示分别适配tPBM、fMRI与睡眠EEG。同PDF重复读取相同页不重复追加线索；不同PDF按SHA256分别记录，身份差异留待核。该页面提取文本，不做OCR，也不声称识别/解释图像中的图表。

网页使用固定版本Mozilla PDF.js 6.5.438，来源和SHA256见assets/vendor/pdfjs/SOURCE.json，许可证随组件保留。解析器、CMap和字体均随站点提供；不触发模型下载。

## 命令行操作

```powershell
python scripts/create_reading_draft.py --doi "10.1002/lsm.22471" --lookup
python scripts/create_reading_draft.py --pdf "I:/你的论文.pdf" --pages 7
python scripts/create_reading_draft.py --pdf "I:/你的论文.pdf" --domain fmri
python scripts/create_reading_draft.py --pdf "I:/你的论文.pdf" --domain sleep-eeg
```

默认输出在`I:/Agents-workspace/Outputs/cangjingge/intake-drafts/`，也可用`--output`指定仓库外的I盘目录。PDF提取需要本机PyMuPDF；只用DOI或题名时不需要PDF库。`--lookup`才查询免费公开Crossref；现有题录优先保留，不因外部差异覆盖。

每篇生成draft.json、可编辑note.qmd、README；有PDF时另存带PDF物理页码的pdf-pages.txt。默认提取前3页，可按方法所在位置改`--pages`。带单位和图表号的文字只是候选，未归入实验组，不当作已核参数；扫描件无文字时需要另外OCR。PDF身份、组别、数值和图表仍需按原文核对。

按规范DOI和题名查找既有书目、全文卡和笔记，保留原主题ID、顺序和稳定内容入口。题名与DOI冲突单列；PDF首页多个DOI不自动选。候选DOI不会写入QMD的正式doi字段，核对身份后再由维护者补入。只有PMID也可用`--pmid`先查现有索引，未确定DOI时留待补。

重复运行不会覆盖已有草稿；人工编辑保留。需要另一版时加`--new-revision`，旧版完整保留。不要把pdf-pages.txt、原PDF路径或其他私人资料提交到公开仓库。

研究字段按领域分开：经颅光刺激包括光学参数、组别、对照、时点和测温；fMRI包括TR（重复时间）、TE（回波时间）、采集与网络分析；睡眠EEG包括导联、采样、分期和频谱/事件指标。新稿不会把未报告的值填成0，也不会把不同实验组拼在一起。

核对完身份、实际组别和原文图表后，再按原有本地构建与main/docs流程发布。`note.qmd`默认draft:true，不自动进入正式网站。

回归：`python scripts/tests/test_reading_draft.py`。


## 本机保存与恢复

默认不在浏览器保存草稿。建立或导入后，可点击“保存到本机”保存一次，或勾选“在此浏览器自动保存此草稿”。本机只保留一篇副本，含人工字段、原分类、原文页码和提取的文字线索；PDF 文件不保存、不上传。保存成功会显示时间，容量不足或浏览器禁用存储时会提示失败并停用自动保存，可下载 JSON 备份。

刷新后点击“恢复本机副本”，不会自动替换页面编辑；恢复后自动保存仍关闭。打开另一篇草稿也会停止自动保存，旧副本留到主动保存下一篇或删除。“关闭自动保存”保留已有副本，“删除本机副本”经确认后只删此站点的草稿副本，当前编辑保留。共用电脑使用后请备份并删除副本；清除网站数据、无痕会话结束或浏览器清理可能使副本消失。

另一页面改动本机副本时，本页停止自动保存并保留当前编辑；先下载 JSON，再决定恢复哪份。不上传本机草稿到正式库，正式库和 Hai 的人工内容仍由现有维护流程更新。
