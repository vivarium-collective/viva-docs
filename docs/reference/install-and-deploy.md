# Install & deploy

Getting a workspace and the Workbench running — on your laptop, in a container, and as a
read-only site others can browse. The through-line is one fact worth fixing in your mind
before anything else:

!!! quote "The direction of the dependency"
    **The workspace depends on the Workbench, not the other way around.** `vivarium-workbench`
    is a plain pip dependency of your workspace's `pyproject.toml`, installed into the
    *workspace's own virtualenv* and run from there. The dashboard imports your workspace's
    package (`build_core()`) and any installed simulation stacks to build and run composites —
    a dashboard installed in some other environment could not see them.

That is why there is no global "install the Workbench" step. You scaffold a workspace, and
the Workbench comes along inside its venv. For the layers involved, see
[The stack](../foundations/the-stack.md).

---

## Prerequisites

- **[uv](https://github.com/astral-sh/uv)** — the package manager the ecosystem standardizes
  on. It creates the workspace venv and resolves the git-sourced dependencies.
- **git** — a workspace *is* a git repository, and every Workbench action commits to it.
- **Python 3.12** — the version the server image is built against.
- **Node + npm** — only needed if you build the container image yourself (the vendored
  `bigraph-loom` bundle is built with npm); not needed for local use.

The two things every dashboard-touching skill assumes are a **workspace** (a directory with
`workspace.yaml` + a `viva_<pkg>/` package) and a **running server**. The rest of this
chapter is how to get both.

---

## Local start

From inside a workspace directory:

```bash
# 1. create the workspace venv and install everything (resolves the git pins)
uv venv .venv && source .venv/bin/activate
uv pip install -e ".[dev]"

# 2. sanity check the workspace
python3 scripts/lint-workspace.py        # → "workspace lint: OK"

# 3. serve the dashboard against this workspace
vivarium-workbench serve --workspace . --host 0.0.0.0 --port 8000
```

`vivarium-workbench` renders the workspace once, then serves the SPA + HTTP API until
Ctrl-C. It writes its base URL to `.pbg/server/server-info` — skills read the URL from there
rather than hardcoding it.

!!! note "`vwb` is the short alias"
    The CLI is aliased `vwb`, so `vwb serve --workspace .` is equivalent. Omitting `--port`
    picks a free port and prints the URL; a scaffolded workspace also ships a `scripts/serve.sh`
    wrapper that prefers the workspace venv's binary. The `/viva-workbench` skill wraps all of
    this (`/viva-workbench start`).

!!! note "Renamed from `vivarium-dashboard`"
    The distribution was `vivarium-dashboard`; it is now `vivarium-workbench`. The old
    `vivarium-dashboard` / `vdash` / `vivarium-dashboard-publish` CLIs and the
    `VIVARIUM_DASHBOARD_*` env vars keep working as deprecated aliases during the migration
    window. The one consumer-facing change is the **dependency name** in `pyproject.toml`.

### Working on the Workbench itself

If you are hacking on the server, do not edit the committed git pin. Override it with an
editable install into the workspace venv, pointing at your local clone:

```bash
# from inside the workspace, with its venv active
uv pip install -e /path/to/vivarium-workbench
vivarium-workbench serve --workspace .    # now runs your working copy
```

---

## Scaffolding a workspace

New workspaces are scaffolded from the **[viva-template](https://github.com/vivarium-collective/viva-template)**
repo. The template's `template-init.sh` renders its `.j2` files (the `pyproject.toml`, the
`viva_<pkg>/core.py` with `build_core()`, the `.pbg/schemas/` validators) into a concrete
workspace. The `/viva-workspace` skill drives this in three modes:

```bash
# standalone — clone viva-template directly
/viva-workspace my-project

# upstream-branch — clone an existing repo and lay a workspace branch on top
/viva-workspace my-project --upstream owner/repo

# in-place — promote an existing git checkout (e.g. a composite-only repo) into a workspace
/viva-workspace my-project --target . --in-place
```

Under the hood the standalone mode runs `vwb scaffold-workspace --name --target` (which
clones the template), `uv venv .venv`, `uv pip install -e .[dev]`, commits the bootstrap, and
registers the workspace in the global catalog at `~/.pbg/workspaces.json`.

!!! note "Template repo naming"
    The scaffold repo is **`viva-template`** (formerly `pbg-template`); some older docs and
    the `$PBG_TEMPLATE` / `--template-source` override still reference the `pbg-template`
    name. Both point at the same scaffold.

Because the Workbench is **not on PyPI during beta**, the scaffolded `pyproject.toml` pins it
to a git source, so CI, Docker, and collaborators all resolve identically:

```toml
[project]
dependencies = ["process-bigraph", "bigraph-schema", "vivarium-workbench", "..."]

[tool.uv.sources]
vivarium-workbench = { git = "https://github.com/vivarium-collective/vivarium-workbench.git", branch = "main" }

[tool.hatch.metadata]
allow-direct-references = true
```

The git ref can be overridden at init via `VIVARIUM_DASHBOARD_REF`.

---

## The module catalog

Simulation stacks (`viva-*` / `pbg-*` wrapper repos) are installed into the workspace venv as
**community modules**. The curated catalog lives in `viva_superpowers/catalog/modules.json`;
the `/viva-catalog` skill lists, installs, and uninstalls entries through the Workbench API:

```bash
/viva-catalog                 # list installed + available modules (default)
/viva-catalog install <pkg>   # add a module to the workspace
/viva-catalog uninstall <pkg> # remove one
```

Modules are installed as git submodules / editable git installs, and a module only becomes
discoverable once it is pip-installed into the venv and declares `bigraph-schema` as a
dependency — that is how `allocate_core()` finds and registers its processes without any
manual `register_link()` call.

!!! warning "The `--no-deps` install traps"
    When baking modules into a container image (or installing several at once), install them
    with **`pip install --no-deps`**. Two failure modes make this non-optional:

    1. **The giant image.** Resolving a heavy stack's full dependency tree can drag in a
       multi-gigabyte GPU/ML chain (nvidia, torch, triton, ray) that the Workbench never
       touches — the server renders composites and spawns workers; it does not run the sims.
    2. **The dependency-name mismatch.** Mid-rebrand, a module's own metadata may still
       require the old distribution name (e.g. `pbg-ketchup`) while the installed package is
       the new one (`viva-ketchup`). A full re-resolve then either fails or pulls a second,
       skewed copy. `--no-deps` sidesteps both by installing exactly the wheel you name and
       nothing else.

    The trade-off is that you must then add any genuinely-needed companion (like the
    `pbg-ptools` viewer plugin) by hand — also `--no-deps`.

---

## Docker

The Workbench ships a container image that is **the tool, not the science environment**. It
contains the server and its own declared dependencies (built from the repo's own `uv.lock`),
and deliberately does *not* bake in a workspace package or a compute stack. At runtime the
workspace — including its own `.venv` — is mounted at `/workspace`, and the server spawns env
workers into that interpreter.

```bash
# build + push (linux/amd64; the deploy nodes are x86_64)
deploy/build-and-push.sh [version] [org]
#   → ghcr.io/vivarium-collective/vivarium-workbench:<git-sha>

# run locally against a mounted workspace
docker run --rm -p 8000:8000 \
  -v /path/to/workspace:/workspace \
  ghcr.io/vivarium-collective/vivarium-workbench:<tag>
#   the image's default CMD is: serve --workspace /workspace --host 0.0.0.0 --port 8000
```

!!! note "The workspace must bring its own venv"
    The image sets `VIVARIUM_WORKBENCH_REQUIRE_WORKSPACE_VENV=1`: the environment resolver
    refuses to silently fall back to the thin server venv for workspace work (which could not
    import the workspace package). The mounted `/workspace/.venv` is required, and the seam
    fails loudly if it is missing.

### Cutting a semver release

```bash
deploy/bump-and-release.sh <version> [org]   # e.g. 0.3.86
```

This bumps `pyproject.toml`, commits, creates an annotated `v<version>` tag, pushes, and
dispatches the build against `main` — **refusing** unless the tree is clean, `main` is checked
out and in sync with `origin/main`, `<version>` is a real semver increase, and neither the tag
nor the image already exists. A bare short-sha build (the default) is unrestricted. Every
image records the commit it was built from in OCI labels and `/app/BUILD_INFO.json`.

---

## Kubernetes / cloud deployment

The container image is owned by the `vivarium-workbench` repo; the **Kubernetes manifests
live in the [viva-api](https://github.com/vivarium-collective/viva-api) repo** (the renamed
`sms-api`), where the Workbench is deployed as a peer service of viva-api — one deploy brings
both up. Salient facts for anyone standing it up:

- **Single replica by design.** The Workbench serves one workspace directory that it reads
  *and writes* (git commits, `runs.db`), so it runs with its own **RWO** `gp3` PVC and a
  single replica / `Recreate` strategy — no horizontal scaling.
- **The workspace is a mounted volume**, seeded once from the baked-in workspace by an
  initContainer, then owned by the running pod.
- **No new secrets.** The Workbench delegates all heavy compute/storage to viva-api over
  in-cluster HTTP (`SMS_API_BASE` → the in-cluster service DNS); it needs no Postgres, no
  IRSA, no AWS creds.

### Auth and the reverse proxy

The Workbench has **no login wall and no role-based access control**. Its only auth is a
GitHub OAuth **device flow** used purely for git operations on the Branches tab, plus a
CSRF/origin guard on mutating routes (requests with no `Origin` — curl, the local CLI, the
skills — are allowed; a present `Origin` must match `Host`).

!!! warning "Put access control in front of it"
    Because there is no login wall, anything network-reachable can drive the API. For any
    shared or public deployment, place a **reverse proxy that enforces authentication** in
    front of the server. Do not expose the raw `serve` port to an untrusted network.

### The read-only remote profile

The published, browsable dashboard is **the same codebase and the same API contract** as the
full Workbench — it is not a separate static exporter. It differs only by a **mutation
whitelist**: writes are gated, and only a small set of run-launchers and telemetry/auth
endpoints remain enabled. This is the clean way to serve an investigation's report to
external reviewers over the network without handing them authoring rights.

```bash
# export a workspace as a self-contained static bundle (the classic read-only dashboard)
vivarium-workbench-publish --workspace /path/to/workspace --out /tmp/bundle
```

The same frontend JS runs against the bundle's `api/*.json` files instead of a live server,
so a published snapshot and the live dashboard look identical. For what those reports contain,
see [Analyses, visualizations & report cards](../investigate/analyses-visualizations-report-cards.md).

---

**Next:** [A worked end-to-end example](worked-example.md)
