---
tags:
  - reference
  - api
  - agents
---
# HTTP API reference

The Workbench is a **FastAPI app under uvicorn** (`vivarium_workbench/api/app.py`).
Every `/viva-*` skill drives it; every mutating call commits to the active git
branch in the workspace. The surface is large — at the verified HEAD `api/app.py`
registers **253 routes** (122 GET, 122 POST, 7 DELETE, 2 PATCH; 245 unique paths,
no WebSocket); the in-repo survey's older headline of "260 routes / 135 POST /
119 GET" is stale, so trust a live recount over any fixed number — so this
chapter organizes the ones that matter along the **Investigations → Studies →
Runs** spine, as reference tables. It is not the generated spec: for exact request
and response shapes, read `GET /openapi.json` (also `/docs`, `/redoc`) on a live
server.

For the commands that call these endpoints, cross back to the
[Skill reference](skills.md); for the agent's-eye view of the whole loop, see
[Working with AI agents](../investigate/working-with-agents.md).

!!! info "On this page"
    **What's here** the Workbench REST surface organized along the
    Investigations → Studies → Runs spine, as reference tables — plus the
    generated-spec pointers (`/openapi.json`, `/docs`, `/redoc`) for exact
    shapes. · **See also** the [Skill reference](skills.md) for the commands that
    call these endpoints, and [Working with AI agents](../investigate/working-with-agents.md).

!!! note "The agent access contract"
    - **Base URL** comes from `.pbg/server/server-info` — never hardcode a port.
    - **No auth, trusted-localhost.** A same-origin CSRF guard covers every
      POST/DELETE; requests with **no `Origin` header** (curl, a CLI, an agent) are
      allowed, and a present `Origin` must match `Host`. There is no token and no
      Host allowlist.
    - **Runs are async.** A run returns a `run_id`; poll status and **check the
      result field, not just the HTTP status** — a failed run can still return 200.
    - **Every write is a git commit** in the workspace, so the whole history is an
      audit trail.

```bash
# Orient against a running server — the three calls to start with.
BASE=$(tr -d '[:space:]' < .pbg/server/server-info)
curl -s "$BASE/api/workspace-manifest" | jq .      # one-call situational snapshot
curl -s "$BASE/api/linkage-index"      | jq .      # the cross-reference graph
curl -s "$BASE/openapi.json"           | jq '.paths | keys'   # exact shapes
```

---

## Orientation { #orientation }

Start here. These read the local workspace and tell an agent where it is.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/workspace-manifest` | GET | One-call situational snapshot: workspace, composites, studies, registry, health, skills. **Start here.** |
| `/api/linkage-index` | GET | Deterministic cross-reference graph (`ac_gating_matrix`, `studies_for_source`, `findings_for_observable`, `study_dag`, `composite_emits`…). Backs `/viva-navigate`. |
| `/api/needs-attention` | GET | The "decisions needed" scan (uncovered ACs, verdict divergence, open feedback, param drift, stale findings). |
| `/api/events` | GET (SSE) | Server-sent workspace-state stream; `/api/events/log` is the durable `.pbg/events.jsonl`. |
| `/api/workspace`, `/api/inputs`, `/api/state`, `/api/ui-config`, `/api/server-version` | GET | Workspace summary, declared inputs, UI config, server version. |
| `/health` | GET | Service liveness (note: no `/api` prefix). |

```http
GET /api/workspace-manifest HTTP/1.1
Host: 127.0.0.1:PORT
```

```json
{
  "workspace": {"name": "my-model", "package": "viva_mymodel", "branch": "main"},
  "composites": ["viva_mymodel.composites.baseline"],
  "studies":   [{"slug": "overflow-metabolism", "phase": "Evaluate"}],
  "health":    {"ok": true}
}
```

---

## Workspaces & sources { #workspaces-sources }

Switch which workspace or which built simulator a session points at.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/workspaces` | GET | List known workspaces + running dashboards. |
| `/api/workspaces/add`, `/forget`, `/start`, `/stop`, `/cleanup-stale` | POST | Register, drop, start, stop, or GC a workspace server. |
| `/api/source/manifest` | GET | The provenance manifest `{repo, commit, branch, workspace, lockfile, results, simulator_id}` — the join key for the round-trip pipeline. |
| `/api/source/builds`, `/api/source/materialization`, `/api/source/remote-health` | GET | Available builds, staging/venv materialization status, remote health. |
| `/api/source/switch`, `/api/source/switch-build` | POST | Point the session at a repo/ref, or at a built `simulator_id`. |
| `/api/source/build-remote`, `/api/source/materialize-repo` | POST | Ask viva-api to build a `repo@branch`; stage a repo locally. |

