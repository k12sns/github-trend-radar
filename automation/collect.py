"""Collect a small, reproducible GitHub trend snapshot for the daily report."""
import json, os
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public' / 'data'
DATA.mkdir(parents=True, exist_ok=True)

def main():
    headers = {'Accept': 'application/vnd.github+json'}
    if os.getenv('GITHUB_TOKEN'): headers['Authorization'] = f"Bearer {os.environ['GITHUB_TOKEN']}"
    query = 'stars:>100 pushed:>2025-01-01'
    response = requests.get('https://api.github.com/search/repositories', params={'q': query, 'sort': 'stars', 'order': 'desc', 'per_page': 20}, headers=headers, timeout=30)
    response.raise_for_status()
    now = datetime.now(timezone.utc)
    payload = {'generated_at': now.isoformat(), 'items': response.json().get('items', [])}
    (DATA / f"{now.date()}.json").write_text(json.dumps(payload, indent=2), encoding='utf-8')
    (DATA / 'latest.json').write_text(json.dumps(payload, indent=2), encoding='utf-8')

if __name__ == '__main__': main()
