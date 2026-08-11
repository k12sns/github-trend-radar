"""Build one daily Hermes report with one optional OpenRouter batch call.

The expensive/subjective work is deliberately kept behind one call. GitHub
collection and the first-pass noise filter are deterministic and reproducible.
"""
import base64
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
REPORTS = ROOT / "reports"
GITHUB_API = "https://api.github.com"
OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions"
LANGUAGE_COLORS = {"Rust": "#4778d7", "Python": "#f5b414", "Go": "#f26e1e", "TypeScript": "#4778d7", "JavaScript": "#f5b414", "C++": "#b23ad5"}
NOISE_TERMS = ("trader", "trading-bot", "polymarket", "airdrop", "crypto", "token", "nft", "bot", "course", "awesome-list", "pokemon", "phishing", "torrent", "jackett", "news-radar")
DOMAINS = ("AI/ML", "Developer Tools", "Data", "Infrastructure", "Web", "Mobile", "Security", "Database", "Observability", "UI/UX", "Robotics", "DevOps")
ROLES = ("Agent", "SDK", "Plugin", "Framework", "Runtime", "CLI", "API", "Database", "Search", "Automation", "Model", "Workflow", "Monitoring", "Editor")


def load_dotenv():
    """Load simple KEY=VALUE pairs for local runs without adding a dependency."""
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def github_get(path, params=None, headers=None):
    base_headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if os.getenv("GITHUB_TOKEN"):
        base_headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"
    if headers:
        base_headers.update(headers)
    response = requests.get(f"{GITHUB_API}{path}", params=params, headers=base_headers, timeout=30)
    response.raise_for_status()
    return response.json()


def readme_excerpt(repository):
    try:
        readme = github_get(f"/repos/{repository['full_name']}/readme")
        content = base64.b64decode(readme.get("content", "")).decode("utf-8", errors="replace")
        content = re.sub(r"!\[[^]]*\]\([^)]*\)", "", content)
        content = re.sub(r"<[^>]+>", " ", content)
        return re.sub(r"\n{3,}", "\n\n", content).strip()[:1800]
    except requests.RequestException:
        return ""


def scrape_trending(period="daily"):
    """Read GitHub's public Trending page, whose rows include stars gained."""
    response = requests.get("https://github.com/trending", params={"since": period}, headers={"User-Agent": "HermesScout/0.1"}, timeout=30)
    response.raise_for_status()
    rows = re.findall(r"(?s)<article[^>]*Box-row.*?</article>", response.text)
    trending = []
    for row in rows:
        repository_match = re.search(r'<h2[^>]*>.*?href="/([^"?#]+)"', row, re.S)
        stars_match = re.search(r"([\d,]+)\s+stars today", row, re.I)
        if not repository_match or not stars_match:
            continue
        full_name = repository_match.group(1).strip("/")
        if full_name.count("/") != 1:
            continue
        description_match = re.search(r'<p[^>]*color-fg-muted[^>]*>(.*?)</p>', row, re.S)
        description = re.sub(r"<[^>]+>", " ", description_match.group(1)) if description_match else ""
        language_match = re.search(r'itemprop="programmingLanguage">(.*?)</span>', row, re.S)
        trending.append({"full_name": full_name, "trend_stars": int(stars_match.group(1).replace(",", "")), "trend_period": period, "description": re.sub(r"\s+", " ", description).strip(), "language": re.sub(r"<[^>]+>", "", language_match.group(1)).strip() if language_match else "Other"})
    return trending


def deterministic_score(repo, readme):
    """Rank candidates without asking a model to make the first decision."""
    score = repo.get("trend_stars", 0) * 3
    pushed_at = repo.get("pushed_at", "")
    if pushed_at:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(pushed_at.replace("Z", "+00:00"))
        score += max(0, 30 - age.days * 2)
    score += min(25, int(repo.get("stargazers_count", 0) ** 0.5))
    score += min(15, int(repo.get("forks_count", 0) ** 0.5))
    score += 10 if readme else 0
    score += 10 if repo.get("description") else 0
    score += 10 if not repo.get("archived") and not repo.get("fork") else 0
    return score


