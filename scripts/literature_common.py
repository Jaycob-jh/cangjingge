"""Shared DOI normalization for curated records and local intake."""
import re
from urllib.parse import unquote, urlsplit

def normalize_doi(value):
    value = value.strip()
    if value.lower().startswith(('https://doi.org/', 'http://doi.org/', 'https://dx.doi.org/', 'http://dx.doi.org/')):
        value = unquote(urlsplit(value).path.lstrip('/'))
    value = re.sub(r'^doi\s*:\s*', '', value, flags=re.I).strip().rstrip('.,;')
    if not re.fullmatch(r'10\.\d{4,9}/[^\s<>"\']+', value, flags=re.I):
        raise ValueError(f'Invalid DOI: {value}')
    return value.casefold()