---

## Composites { #composites }

Resolve, inspect, run, and promote composites. The Composite Explorer is built on
these; `/viva-run` calls `composite-test-run`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/composites` | GET | The registry — every composite the workspace can import. |
| `/api/composite-resolve`, `/api/composite-state`, `/api/composite-inner-state` | GET | Resolve an id to a document; read its state tree. |
| `/api/composite-layout`, `/api/composite-default-view` | GET | Explorer layout + default view for the loom viewer. |
| `/api/composite-config-translate`, `/api/config-to-composite` | GET/POST | Translate between a config form and a composite document. |
| `/api/composite-config-persist` | POST | Explorer config upload → parameter becomes an absolute path. |
| `/api/composite-promote-to-catalog` | POST | Save a configured composite into the workspace catalog. |
| `/api/composite-test-run` | POST | **Dispatch a detached scratch run** — writes a request JSON, spawns the runner fully detached, returns `202 {run_id, status:"running"}`. |
| `/api/composite-runs` | GET | List scratch runs. |
| `/api/composite-run/{run_id}` | GET | One run; sub-paths `/status`, `/state`, `/stop`, `/download`, `/artifact/{name}`. |

```bash
# Fire a 10-step scratch run, then poll it (the /viva-run pattern).
RID=$(curl -s -X POST "$BASE/api/composite-test-run" \
      -H 'Content-Type: application/json' \
      -d '{"composite_id":"viva_mymodel.composites.baseline","steps":10}' | jq -r .run_id)
curl -s "$BASE/api/composite-run/$RID/status" | jq .   # poll until done, then read observables
```

---

## Studies { #studies }

The largest area (**~54 routes** at HEAD). A study picks composites, declares what to run
and measure, owns its `runs.db`, and rolls up to a verdict. See
[Studies](../investigate/studies.md).

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/study/{slug}` | GET | One study's normalized spec + effective status. |
| `/api/study-create`, `/api/study-create-from-composite`, `/api/study-create-from-run` | POST | Create a study, or seed one from a composite/run. |
| `/api/study-baseline-add`, `/api/study-baseline-remove` | POST | Manage baseline composites. |
| `/api/study-variant-add`, `/api/study-variant-set-params`, `/api/study-variant-delete` | POST | Manage parameter-override variants. |
| `/api/study-intervention-add`, `/-update`, `/-delete` | POST | Manage text-only experimental conditions. |
| `/api/study-readouts`, `/api/study-readout-migrate`, `/api/study-observable-check`, `/api/study-verify` | GET/POST | Declare/verify readouts against what the composite actually emits. |
| `/api/study-run-baseline`, `/api/study-run-variant` | POST | **Run** — build the composite in-process, merge params, record the trajectory in `runs.db`. |
| `/api/study-run-delete`, `/api/study-runs-clear`, `/api/study-sync-runs` | POST | Delete a run, clear runs, or reconcile `runs.db` → yaml. |
| `/api/study-grade`, `/api/study-tests-run`, `/api/run-tests` | POST | Compile a run into per-test verdicts. `study-grade` is the fast, no-re-sim path. |
| `/api/study-test-audit`, `/api/study-audit`, `/api/study-rigor` | GET | Tests-sufficiency audit, reproducibility audit, rigor scorecard. |
| `/api/study-findings`, `/api/study-findings-populate-observations` | POST | Author findings; fill quantitative finding slots deterministically. |
| `/api/study-set-analyses`, `/api/study-analysis-outputs`, `/api/study-analysis-file`, `/api/study-analysis-zip` | GET/POST | Post-run Analysis Steps + their outputs. |
| `/api/study-charts/{slug}`, `/api/study-behavior-card/{slug}`, `/api/study-refresh-viz/{name}` | GET/POST | Rendered charts and the behavior-test report card. |
| `/api/study-report-single`, `/api/study-reproduce`, `/api/study-rename`, `/api/study-export` | GET/POST | Single-study report, reproduce, rename, export. |
| `/api/study-seed-followup`, `/api/study-narrative-command` | POST | Seed a follow-up study; narrative writes. |
| `/api/study/{slug}/figures.zip`, `/outputs.zip`, `/notebook` | GET | Bundled downloads. |

