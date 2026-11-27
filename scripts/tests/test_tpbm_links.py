"""Prevent study/question links silently becoming one-way again."""
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build_tpbm


class ReciprocalLinks(unittest.TestCase):
    def reject(self, study_questions, question_studies):
        studies = {'studies': [{'id': 'example', 'doi': '10.1234/example', 'questions': study_questions}]}
        questions = [{'id': 'dose', 'studies': question_studies}]
        with patch.object(Path, 'read_text', side_effect=[json.dumps(studies), json.dumps(questions)]):
            with self.assertRaisesRegex(AssertionError, 'dose'):
                build_tpbm.main()

    def test_question_missing_study(self):
        self.reject(['dose'], [])

    def test_study_missing_question(self):
        self.reject([], ['example'])


if __name__ == '__main__':
    unittest.main()
