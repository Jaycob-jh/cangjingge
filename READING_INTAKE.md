# DOI/PDF 本地整理草稿

免费运行，不用API。正式书目、研究卡和笔记不会被本工具改写。

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
