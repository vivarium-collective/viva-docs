---
tags:
  - reference
  - skills
  - agents
---
# Skill reference

The `/viva-*` skills are the ecosystem's AI layer — a Claude Code plugin
(`viva-superpowers`) whose commands author and drive everything else. They are
**thin clients**: shell + `curl` + calls into the `viva_superpowers` Python
helpers and the [Workbench HTTP API](http-api.md). Almost nothing here does
useful work on its own; the Workbench is the backend.

This chapter is the catalog — every skill, what it does, and which API or helper
it wraps. For the request surface those skills call, cross over to the
[HTTP API reference](http-api.md); for how an agent drives them end to end, see
[Working with AI agents](../investigate/working-with-agents.md).

!!! info "On this page"
    **What's here** the full `/viva-*` skill catalog — every command, what it
    does, and which HTTP endpoint or `viva_superpowers` helper it wraps. · **See
    also** the [HTTP API reference](http-api.md) for the request surface, and
    [Working with AI agents](../investigate/working-with-agents.md) for the loop
    an agent drives end to end.

!!! note "Two preconditions every dashboard-touching skill assumes"
    1. **A workspace** — a directory with a `workspace.yaml` and a `viva_<pkg>/`
       Python package. Create one with [`/viva-workspace`](#workspace-lifecycle).
    2. **A running Workbench server** — started with
       [`/viva-workbench start`](#workspace-lifecycle). Skills discover its base
       URL by reading `.pbg/server/server-info`.

    Each skill opens with the same preamble: walk up to `workspace.yaml`, read the
    server URL from `.pbg/server/server-info`, run a version-skew preflight that
    warns but never fails. A missing precondition fails the skill with an
    actionable error that names the fix.

!!! info "`pbg` → `viva` naming"
    Skills are `/viva-*`; the older `/pbg-*` command names have been dropped (the
    Python import shim `pbg_superpowers` remains). The runtime control directory
    is still **`.pbg/`** and the global registry still **`~/.pbg/`** — those paths
    did not change. Some in-repo convention docs still say `pbg` and show
    `pbg-<tool>` repo names; read them as `viva`. See
    [The stack — a note on names](../foundations/the-stack.md#a-note-on-names).

---

## Workspace lifecycle { #workspace-lifecycle }

Bootstrap a workspace, then bring the server up.

| Command | Purpose | Wraps |
|---|---|---|
| `/viva-workspace <name> [--upstream owner/repo] [--in-place]` | Scaffold a research workspace — three modes: **upstream-branch** (clone a model repo, branch a workspace on top), **standalone** (clone `viva-template`), **in-place** (promote an existing git checkout). | `vwb scaffold-workspace` / `catalog-add`; `viva_superpowers.scaffold` |
| `/viva-workbench start\|stop\|status\|open\|restart` | Start / stop / open the interactive dashboard server (the side-rail-tabbed UI). Session-per-tab: one server multiplexes many workspaces, one per browser tab. `open --composite <spec-id>` opens the **Composite Explorer** focused on a spec. Formerly `/pbg-dashboard`. | `vwb serve` / `server-*`; writes `.pbg/server/server-info`, registers `~/.pbg/servers/*.json` |
| `/viva-init` | One-shot, per-machine: symlink the `/viva-*` skills into `~/.claude/skills/` so Claude can invoke them. | filesystem symlinks (fallback: `/plugin install`) |

!!! tip "`/viva-workspace` picks its mode from the flags"
    Pass `--upstream owner/repo` to branch a workspace on top of an existing model
    repo; pass nothing to clone the standalone template; pass `--in-place` inside
    an existing checkout to promote it. Composite-only repos (no `workspace.yaml`)
    are promoted with `--in-place`.

---

## Wrap & compose { #wrap-compose }

One skill, four modes. `/viva-expert` is the process-bigraph API expert: it wraps
a simulator as a process-bigraph `Process`/`Step`, or composes several wrapped
simulators together.

| Command | Purpose | Wraps |
|---|---|---|
| `/viva-expert <tool>` | Wrap a simulator as a Process. | process-bigraph API; sibling-repo scaffold `templates/model/`; `core_compose.py` |
| `/viva-expert <name> <tool1> <tool2> …` | Compose two or more wrapped simulators into one composite. | same, composite terminus |

**The default bridges the *real* upstream tool** — locate it (PyPI, GitHub,
binary), install/build it into the wrapper's venv, run a minimal example, then
drive it from the Process's `update()`. It keeps trying when the build is hard and
**never silently downgrades** to fake behavior. Producing a mock or a
reimplementation is always an explicit opt-in.

| Mode | Flag | What lands | `update()` drives |
|---|---|---|---|
| **Heavy** (default) | *(none)* | A sibling `viva-<tool>/` repo — Process class, tests, README, HTML report, a showcase investigation with studies and interactive viz, a **published read-only workbench**, and a local commit. | the genuine installed tool |
| **Lightweight** | `--lightweight` (alias `--in-workspace`) | One file `viva_<slug>/processes/<tool>.py` plus a test, **inside the current workspace**. No sibling repo, no publish, no commit. **Still bridges the real tool.** | the genuine tool |
| **Reproduce** | `--reproduce` (alias `--reimplement`) | A clean-room, honestly-labeled `<Tool>ReproductionProcess` (secondary class, never the headline). | a clean-room reimplementation |
| **Mock** | `--mock` (alias `--stub`) | A labeled, non-functional `<Tool>MockProcess` (real ports, inert `update()`) for scaffolding/wiring only. The **only** path that emits fake behavior. | nothing real |

!!! warning "`--mock` and `--reproduce` are opt-in and mutually exclusive"
    The skill never chooses either on its own. If the real bridge genuinely can't
    run in the environment, it climbs an escalation ladder (PyPI → source build →
    pinned older release → the tool's own Docker/conda recipe for hints) and then
    *asks* which flag you want — it does not decide to fake behavior for you.

---

## Studies & runs { #studies-runs }

Turn composites into runs, and runs into gated evidence. See
[Studies](../investigate/studies.md) for the concepts these commands author.

| Command | Purpose | Wraps |
|---|---|---|
| `/viva-run <composite-id> [--steps N] [--emit p1,p2]` | Smoke-test a catalog composite directly — run N steps (default 5), report emitted observables. No Study touched. Detached: the POST returns `202 {run_id}`; poll status, then read `.pbg/runs/<run_id>/observables.json`. | `POST /api/composite-test-run`, `GET /api/composite-run/{run_id}/status` |
| `/viva-study <subcommand> …` | Full Study CRUD across the **Design → Build → Simulate → Evaluate → Decide** lifecycle — baselines, variants, interventions, runs, findings, conclusions on a `study.yaml`. | `/api/study-*` (create, run-baseline/-variant, grade); `study_io` / `study_status` / `study_evaluator` |
| `/viva-investigation <subcommand> …` | Manage Investigations — named collections of Studies under one research question, with a cross-study DAG. Subcommands: `new`, `open [--share-artifacts]`, `list`, `add-study`, `remove-study`, `set-overview`, `set-status`, `scaffold-from-plan <plan.pdf>`, `run [--keep-going]`, `close`. An investigation is a git branch and a worktree. | `POST /api/investigation-create`, `/api/investigation-summaries`, `/api/iset-close` |
| `/viva-viz <viz-name> '<description>'` | Generate a v2 decorated-function `Visualization` into `viva_<pkg>/visualizations/` from a natural-language description. Pushes for the most interactive, informative figure the data supports. | `process_bigraph.visualization.as_visualization`; a disk handoff — reads `.pbg/viz-requests/<name>.md` (the dashboard writes the request via `POST /api/visualization-generate`; there is no `/api/study-viz-add`) |
| `/viva-report [model \| --all \| --audit \| --lint \| --force]` | Regenerate the dashboard + per-investigation reports. Runs a reviewer-readiness audit (**Pass A** — verdict↔chart drift, stale framings, required new-viz proposals) then a structural lint (**Pass B**) then renders. Run it before sending a report out. Idempotent. | `report.py`, `report_linter.py`; renders `reports/index.html` |

!!! note "`/viva-study` subcommands, by phase"
    - **Design** — `new <composite-id>`, `fill-overview`, `set-objective`,
      `baseline-add`/`baseline-remove`, `variant-add`/`variant-set-params`/`variant-delete`,
      `intervention-add`/`-update`/`-delete`, `add-literature-anchor`, `add-requirement`.
    - **Design → Build gate** — `verify`, `check-observables` (guards against
      fabricating an observable the composite can't emit), `preview-viz`. *Don't run until both pass.*
    - **Simulate** — `run-baseline`, `run-variant`, `run-script`, `refresh-viz`, `clean`.
    - **Decide** — `set-conclusion`, `set-verdicts`, `findings`,
      `propose-followup`, `seed-from-followup`. *No verdict without fresh evidence.*

---

## Navigate & status { #navigate-status }

Read where you are without running anything. These are pure deterministic
queries — no AI, no writes.

| Command | Purpose | Wraps |
|---|---|---|
| `/viva-catalog [list \| install <pkg> \| uninstall <pkg>]` | Browse or mutate the workspace module catalog — list installed/available modules, install a curated package, uninstall one. `list` is the default. | `GET /api/workspace-manifest`, `POST /api/catalog-install`, `POST /api/catalog-uninstall`; `workspace_catalog.py` |
| `/viva-navigate <subcommand>` | Read-only knowledge-graph queries. `status` (workspace/server/git check) · `decisions <inv>` (the ranked "what needs your decision" list) · `ac-gaps <inv>` · `source <bib_key>` · `finding-by-observable <token>` · `dag <inv>` · `observable <token>` · `composite <id>`. | `GET /api/linkage-index`, `GET /api/needs-attention` |

!!! info "`viva-status` and `viva-explore` are not separate skills at this HEAD"
    They fold into the two skills above and into `viva-workbench`:

    | You may see | It is actually |
    |---|---|
    | `/viva-status` | `/viva-navigate status` |
    | `/viva-explore <spec-id>` | `/viva-workbench open --composite <spec-id>` (opens the Composite Explorer) |

    An older packaged snapshot shipped these as standalone commands; the current
    `skills/` directory does not. Prefer the folded-in forms.

---

## Evidence & rigor { #evidence-rigor }

Make a study's claims defensible: grade it, cite its bands, write its biology.

| Command | Purpose | Wraps |
|---|---|---|
| `/viva-tests <author \| enrich \| run \| audit \| cite-bands> <study> [name]` | Author, enrich, run, audit, and cite a study's **graded report cards** — the `TestStep`s that compile a run into a pass/fail verdict *and* a signed `margin` (distance-to-pass) plus a cross-iteration diff. Bands over magic numbers. `audit` judges whether the tests are rigorous enough to validate *before* they're locked. | `viva_superpowers.check()` / `TestBuilder` (`test_contract.py`), `test_audit.py`, `band_provenance.py`; `POST /api/study-tests-run`, `/api/study-grade`, `/api/study-test-audit` |
| `/viva-harden-investigation [slug \| biology-forward <study-slug>]` | Make an Investigation or Study rigorous — triage the load-bearing claim↔evidence gap, root-cause failing report-card gates, resolve open `decisions_needed`. The `biology-forward <study>` aspect fills quantitative finding slots (`evidence.observed`, `expected.range`, `divergence_factor`) deterministically, then guides you to author the mechanism prose over that scaffold. | `finding_observations.py`, `rigor.py`, `report_linter.py`; `POST /api/study-findings-populate-observations`, `/api/study-sync-runs` |

!!! info "`viva-cite-bands` and `viva-biology-forward` are subcommands"
    Like `viva-status`/`viva-explore`, these are not standalone dirs at this HEAD:

    | You may see | It is actually |
    |---|---|
    | `/viva-cite-bands <study>` | `/viva-tests cite-bands <study>` |
    | `/viva-biology-forward <study>` | `/viva-harden-investigation biology-forward <study>` |

    `cite-bands` surfaces candidate evidence from expert PDFs for uncited
    acceptance bands and writes structured `cites`/`calibration_anchor` provenance
    into `study.yaml` — its only sanctioned write path is
    `POST /api/band-provenance` (comment-preserving), never a direct import.

---

## Also shipped { #also-shipped }

Beyond the groups above, the plugin ships a few more skills for the autonomous
loop, remote compute, and session setup.

| Command | Purpose | Wraps |
|---|---|---|
| `/viva-model-build <study-slug> [--autonomous]` | Drive the agentic model-building loop: author acceptance-criteria Tests → **audit** their sufficiency → **lock** them → build/run/evaluate → iterate the *model* (never the locked Tests) until the severity gate passes or it gives up honestly. Driver only — it never grades. | `loop_state.py`, `module_sourcing.py`, `study_verdict.py`; state in `.pbg/loop/<study>.json` |
| `/viva-remote-run <connect \| submit \| status \| fetch>` | Run a workspace composite **remotely on viva-api (GovCloud)** — connect (SSO + SSM tunnel), submit, poll, fetch. The composite declares its own emitter. Framework-generic. | the viva-api remote-run flow (see [HTTP API — Remote / GovCloud](http-api.md#remote-govcloud)) |
| `/viva-benchmark <suite> [--variant-label] [--score-only]` | Score the framework's model-building ability: run a suite of open-ended questions through the autonomous loop, grade each with a reference-free rubric, write a `benchmark_report/v1` you can diff across framework variants. | `benchmark_run.py`, `benchmark_score.py` |
| `/viva-orient` | Session-start orientation to the `/viva-*` skills, the two preconditions, and a routing table. **Auto-injected** by the SessionStart hook — not a command you run. | the SessionStart hook (`hooks/session-start`) |
| `/viva-suggest <request-id>` | **Internal** dashboard callback for the Workbench "Suggest" button — drafts a repo name, PR title, or PR body from a request file. `user-invocable: false`; the dashboard prints the exact command when it's needed. | `.pbg/agent-requests/` ↔ `.pbg/agent-responses/` files; `POST /api/suggest` |

!!! warning "Accuracy note — skill count drifts"
    The repo's own docs disagree on the total (`README` says 15 in one place, 18 in
    another; `docs/skills.md` says "15 user-facing"). The `skills/` directory at the
    verified HEAD holds **18 skill directories**; of those, `viva-orient` is
    auto-injected and `viva-suggest` is not user-invocable. Treat the directory as
    authoritative and don't rely on a fixed headline number.

---

**Next:** [HTTP API reference](http-api.md)