!!! note "Two run engines behind the study spine"
    A **scratch run** (`/api/composite-test-run`) is detached and durable — it
    returns `202` and outlives the request. A **study run**
    (`/api/study-run-baseline` / `-run-variant`) runs *synchronously inside the
    HTTP request* today and owns the durable science in `studies/<slug>/runs.db`.
    Both join the dashboard's `runs_meta` table to the engine-written trajectory on
    `run_id`.

---

## Investigations { #investigations }

A DAG of studies under one research question (**~41 routes** at HEAD). Since PR #715 an
investigation compiles into a process-bigraph composite so the real scheduler
orders execution.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/investigations` | GET | List investigations. |
| `/api/investigation/{slug}` | GET | One investigation (+ `/report`, `/figure/{n}.{ext}`, `/figures.zip`, `/figures-build`). |
| `/api/investigation-create`, `/api/investigation-clone`, `/api/investigation-delete` | POST | Lifecycle. |
| `/api/investigation-graph`, `/api/investigation-state-tree`, `/api/investigation-summaries` | GET | The DAG canvas, the compiled state tree, roll-up summaries. |
| `/api/investigation-composite`, `/-add`, `/-doc`, `/-perturb`, `/-rebuild` | GET/POST | The investigation-as-composite: inspect, add members, rebuild the compiled document. |
| `/api/investigation-run`, `/-run-one`, `/-run-unblocked` (+ `-status`), `/-rerun`, `/-trigger` (+ `-status`) | POST/GET | Run all, one, or just the unblocked members; pull-or-compute triggers. |
| `/api/investigation-comparison`, `/-add`, `/-update` | GET/POST | Baseline + variant overlays for comparison charts. |
| `/api/investigation-add-viz`, `/api/investigation-render-viz`, `/api/investigation-viz-html` | POST/GET | Investigation-level visualizations. |
| `/api/investigation-report/{slug}`, `/api/investigation-rigor` | GET | Rendered report; investigation rigor. |
| `/api/iset-close` | POST | Close an investigation → render report, stamp `status: closed`, open a PR. **Never auto-merges.** |

---

## Visualizations { #visualizations }

Declared Visualization Steps render to HTML after a run. `/viva-viz` authors them
through a request/response handoff on disk.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/visualization`, `/api/visualization-classes`, `/api/visualization-instances` | GET | The viz catalog and instances. |
| `/api/visualization-create`, `/api/visualization-generate` | POST | Request generation of a new viz (writes `.pbg/viz-requests/<name>.md`). |
| `/api/visualization-preview`, `/api/visualization-preview-instance`, `/api/visualization-status` | GET/POST | Preview a generated viz before committing. |
| `/api/visualization-accept`, `/api/visualization-add-to-project`, `/api/visualization-commit-batch` | POST | Stage + commit accepted viz code. |
| `/api/saved-visualizations` | GET | Saved interactive viz (3D packs, PTools cards) for the Analyses tab. |
| `/api/loom-savepoint`, `/api/loom-savepoints` | POST/GET | Save-points for the embedded `bigraph-loom` state-tree viewer (`/loom-explore`). |

---

## Analyses & run data { #analyses-explorer }

