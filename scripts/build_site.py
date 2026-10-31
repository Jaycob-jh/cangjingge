#!/usr/bin/env python3
"""Build a Pages-ready /docs directory locally, without GitHub Actions.

Requires Quarto installed on the development machine. No paid services.
Usage: python scripts/build_site.py
"""
from pathlib import Path
import shutil
import subprocess
import sys
ROOT = Path(__file__).resolve().parents[1]

def run(*cmd):
    print('> ' + ' '.join(cmd),flush=True)
    subprocess.run(cmd,cwd=ROOT,check=True)

def main():
    run(sys.executable, 'scripts/build_people.py')
    run(sys.executable, 'scripts/validate.py')
    quarto = shutil.which('quarto')
    portable = ROOT / '.tools' / 'quarto' / 'bin' / ('quarto.exe' if sys.platform == 'win32' else 'quarto')
    if quarto is None and portable.is_file():
        quarto = str(portable)
    if quarto is None:
        sys.exit('错误：当前系统找不到 Quarto。请先安装 https://quarto.org/docs/download/ ，再重试。'
                 ' 压缩包中已附带 docs/ 初始静态快照，可以先用它发布演示。')
    run(quarto,'render')
    docs=ROOT/'docs'
    if not (docs/'index.html').is_file():
        sys.exit('错误：Quarto 未生成 docs/index.html，请检查 _quarto.yml。')
    (docs/'.nojekyll').touch()
    run(sys.executable,'scripts/verify_pages.py')
    print('成功：docs/ 可以提交到 GitHub；Pages 源选择 main /docs。')
if __name__ == '__main__':
    main()
