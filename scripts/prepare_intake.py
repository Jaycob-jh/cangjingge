#!/usr/bin/env python3
"""Stage Hai's PDF/DOI locally. MCP lookup and curated publication follow separately.

No network writes; PDFs and intake state always stay outside the public repository.
PDF text extraction uses PyMuPDF (python -m pip install pymupdf).
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import re
import shutil
import uuid
from literature_common import normalize_doi

REPO = Path(__file__).resolve().parents[1]
DEFAULT_STATE = Path('I:/Agents-workspace/Workspaces/cangjingge-intake')
DEFAULT_INBOX = Path('I:/Agents-workspace/Outputs/ReadCube文献归类/inbox')

def prepare(source, state_dir=DEFAULT_STATE, pdf_dir=DEFAULT_INBOX, confirmed_doi=None):
    state_dir, pdf_dir = Path(state_dir).resolve(), Path(pdf_dir).resolve()
    if state_dir.is_relative_to(REPO) or pdf_dir.is_relative_to(REPO):
        raise ValueError('Private intake must be stored outside the public repository')
    source_path = Path(source)
    is_pdf = source_path.is_file()
    doi = normalize_doi(confirmed_doi) if confirmed_doi else None
    candidates, digest, extracted, pages, pdf_error = [], None, '', None, None
    if is_pdf:
        if source_path.suffix.lower() != '.pdf':
            raise ValueError('Only PDF files or DOI identifiers are accepted')
        source_path = source_path.resolve()
        with source_path.open('rb') as f:
            digest = hashlib.file_digest(f, 'sha256').hexdigest()
        import pymupdf
        try:
            with pymupdf.open(source_path) as doc:
                pages = len(doc)
                if doc.needs_pass:
                    pdf_error = 'password_required'
                elif pages:
                    extracted = doc[0].get_text()
        except pymupdf.FileDataError:
            pdf_error = 'unreadable_pdf'
        # Candidates come from page 1 only; they must be checked against title/authors.
        for candidate in re.findall(r'10\.\d{4,9}/[^\s<>"\']+', extracted, flags=re.I):
            try:
                candidate = normalize_doi(candidate)
                if candidate not in candidates:
                    candidates.append(candidate)
            except ValueError:
                pass
    else:
        # A misspelled/missing PDF path must never silently become a DOI record.
        if source.lower().endswith('.pdf'):
            raise FileNotFoundError(source)
        doi = normalize_doi(source)

    state_dir.mkdir(parents=True, exist_ok=True)
    queue_file = state_dir / 'queue.json'
    queue = json.loads(queue_file.read_text(encoding='utf-8')) if queue_file.exists() else []
    matches = [r for r in queue if (digest and digest in r['pdf_sha256']) or (doi and r.get('doi') == doi)]
    if len(matches) > 1:
        raise ValueError('Multiple local records match. Review existing records before linking them.')
    record = matches[0] if matches else {
        'id': str(uuid.uuid4()), 'created_utc': datetime.now(timezone.utc).isoformat(),
        'doi': doi, 'doi_candidates': [], 'sources': [], 'pdf_sha256': [],
        'local_pdfs': [], 'metadata_status': 'pending_verification',
        'reading_status': '未开始', 'readcube_status': 'pending_lookup',
        'public_status': 'pending_curation', 'readcube_items': [], 'public_slug': None,
    }
    if doi and record.get('doi') and doi != record['doi']:
        raise ValueError('Confirmed DOI conflicts with the existing PDF record')
    if doi:
        record['doi'] = doi
    src = str(source_path) if is_pdf else source
    if src not in record['sources']:
        record['sources'].append(src)
    for candidate in candidates:
        if candidate not in record['doi_candidates']:
            record['doi_candidates'].append(candidate)
    if is_pdf:
        pdf_dir.mkdir(parents=True, exist_ok=True)
        stored = pdf_dir / f'{digest}.pdf'
        if not stored.exists():
            shutil.copyfile(source_path, stored)
        if digest not in record['pdf_sha256']:
            record['pdf_sha256'].append(digest)
        if str(stored) not in record['local_pdfs']:
            record['local_pdfs'].append(str(stored))
        record['extraction'] = {'pages': pages, 'first_page_chars': len(extracted),
                                'needs_ocr': not extracted.strip() and not pdf_error,
                                'error': pdf_error}
    if not matches:
        queue.append(record)
    temporary = queue_file.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(queue_file)
    return {'record_id': record['id'], 'reused': bool(matches), 'doi': record['doi'],
            'doi_candidates': record['doi_candidates'], 'pdf_sha256': digest,
            'queue': str(queue_file), 'next_step': 'ReadCube H 查重、核对元数据并归类；再整理公开文献卡片'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', help='PDF absolute path or DOI/DOI URL')
    parser.add_argument('--doi', help='DOI confirmed against the supplied PDF')
    parser.add_argument('--state-dir', type=Path, default=DEFAULT_STATE)
    parser.add_argument('--pdf-dir', type=Path, default=DEFAULT_INBOX)
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.state_dir, args.pdf_dir, args.doi), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
