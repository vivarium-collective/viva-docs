#!/usr/bin/env python3
"""Render the built site to a single high-fidelity PDF using headless Chromium.

Runs JS (so Mermaid diagrams and inline-SVG figures render), one page at a time,
then merges the per-page PDFs into ``site/viva-docs.pdf`` with a cover page and a
bookmark per chapter.

Prereqs:  pip install playwright pypdf  &&  playwright install chromium
Usage:    python scripts/build_pdf.py            # expects ./site to exist (mkdocs build)

Keep PAGES in sync with mkdocs.yml nav. The interactive Explore page and the Tags
index are intentionally excluded (they add nothing to a static PDF).
"""
import functools
import http.server
import socket
import socketserver
import threading
from datetime import date
from io import BytesIO
from pathlib import Path

from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = SITE / "viva-docs.pdf"

# (url path relative to site root, bookmark title) — reading order.
PAGES = [
    ("", "Home"),
    ("start-here/", "Start here"),
    ("quickstart/", "Quick start"),
    ("foundations/", "Foundations"),
    ("foundations/what-is-viva-eco/", "What is Vivarium?"),
    ("foundations/core-concepts/", "Core concepts"),
    ("foundations/the-stack/", "The stack"),
    ("compute/", "Build & run models"),
    ("compute/schema-types-state/", "Schemas, types & state"),
    ("compute/processes-and-steps/", "Processes & Steps"),
    ("compute/composites-and-wiring/", "Composites & wiring"),
    ("compute/emitters/", "Emitters"),
    ("compute/templates-and-draft-processes/", "Templates & draft processes"),
    ("investigate/", "Investigate"),
    ("investigate/workspaces-and-workbench/", "Workspaces & the Workbench"),
    ("investigate/studies/", "Studies"),
    ("investigate/analyses-visualizations-report-cards/", "Analyses, visualizations & report cards"),
    ("investigate/investigations/", "Investigations"),
    ("investigate/rigor-and-evidence/", "Rigor & the evidence engine"),
    ("investigate/working-with-agents/", "Working with AI agents"),
    ("reference/", "Reference"),
    ("reference/skills/", "Skill reference"),
    ("reference/http-api/", "HTTP API reference"),
    ("reference/schemas/", "On-disk schema reference"),
    ("reference/install-and-deploy/", "Install & deploy"),
    ("reference/worked-example/", "A worked end-to-end example"),
    ("reference/glossary/", "Glossary"),
    ("catalog/", "Module catalog"),
]

COVER = f"""<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body{{height:100%;margin:0;font-family:Inter,system-ui,sans-serif}}
  .wrap{{height:100vh;display:flex;flex-direction:column;align-items:center;
        justify-content:center;text-align:center;padding:0 2rem;
        background:linear-gradient(160deg,#0f766e 0%,#0b3b56 100%);color:#fff}}
  h1{{font-size:3rem;font-weight:800;margin:0 0 .4rem}}
  .tag{{font-size:1.4rem;opacity:.9;margin:0 0 2rem;font-style:italic}}
  .meta{{font-size:.95rem;opacity:.8;line-height:1.7}}
  a{{color:#7dd3fc}}
</style></head><body><div class="wrap">
  <h1>The Vivarium Users Guide</h1>
  <p class="tag">Compose living models.</p>
  <p class="meta">bigraph-schema &middot; process-bigraph &middot; vivarium-workbench &middot; viva-superpowers<br>
  vivarium-collective.github.io/viva-docs<br>Generated {date.today().isoformat()}</p>
</div></body></html>"""


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def serve(directory, port):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def render_all():
    if not SITE.exists():
        raise SystemExit("site/ not found — run `mkdocs build` first.")
    port = free_port()
    httpd = serve(SITE, port)
    base = f"http://127.0.0.1:{port}/"
    pdfs = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox"])
            page = browser.new_page()

            # cover
            page.set_content(COVER, wait_until="networkidle")
            pdfs.append(("__cover__", page.pdf(format="Letter", print_background=True,
                                               margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})))

            for path, title in PAGES:
                page.goto(base + path, wait_until="networkidle", timeout=60000)
                # let fonts settle and Mermaid finish drawing (if any)
                try:
                    page.wait_for_function(
                        "() => document.fonts.ready.then(() => true)", timeout=15000)
                except Exception:
                    pass
                try:
                    page.wait_for_function(
                        "() => { const m=[...document.querySelectorAll('.mermaid')];"
                        " return m.length===0 || m.every(e=>e.querySelector('svg')); }",
                        timeout=15000)
                except Exception:
                    pass
                page.wait_for_timeout(400)
                pdfs.append((title, page.pdf(
                    format="Letter", print_background=True,
                    margin={"top": "0.6in", "bottom": "0.6in", "left": "0.6in", "right": "0.7in"})))
            browser.close()
    finally:
        httpd.shutdown()
    return pdfs


def merge(pdfs):
    writer = PdfWriter()
    page_no = 0
    for title, data in pdfs:
        reader = PdfReader(BytesIO(data))
        start = page_no
        for pg in reader.pages:
            writer.add_page(pg)
            page_no += 1
        if title != "__cover__":
            writer.add_outline_item(title, start)
    with open(OUT, "wb") as fh:
        writer.write(fh)
    print(f"wrote {OUT}  ({page_no} pages, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    merge(render_all())
