---
title: Quick start
tags:
  - getting-started
  - workspace
  - workbench
  - agents
---

# Quick start

This is the fast path from nothing to a running **Vivarium Workbench** over a fresh
workspace — written so a **human or an AI agent** can follow it top to bottom. For the
full picture, see [Workspaces & the Workbench](investigate/workspaces-and-workbench.md)
and [Working with AI agents](investigate/working-with-agents.md).

!!! tip "Pointing an AI agent here?"
    Give the agent this page's URL, or the raw Markdown so it can read it verbatim:
    `https://raw.githubusercontent.com/vivarium-collective/viva-docs/main/docs/quickstart.md`.
    Everything below is copy-pasteable and assumes no prior state.

**What the Workbench is:** a local web UI + HTTP API over a *process-bigraph workspace*
(a folder with a `workspace.yaml` holding composites, studies, investigations, and runs).
It **reads and writes** the workspace's files and commits each change to git, so every
action has an audit trail.

**Two layers, kept separate:**

- **The Workbench** = server / UI / data. It has **no AI dependencies** — pure Python + static assets.
- **The LLM layer** = the `viva-superpowers` Claude Code plugin (skills that *drive* the Workbench's HTTP API). All AI lives here, never in the Workbench (see §4).

---

## 0. Prerequisites

- **Python ≥ 3.11**, **git**, and **[uv](https://docs.astral.sh/uv/)** (`pip install uv` if absent).
- Optional (for the AI layer): **Claude Code** + the `viva-superpowers` plugin.

---

## 1. Create the workspace repo (scaffold from `viva-template`)

A workspace is a self-contained research repo (its own Python package + specs). Don't
hand-roll it — scaffold from the template:

```bash
# Option A: "Use this template" on github.com/vivarium-collective/viva-template, then clone your new repo.
# Option B: clone the template directly:
git clone https://github.com/vivarium-collective/viva-template my-workspace
cd my-workspace

bash use-this-template-init.sh     # prompts for a workspace name; renders the .j2 files
uv venv && source .venv/bin/activate
uv pip install -e ".[dev]"          # this pulls in vivarium-workbench as a dependency
python3 scripts/lint-workspace.py   # expect: "workspace lint: OK"
```

After this you have: `workspace.yaml`, a `viva_<name>/` Python package (older templates use
`pbg_<name>/`), `composites/`, `studies/`, `investigations/`, and a `.pbg/` control dir. The
template works standalone — **no plugin or Claude Code required** for the base tool.

!!! note "Adding to an existing project"
    If you're adding the Workbench to an *existing* process-bigraph project instead of
    scaffolding, ensure the repo root has a valid `workspace.yaml` and
    `uv pip install vivarium-workbench` into its venv. (During beta it may not be on PyPI —
    install editable from a clone of `vivarium-collective/vivarium-workbench` if the PyPI
    install fails.)

---

## 2. Launch the Workbench

From the workspace root (the dir containing `workspace.yaml`):

```bash
vivarium-workbench serve --workspace .            # picks a free port, renders once, then serves
# or:  vwb serve --workspace . --port 8000 --host 0.0.0.0
```

CLI subcommands (via `vivarium-workbench` or `vwb`): `serve · run · study · investigation ·
composite · rerun · runs · status · logs`.

On start it writes the live base URL to **`.pbg/server/server-info`** — that file is how
*everything* (including agents) discovers the server.

---

## 3. Verify it's up (agent-friendly checks)

`server-info` is a small JSON document (`{ "port", "host", "url", … }`) — read the `url`
field rather than the raw file:

```bash
BASE=$(python3 -c "import json; print(json.load(open('.pbg/server/server-info'))['url'])")
curl -s "$BASE/api/workspace-manifest" | head    # one-call situational-awareness snapshot
```

Useful endpoints:

- **`GET /api/workspace-manifest`** — one call returns the workspace, composites, studies, registry, health, and skills. *Start here for orientation.*
- **`GET /api/linkage-index`** — the deterministic cross-reference / navigation graph (what links to what).
- **`GET /openapi.json`, `/docs`, `/redoc`** — the live, auto-generated API contract. Prefer `/openapi.json` over prose when you need exact request/response shapes.

---

## 4. The LLM layer — how an AI works with the Workbench

### 4.1 The principle

The **Workbench is AI-free**. All AI capability is packaged as the **`viva-superpowers`**
Claude Code plugin: a set of `viva-*` **skills** that call the Workbench's HTTP API to
author and run models. This keeps the tool auditable and the AI swappable.

### 4.2 One-time agent setup

```
1. Install the `viva-superpowers` plugin in Claude Code.
2. Run  /viva-init         — installs every viva-* skill into ~/.claude/skills/ (once per machine).
3. Run  /viva-workbench start  — launches the Workbench and writes .pbg/server/server-info.
   (Skills read that file for the base URL; if it's absent they'll tell you to start the server.)
```

### 4.3 How an agent talks to the Workbench (the access contract)

- **Base URL:** always read from `.pbg/server/server-info`. Never hardcode a port.
- **No token / no auth to fight:** the CSRF guard is **same-origin**, and a request with **no `Origin` header is always allowed** — so `curl`/`httpx`/CLI calls just work.
- **Read the contract, not the prose:** `GET /openapi.json` is authoritative for shapes.
- **Orient in one call:** `GET /api/workspace-manifest` (state) + `GET /api/linkage-index` (graph) before you start editing.
- **Runs are asynchronous:** a run returns a `run_id`; poll its status until done; the durable artifact is `studies/<slug>/runs.db`. Check the run's *result field*, not just the HTTP status (a failed run can still return 200).
- **Every write commits to git** in the workspace — your changes are a reviewable history.

### 4.4 The skills

A tour of what each `/viva-*` skill is for is in the **[Skill reference](reference/skills.md)**
(some capabilities named in older docs — `viva-explore`, `viva-status`, `viva-cite-bands`,
`viva-biology-forward` — are now subcommands of other skills; the reference lists the current set).

### 4.5 The authoring flow (typical agent arc)

```
scaffold/serve workspace  →  viva-catalog (get processes)  →  viva-expert (wrap a new simulator, if needed)
   →  build a composite (compose processes)  →  viva-study (define a study over that composite)
   →  viva-run (execute; poll to completion)  →  viva-viz / viva-report (render)
   →  viva-investigation (organize studies + narrative into a rigorous investigation)
```

### 4.6 The mental model you're operating in

The framework collapses to **one object, one operation, one law**:

- **One object** — a *document*. A composite, a study, an investigation, and a template are the **same kind of thing** (a bigraph document).
- **One operation** — **fill**: substitute values / composites into a document's open **sites** (holes).
- **One law** — **groundness** (`is_ground`): a document runs iff it has no unfilled required sites.

Four features that look like separate machinery are that one idea in different places:
optional members, gating on a failed prerequisite, pulling a cached result, and
partial-graph triggering. See [Core concepts](foundations/core-concepts.md) and
[The stack](foundations/the-stack.md) for the full picture.

---

## 5. Quick reference

```bash
# --- one-time, new repo ---
git clone https://github.com/vivarium-collective/viva-template my-workspace && cd my-workspace
bash use-this-template-init.sh
uv venv && source .venv/bin/activate && uv pip install -e ".[dev]"
python3 scripts/lint-workspace.py           # -> "workspace lint: OK"

# --- launch ---
vwb serve --workspace .                      # writes .pbg/server/server-info

# --- agent orientation ---
BASE=$(python3 -c "import json; print(json.load(open('.pbg/server/server-info'))['url'])")
curl -s "$BASE/api/workspace-manifest"       # state snapshot
curl -s "$BASE/api/linkage-index"            # navigation graph
curl -s "$BASE/openapi.json"                 # exact API shapes

# --- AI layer (Claude Code) ---
# /viva-init            (once per machine: install skills)
# /viva-workbench start (launch + write server-info)
# /viva-catalog /viva-study /viva-run /viva-expert /viva-investigation ...
```

**Key files:** `workspace.yaml` (workspace root marker) · `.pbg/server/server-info` (live
base URL) · `studies/<slug>/runs.db` (durable run artifacts) · `composites/`, `studies/`,
`investigations/` (the documents).

**Golden rules for an agent:** read `.pbg/server/server-info` for the URL; orient via
`/api/workspace-manifest` first; trust `/openapi.json` for shapes; runs are async (poll,
and check the *result*, not just HTTP 200); every write is a git commit.
