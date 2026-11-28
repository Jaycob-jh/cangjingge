import importlib.util
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('verify_pages',Path(__file__).resolve().parents[1]/'verify_pages.py')
verify=importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)

class ModuleResources(unittest.TestCase):
    def test_missing_import_and_versioned_relative_import(self):
        base=Path('I:/Agents-workspace/Outputs/cangjingge/tests/page-modules')
        base.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base) as tmp:
            docs=Path(tmp)
            self.assertTrue(docs.resolve().is_relative_to(base.resolve()))
            assets=docs/'assets';assets.mkdir()
            (assets/'app.js').write_text("import {load} from './draft.mjs?v=1';\nconst x=import('./extra.mjs');",encoding='utf-8')
            self.assertEqual(len(verify.check_module_imports(docs)),2)
            (assets/'draft.mjs').write_text('export const load=()=>null;',encoding='utf-8')
            (assets/'extra.mjs').write_text('export const value=1;',encoding='utf-8')
            self.assertEqual(verify.check_module_imports(docs),[])

if __name__=='__main__': unittest.main()