The Runs tab indexes runs across every emitter backend; the Analysis tab hosts
saved interactive visualizations, 3D viewers, and the Analysis Tools / PTools card.
(The standalone no-code Data Explorer was removed — see the note below.)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/simulations`, `/api/simulation`, `/api/simulation-run`, `/api/simulation-run-download` | GET | The Simulations DB / runs index. |
| `/api/data-sources`, `/api/data-source-file` | GET | Emitter-backend data sources. |
| `/api/observables`, `/api/observable`, `/api/generation`, `/api/study-results`, `/api/study-bigraph-paths` | GET | Observable listing and per-run result reads that back the explorer panels. |
| `/api/analysis-tools`, `/api/analysis-viewers`, `/api/analysis-viewer/{uid}/launch` | GET/POST | The Analysis Tools catalog and external viewers (e.g. PTools). |

!!! warning "Accuracy note — the `/api/explorer/*` routes"
    The design doc `docs/data-explorer.md` and older surveys describe explorer
    endpoints `GET /api/explorer/{runs,observables,flux,vector}` and
    `POST /api/explorer/series`. **These are not registered in `api/app.py` at the
    verified HEAD** — the "Data explorer routes" section is now empty, and the
    explorer data appears to be served through `/api/observables`,
    `/api/observable`, `/api/generation`, and `/api/study-results` instead. Verify
    against `GET /openapi.json` on your server before depending on an
    `/api/explorer/*` path.

---

## Remote / GovCloud { #remote-govcloud }

Off-load compute to **viva-api** (the GovCloud simulation backend). Point the
server at it with `VIVA_API_BASE` (fallback alias `SMS_API_BASE`), then submit
runs that execute remotely (Ray → AWS Batch → zarr/parquet on S3) and land back
as study runs. Reaching a GovCloud endpoint needs an SSM tunnel. Backs
`/viva-remote-run`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/remote-run-build`, `/api/remote-run-pinned-build` | POST | Build (or pin-build) a simulator on viva-api. |
| `/api/remote-run-submit`, `/api/remote-run-start` | POST | Submit a run. |
| `/api/remote-run-land`, `/api/remote-run-land-artifacts`, `/api/remote-run-analysis` | POST | Land results + artifacts + analyses locally. |
| `/api/remote-run-poll`, `/api/remote-run-status`, `/api/remote-run-config` | GET | Poll a submitted run. |
| `/api/remote-run-chain-progress`, `/api/remote-dispatch-preflight` | GET | Chain progress; pre-dispatch validation. |
| `/api/remote-analysis-figure(s)`, `/api/study-remote-figures` | GET | Remotely-produced figures. |

---

## Git & workstream { #git-workstream }

Every write already commits; these manage branches, PRs, and status (the GitHub
Branches tab).

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/work-start`, `/api/work-end`, `/api/work-push`, `/api/work-create-pr`, `/api/work-link-branch`, `/api/work-attach-report` | POST | Workstream lifecycle → branch → PR. |
| `/api/work-status`, `/api/work-composite-diff` | GET | Current workstream + composite diff. |
| `/api/git-status`, `/api/dirty-status`, `/api/dirty-commit-all`, `/api/branch/push` | GET/POST | Working-tree status, commit-all, push. |
| `/api/github-repo`, `/api/auth/github/{start,poll,status,token,orgs,logout}` | GET/POST | GitHub device-flow auth. |

---

## References, catalog & suggest { #references-catalog }

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/registry`, `/api/registry/process-template`, `/api/registry/run-process` | GET/POST | The discovered Process/Step registry; run a process interactively. |
| `/api/catalog`, `/api/catalog-install`, `/api/catalog-uninstall`, `/api/catalog-uninstall-impact`, `/api/marketplace` | GET/POST | The module catalog + marketplace. Backs `/viva-catalog`. |
| `/api/module-import-diagnostics`, `/api/ecosystem-index`, `/api/framework-metrics` | GET | Import diagnostics; ecosystem federation index; metrics. |
| `/api/references-bib`, `/api/reference-bibtex`, `/api/reference-pdf`, `/api/dataset`, `/api/expert-doc`, `/api/expert-search` | GET/POST | Bibliography, PDFs, datasets, expert-doc search. |
| `/api/report-lint`, `/api/citation-gaps`, `/api/band-provenance` | GET/POST | Report linter, uncited-band gaps, band provenance (the `cite-bands` write path). |
| `/api/finding`, `/api/conclusion`, `/api/decision`, `/api/evidence` | POST | Narrative/decision writes. |
| `/api/suggest`, `/api/suggest-poll` | POST/GET | The "Suggest" button → `/viva-suggest`. |

---

## The dashboard-API vs viva-api split { #api-split }

Two services, two layers, joined on one key.

| | **Dashboard API** (`api/app.py`) | **viva-api** (GovCloud) |
|---|---|---|
| Role | Reads the **local workspace** and orchestrates | Remote **compute + build + storage** |
| Owns | investigations, studies, composites, registry, charts, catalog, references | simulator builds, run lifecycle, result storage/streaming |
| Paths | flat `/api/<resource>` (FastAPI + pydantic v2) | versioned `/core/v1/simulator/*`, `/api/v1/simulations/{id}/*`, `/compose/v1/*` |
| Join key | `SimRow` (local index entry) | `SimulationRun` (cloud compute record) |

The dashboard **consumes** viva-api, never duplicates it — its hand-written client
is `lib/sms_api_client.py` (config `VIVA_API_BASE` / `SMS_API_BASE`, default
`http://localhost:8080`). A run submitted remotely lands back as a study run in the
local workspace, and the two records are joined on **`run_id`**.

!!! info "Design vs shipped"
    The survey (`docs/workbench-api-survey.md`) is explicit that it "records what
    the API *does* today, not what it should" — some routes are accidental, some
    design specs (`WorkspaceStore`, `SessionRegistry`, a single `RunBackend`) are
    only partly landed. Where a route's name here differs from a live server, trust
    `GET /openapi.json`.

---

**Next:** [On-disk schema reference](schemas.md)