def fallback_tags(repo):
    text = f"{repo.get('full_name', '')} {repo.get('description', '')} {' '.join(repo.get('topics', []))} {repo.get('language', '')}".lower()
    domains = []
    roles = []
    if any(term in text for term in ("ai", "llm", "machine-learning", "model", "neural")): domains.append("AI/ML")
    if any(term in text for term in ("ui", "ux", "frontend", "design", "figma", "component")): domains.append("UI/UX")
    if any(term in text for term in ("database", "sql", "vector", "storage", "query")): domains.append("Database")
    if any(term in text for term in ("devops", "kubernetes", "docker", "cloud", "deploy")): domains.append("DevOps")
    if any(term in text for term in ("observability", "tracing", "metrics", "logging")): domains.append("Observability")
    if any(term in text for term in ("agent", "agents")): roles.append("Agent")
    if any(term in text for term in ("sdk", "library")): roles.append("SDK")
    if any(term in text for term in ("plugin", "extension")): roles.append("Plugin")
    if any(term in text for term in ("framework", "starter")): roles.append("Framework")
    if any(term in text for term in ("cli", "command-line")): roles.append("CLI")
    if any(term in text for term in ("api", "server")): roles.append("API")
    return list(dict.fromkeys(domains))[:2] or ["Developer Tools"], list(dict.fromkeys(roles))[:2] or ["Framework"]


def collect_candidates():
    try:
        trending = scrape_trending("daily")
    except requests.RequestException:
        trending = []
    if not trending:
        # Fallback for a transient GitHub Trending page failure.
        since = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
        result = github_get("/search/repositories", {"q": f"stars:>1000 forks:>20 pushed:>={since}", "sort": "updated", "order": "desc", "per_page": 30})
        trending = [{"full_name": repo["full_name"], "trend_stars": 0, "trend_period": "fallback", "description": repo.get("description", "")} for repo in result.get("items", [])]
    candidates = []
    api_blocked = False
    for trend in trending[:20]:
        if api_blocked:
            repo = {"full_name": trend["full_name"], "name": trend["full_name"].split("/", 1)[-1], "description": trend.get("description", ""), "language": trend.get("language", "Other"), "stargazers_count": 0, "forks_count": 0, "size": 100, "archived": False, "fork": False, "html_url": f"https://github.com/{trend['full_name']}", "pushed_at": datetime.now(timezone.utc).isoformat(), "topics": []}
        else:
            try:
                repo = github_get(f"/repos/{trend['full_name']}")
            except requests.HTTPError as error:
                if error.response is not None and error.response.status_code in (403, 429):
                    api_blocked = True
                    repo = {"full_name": trend["full_name"], "name": trend["full_name"].split("/", 1)[-1], "description": trend.get("description", ""), "language": trend.get("language", "Other"), "stargazers_count": 0, "forks_count": 0, "size": 100, "archived": False, "fork": False, "html_url": f"https://github.com/{trend['full_name']}", "pushed_at": datetime.now(timezone.utc).isoformat(), "topics": []}
                else:
                    raise
        haystack = f"{repo.get('full_name', '')} {repo.get('name', '')} {repo.get('description', '')}".lower()
        if repo.get("archived") or repo.get("fork") or repo.get("size", 0) < 20 or any(term in haystack for term in NOISE_TERMS):
            continue
        repo["trend_stars"] = trend["trend_stars"]
        repo["trend_period"] = trend["trend_period"]
        excerpt = readme_excerpt(repo) if not api_blocked else ""
        repo["readme_excerpt"] = excerpt
        repo["screen_score"] = deterministic_score(repo, excerpt)
        candidates.append(repo)
    return sorted(candidates, key=lambda item: item["screen_score"], reverse=True)[:10]


