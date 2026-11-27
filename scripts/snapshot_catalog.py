#!/usr/bin/env python3
"""Snapshot the authoritative marketplace ledger into docs/catalog-data.json.

The module catalog page (docs/catalog.md + javascripts/catalog.js) is **live** —
at load time it fetches the ecosystem index that `viva-catalog` publishes to
gh-pages. This script just refreshes the committed *fallback* snapshot that the
page falls back to when that fetch fails (offline builds, a gh-pages hiccup), so
the page is never blank.

The ledger itself is updated automatically: a repo joins by carrying the
`viva-marketplace` GitHub topic, and viva-catalog's nightly job rebuilds the
index. Nothing here needs editing when modules are added — just re-run this
occasionally to keep the fallback fresh.

Usage:  python scripts/snapshot_catalog.py [--url URL] [--out PATH]
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

DEFAULT_URL = "https://vivarium-collective.github.io/viva-catalog/ecosystem-index.json"
OUT = Path(__file__).resolve().parent.parent / "docs" / "catalog-data.json"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--url", default=DEFAULT_URL)
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--cap", type=int, default=15,
                    help="max artifacts kept per category in the fallback "
                         "(the live page has the full list; counts stay exact)")
    args = ap.parse_args()

    req = urllib.request.Request(args.url, headers={"User-Agent": "viva-docs-catalog-snapshot"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        index = json.loads(resp.read())

    repos = index.get("repos") or []
    # Keep the snapshot lean: the page only needs name + description per artifact.
    keep_art = ("name", "description")

    def trim_arts(items):
        return [{k: it.get(k, "") for k in keep_art} for it in (items or [])[: args.cap]]

    slim = {
        "generated_at": index.get("generated_at"),
        "n_repos": index.get("n_repos", len(repos)),
        "repos": [],
    }
    for r in repos:
        e = {k: r.get(k) for k in ("name", "repo", "source", "homepage", "description")}
        e["tags"] = r.get("tags") or []
        for art in ("processes", "steps", "composites", "studies", "investigations"):
            e[art] = trim_arts(r.get(art))
        e["counts"] = r.get("counts") or {
            art: len(e[art]) for art in
            ("processes", "steps", "composites", "studies", "investigations")
        }
        slim["repos"].append(e)

    Path(args.out).write_text(json.dumps(slim, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.out}: {len(slim['repos'])} repos "
          f"(generated_at {slim['generated_at']})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
