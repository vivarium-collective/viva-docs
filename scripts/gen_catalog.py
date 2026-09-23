#!/usr/bin/env python3
"""Generate docs/catalog.md from the viva-superpowers module catalog.

Source of truth: viva-superpowers/viva_superpowers/catalog/modules.json
Usage:  python scripts/gen_catalog.py [path/to/modules.json]

Re-run when the upstream catalog changes, then commit the regenerated docs/catalog.md.
"""
import html
import json
import sys
from pathlib import Path

DEFAULT_SRC = Path.home() / "code/viva-superpowers/viva_superpowers/catalog/modules.json"
OUT = Path(__file__).resolve().parent.parent / "docs" / "catalog.md"


def esc(s: str) -> str:
    return html.escape((s or "").strip(), quote=True)


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    mods = json.loads(src.read_text())
    mods.sort(key=lambda m: m.get("display_name", "").lower())

    all_tags = sorted({t for m in mods for t in (m.get("tags") or [])})

    out = []
    out.append("---")
    out.append("title: Module catalog")
    out.append("hide:\n  - toc")
    out.append("---\n")
    out.append("# Module catalog\n")
    out.append(
        "Every module here is a ready-to-install unit of capability — a simulator wrapped "
        "as process-bigraph Processes, a composite, or a whole workspace — from the "
        "[Vivarium Collective](https://github.com/vivarium-collective). Install one into a "
        "workspace with [`/viva-catalog`](reference/skills.md) (`install <name>`), or browse "
        "the source on GitHub.\n"
    )
    out.append(
        '!!! tip "Filter the catalog"\n'
        "    Type to search, or click capability tags to narrow the list. "
        f"There are **{len(mods)} modules** across **{len(all_tags)} capability tags**.\n"
    )

    # controls
    out.append('<div class="cat-controls">')
    out.append(
        '<input type="search" id="cat-search" class="cat-search" '
        'placeholder="Search modules…" aria-label="Search modules">'
    )
    out.append('<div class="cat-chips" id="cat-chips">')
    for t in all_tags:
        out.append(f'<button class="cat-chip" data-tag="{esc(t)}">{esc(t)}</button>')
    out.append("</div>")
    out.append('<div class="cat-count" id="cat-count"></div>')
    out.append("</div>\n")

    # cards
    out.append('<div class="cat-grid" id="cat-grid">')
    for m in mods:
        name = esc(m.get("name") or m.get("display_name"))
        disp = esc(m.get("display_name") or m.get("name"))
        desc = esc(m.get("description")) or "<em>No description yet.</em>"
        tags = [esc(t) for t in (m.get("tags") or [])]
        home = esc(m.get("homepage") or m.get("source") or "#")
        search_blob = " ".join(
            [disp.lower(), (m.get("description") or "").lower(), " ".join(tags)]
        )
        tag_attr = " ".join(tags)
        card = [
            f'<div class="cat-card" data-tags="{tag_attr}" data-text="{esc(search_blob)}">',
            '<div class="cat-card-head">',
            f'<h3>{disp}</h3>',
            f'<a class="cat-repo" href="{home}" target="_blank" rel="noopener" '
            f'title="Open repository">GitHub &#8599;</a>',
            "</div>",
            f'<p class="cat-desc">{desc}</p>',
        ]
        if tags:
            card.append('<div class="cat-tags">')
            card += [f'<span class="cat-tag">{t}</span>' for t in tags]
            card.append("</div>")
        card.append(f'<code class="cat-install">/viva-catalog install {name}</code>')
        card.append("</div>")
        out.append("".join(card))
    out.append("</div>")
    out.append('<p class="cat-empty" id="cat-empty" hidden>No modules match your filter.</p>\n')

    OUT.write_text("\n".join(out) + "\n")
    print(f"wrote {OUT} ({len(mods)} modules, {len(all_tags)} tags)")


if __name__ == "__main__":
    main()