def openrouter_descriptions(candidates):
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        return {}
    compact = [{"repository": r["full_name"], "language": r.get("language"), "github_topics": r.get("topics", []), "github_description": r.get("description"), "readme_excerpt": r.get("readme_excerpt", "")} for r in candidates]
    prompt = f"""You are the private screening, taxonomy, and description step for a Korean open-source technology trend directory. For each repository, first decide keep=true only when it is a real software project, library, framework, database, developer tool, infrastructure component, or technical research implementation with meaningful source code and engineering relevance. Set keep=false for games, content/news sites, link collections, filters, bots, trading/crypto projects, security blocklists, torrent tools, tutorials, prompt collections, obvious clones, and marketing-only repositories. This decision is private and must not appear in the user-facing summary. For keep=true items, explain only what it is and what role it serves; do not write impact scores, confidence, judgment, or why it is trending. Select at most two domain tags and at most two role tags from these fixed lists only. Domains: {', '.join(DOMAINS)}. Roles: {', '.join(ROLES)}. Return JSON only in this exact shape: {{\"items\":[{{\"repository\":\"owner/name\",\"keep\":true,\"domains\":[\"AI/ML\"],\"roles\":[\"Plugin\"],\"summary\":\"one or two natural Korean sentences, max 220 characters\"}}]}}. Never invent facts not present in the metadata or README."""
    response = requests.post(OPENROUTER_API, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "HTTP-Referer": "https://github.com/k12sns/hermes-scout", "X-Title": "Hermes Scout"}, json={"model": os.getenv("OPENROUTER_MODEL", "openrouter/free"), "messages": [{"role": "system", "content": prompt}, {"role": "user", "content": json.dumps(compact, ensure_ascii=False)}], "temperature": 0.2, "max_tokens": 2200}, timeout=90)
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"].strip()
    content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content).strip()
    parsed = json.loads(content)
    valid = {}
    for item in parsed.get("items", []):
        if item.get("keep") is not True or not item.get("repository") or not item.get("summary"):
            continue
        item["domains"] = [tag for tag in item.get("domains", []) if tag in DOMAINS][:2]
        item["roles"] = [tag for tag in item.get("roles", []) if tag in ROLES][:2]
        valid[item["repository"]] = item
    return valid


def previous_stars():
    latest = DATA / "latest.json"
    if not latest.exists():
        return {}
    try:
        return {item["full_name"]: item.get("stars", 0) for item in json.loads(latest.read_text(encoding="utf-8")).get("items", [])}
    except (OSError, json.JSONDecodeError):
        return {}


def build_public_items(candidates, descriptions, old_stars):
    items = []
    for repo in candidates:
        full_name = repo["full_name"]
        ai = descriptions.get(full_name, {})
        fallback_domains, fallback_roles = fallback_tags(repo)
        stars = repo.get("stargazers_count", 0)
        delta = max(0, stars - old_stars.get(full_name, stars))
        fallback = repo.get("description") or f"{repo.get('language') or 'Open-source'} 프로젝트입니다."
        trend_stars = repo.get("trend_stars", delta)
        items.append({"full_name": full_name, "name": full_name.replace("/", " / "), "description": ai.get("summary", fallback)[:240], "domains": ai.get("domains", fallback_domains), "roles": ai.get("roles", fallback_roles), "language": repo.get("language") or "Other", "color": LANGUAGE_COLORS.get(repo.get("language"), "#77736b"), "gained": f"+{trend_stars:,}", "stars": stars, "forks": repo.get("forks_count", 0), "url": repo.get("html_url"), "updated_at": repo.get("pushed_at")})
    return items


def write_outputs(items, now):
    DATA.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)
    payload = {"generated_at": now.isoformat(), "items": items}
    serialized = json.dumps(payload, ensure_ascii=False, indent=2)
    (DATA / f"{now.date()}.json").write_text(serialized, encoding="utf-8")
    (DATA / "latest.json").write_text(serialized, encoding="utf-8")
    lines = [f"# Hermes Daily Open Source Notes — {now.date()}", "", "오늘의 GitHub 오픈소스 트렌드", ""]
    for index, item in enumerate(items, 1):
        tags = " · ".join(item.get("domains", []) + item.get("roles", []))
        lines.extend([f"## {index}. [{item['full_name']}]({item['url']})", f"**{tags} · {item['language']}**", "", item["description"], "", f"Stars: {item['stars']:,} · 오늘 증가: {item['gained']}", ""])
    (REPORTS / f"{now.date()}.md").write_text("\n".join(lines), encoding="utf-8")


def main():
    load_dotenv()
    now = datetime.now(timezone.utc)
    candidates = collect_candidates()
    try:
        descriptions = openrouter_descriptions(candidates)
        candidates = [candidate for candidate in candidates if candidate["full_name"] in descriptions]
    except (requests.RequestException, KeyError, json.JSONDecodeError, ValueError) as error:
        print(f"OpenRouter unavailable; using GitHub descriptions: {error}")
        descriptions = {}
    write_outputs(build_public_items(candidates, descriptions, previous_stars()), now)
    print(f"Wrote {len(candidates)} repositories for {now.date()} ({'AI enriched' if descriptions else 'fallback descriptions'})")


if __name__ == "__main__":
    main()
