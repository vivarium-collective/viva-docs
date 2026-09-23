# On-disk schema reference

Everything in the Vivarium ecosystem is a file on disk. A workspace is a git repository;
the objects inside it — the workspace manifest, its studies, its investigations, its
composites — are YAML and JSON documents that you author and the Workbench reads, writes,
and commits. This chapter is the field guide to those shapes: what each file must contain,
what it may contain, and how the schemas have drifted across versions.

Three documents carry almost all the structure:

| File | What it is | Authoritative schema |
|---|---|---|
| `workspace.yaml` | the repository manifest — one per workspace | `viva_superpowers/schemas/workspace.schema.json` (Draft-07) |
| `study.yaml` | one question wrapped around a composite | migrated on load; no frozen JSON schema (see note) |
| `investigation.yaml` | a collection of studies under one research question | migrated on load; no frozen JSON schema (see note) |

For the concepts these files encode — Composite, Study, Investigation, Run, Finding,
Verdict — read [Core concepts](../foundations/core-concepts.md) first. This chapter is the
reference; that chapter is the argument.

!!! note "A word on `viva` vs `pbg`"
    The ecosystem was renamed from **pbg** to **viva**, and the migration is mid-flight.
    Prefer the `viva` spelling, but expect exceptions on disk: the Python package is
    `viva_<pkg>/` in new scaffolds (older ones use `pbg_<pkg>/`), spec ids are written
    `viva_<slug>.composites.<name>` (older schemas show `pbg_<slug>...`), and **the runtime
    control directory is still `.pbg/`** — that path did not change. See
    [The stack](../foundations/the-stack.md#a-note-on-names).

---

## `workspace.yaml` — the repository manifest

The manifest is what turns an ordinary git repository into a workspace. Its schema is the
one file in the ecosystem that is genuinely authoritative — it is validated on every load
and save by `viva_superpowers/workspace_yaml.py` (`load_workspace` / `save_workspace` /
`validate_workspace`) against `workspace.schema.json`.

### Required fields

Only four keys are required. A manifest with just these is valid.

| Field | Type | Notes |
|---|---|---|
| `schema_version` | integer, **`2` or `3`** | Current accepted versions. `3` adds `default_baseline`. |
| `name` | string | The workspace name (non-empty). |
| `created` | string, `date` | ISO date, e.g. `2026-09-23`. |
| `plugin_version` | string, semver | The `viva-superpowers` version that scaffolded it (`^\d+\.\d+\.\d+$`). |

### Key optional fields

Everything else is optional and additive. These are the ones you will actually author:

| Field | Type | What it does |
|---|---|---|
| `package_path` | string | Path to the workspace's Python package (the `viva_<pkg>/` dir) exposing `build_core()`. |
| `default_baseline` | object | v3: pre-fills a composite + params + run knobs so new studies don't repeat them (`composite`, `params`, `duration_s`, `interval_s`, `stop_on`, …). |
| `imports` | map | Imported `viva-*`/`pbg-*` repos whose composites this workspace instantiates directly (see below). |
| `expert_docs` | list | Expert PDFs/notes: `{name, path, sha256?, contributor?, claims_supported[]}`. |
| `observables` | list | Named store readouts: `{name, store_path, units?, description?}`. |
| `visualizations` | list | Declared figures: `{name, class?, type?, observables[], config?}`. |
| `simulations` | list | Named run configs: `{name, t_start, t_end, composite?, initial_state?, parameter_overrides?, emitter_config?}`. |
| `datasets` | list | `{name, path?, url?, sha256?, claims[]}`. |
| `references_bib` | string | Path to the shared `.bib`. |
| `references_pdfs` | list | `{bib_key, path, sha256}`. |
| `server` | object | `{enabled: bool}`. |
| `ui` | object | `{composite_view: "loom-explore" \| "bigraph-viz"}` — which renderer draws composite wiring. |
| `layout` | object | Per-directory relocation overrides (`studies`, `investigations`, `composites`, `reports`, …). Omit it to keep the classic flat layout. |

!!! warning "Accuracy note — `runtime:` is documented but not schema-validated"
    The concept docs describe a `runtime:` block (`default_emitter: parquet|sqlite`,
    `subprocess_timeout_s`, `shared_artifacts: [...]`). The root object in
    `workspace.schema.json` does **not** forbid extra keys, so a `runtime:` block loads
    without error — but it is **not** a defined property in the schema_version 2/3 schema.
    If you rely on it, confirm your `viva-superpowers` version reads it. The
    `default_emitter` choice is what selects the SQLite vs Parquet emitter — see
    [Emitters](../compute/emitters.md).

`imports` is worth its own note because it is how one workspace pulls in another repo's
processes. Each entry is keyed by name and shaped:

```yaml
imports:
  v2ecoli:
    source: vivarium-collective/v2ecoli   # required
    ref: main                             # required — branch, tag, or commit
    mode: reference                       # required — reference | fork-source | in-place
    path: external/v2ecoli                # optional
    installed: true                       # true once pip-installed into the venv
    install_path: external/v2ecoli        # what `pip install -e` was pointed at
```

An import is only discoverable by the engine once `installed: true` — `allocate_core()`
discovers processes by scanning **pip-installed** distributions that declare
`bigraph-schema` as a dependency. See [Install & deploy](install-and-deploy.md#the-module-catalog).

### Annotated skeleton

```yaml
# workspace.yaml — the four required keys, then the common optionals
schema_version: 3                         # 2 or 3
name: my-project
created: 2026-09-23
plugin_version: 0.22.0

package_path: viva_my_project             # the viva_<pkg>/ dir with build_core()
default_baseline:
  composite: viva_my_project.composites.baseline
  params: {media: glucose}
  duration_s: 3600
  interval_s: 1

imports:
  spatio_flux:
    source: vivarium-collective/spatio-flux
    ref: main
    mode: reference
    installed: true

observables:
  - {name: dry_mass, store_path: cell/mass/dry, units: fg}

references_bib: references/papers.bib
server: {enabled: true}
```

!!! note "Legacy keys you may still see"
    `pbg_processes: []` and `stages: {}` are held over from the v0.1.x nine-stage flow.
    They remain optional so migrated workspaces validate; new workspaces omit them.

---

## `study.yaml` — the v4 narrative spine

A study is one question asked of one composite: run it under this configuration, measure
these readouts, and turn the result into a verdict, a figure, and a report card. On disk it
is a directory (`studies/<slug>/` or, in current scaffolds,
`investigations/<inv>/studies/<slug>/`) whose `study.yaml` is the spec.

!!! warning "Accuracy note — no frozen JSON schema"
    Unlike `workspace.yaml`, there is **no** `study.schema.json` in the codebase. Specs are
    **versioned (v2 → v3 → v4) and migrated on load** by
    `vivarium_workbench.lib.spec_migration` and `investigations.load_spec()`; the
    execution-relevant subset is normalized by `study_spec.study_interface()` into
    `{composite, config, inputs, outputs, emitter}`. The section names below are faithful to
    the framework's own reference material, but exact field spellings drift between
    versions. **Confirm field names against a live workspace** (or the loader) before
    depending on them, and remember that only *declared* fields render — every field is
    optional.

The v4 spec organizes into six groups. Read top to bottom, it is the life of one study.

### Framing — what you are asking

```yaml
purpose:
  question: Does intrinsic DnaA-ATP hydrolysis alone keep the ATP fraction in band?
  mechanism: Splits the DnaA pool into apo / DnaA-ATP / DnaA-ADP; wires intrinsic hydrolysis.
  expected_outcome: failing-bio — intrinsic hydrolysis alone cannot reach [0.2, 0.5].
hypothesis: The reset network (RIDA/datA/DARS) is required, not optional.
key_assumptions:
  - Single-seed trajectory is representative for this qualitative claim.
conditions:                               # grouped replacement for baseline + variants
  baseline: {composite: viva_ecoli.composites.baseline}
  model_settings:                         # tunable-parameter catalog (value/default/range/cite)
    - {name: k_hydrolysis, value: 0.046, units: 1/min, cites: [Boesen2024]}
```

### Simulations — what to run

```yaml
simulation_set:                           # v4 replaces v3 `variants:` + `interventions:`
  - {name: baseline, base_model: baseline, condition: rich, seeds: [0, 1, 2], duration_s: 3600}
```

### Build — what to implement

```yaml
model_change: Add intrinsic hydrolysis MONOMER0-160 → MONOMER0-4565.
implementation_requirements:
  - A DnaA nucleotide-state process with apo/ATP/ADP stores.
build_plan: [Port the hydrolysis rate, wire the three stores, smoke-run 100 steps.]
inputs_to_supply: []
```

### Validation — how you will know

```yaml
readouts:                                 # v4 replaces v3 `observables:`
  - {name: datp_fraction, store_path: cell/dnaa/atp_fraction, status: emittable}
behavior_tests:
  - name: datp_in_band
    classification: primary               # primary | supporting | diagnostic | regression
    measure: {kind: generation_average, path: cell/dnaa/atp_fraction}
    pass_if: {op: in_range_every_generation, low: 0.2, high: 0.5}
    cites: [Boesen2024]
biological_summary: >
  DnaA cycles between ATP- and ADP-bound states; initiation competence tracks the
  ATP-bound fraction.
```

### Report & Decide — the conclusion

```yaml
report:
  verdict: failing-bio                    # passing | passing-with-caveats | failing-bio |
  confidence: Investigating               #   failing-impl | inconclusive | not-yet-run
  evidence_quality: single-seed
  main_insight: Intrinsic hydrolysis alone undershoots the band.
  caveat: Qualitative; not yet replicated across seeds.
findings:
  - id: hydrolysis-insufficient
    statement: The ATP fraction settles below 0.2 without the reset network.
    kind: biological                      # biological | computational | methodological
    status: confirms                      # confirms | partial | contradicts | novel
    provenance: {run_ids: [run-0007], model_commit_hash: abc123}
conclusion_logic:
  if_pass: Proceed to the box-binding study.
  if_fail: Seed a reset-network study (this is the expected branch).
pipeline_gate:
  prerequisites: [dnaa-01-expression-dynamics]
  enables: [dnaa-03-box-binding]
  proceed_condition: tests-passed
```

### Provenance — the audit trail

```yaml
seeded_from: dnaa-01-expression-dynamics
references: [{file: Boesen2024.pdf, section: "Fig 3"}]
runs:                                     # back-compat mirror of runs.db
  - {run_id: run-0007, outcomes: {datp_in_band: {result: FAIL}}}
visualizations:
  - {name: DnaANucleotideTrajectory, address: local:DnaANucleotideTrajectory}
```

!!! note "Reserved v4 field names"
    Schema v4 reserves `tests` (object), `references` (list of `{file, section}`), and
    `implementation_tasks` (string). A v3 spec with a differently-shaped field of the same
    name collides during v3 → v4 migration. The standard renames are `references:` (dict) →
    `bibliography:` and `implementation_tasks:` (list) → `tasks:`. Setting
    `schema_version: 4` short-circuits the migration.

!!! quote "Derive-on-read"
    A study renders **Ran · Tests N ✓ · Passed** only when `runs[].outcomes` (backed by
    `runs.db`) support the test results. A test with an authored `status: passed` but no run
    outcome renders as pending — this is what stops a study from *claiming* a result it
    never produced. See [Studies](../investigate/studies.md) and
    [Rigor & evidence](../investigate/rigor-and-evidence.md).

---

## `investigation.yaml` — the 9-section spine

An investigation is a named collection of studies building one cumulative argument under a
shared question. On disk it is `investigations/<slug>/investigation.yaml` — and the slug is
also a git branch and a worktree, so parallel agents never trample each other.

!!! warning "Accuracy note"
    As with `study.yaml`, there is no frozen JSON schema; investigations are `schema_version:
    1` (minimal) or `2` (the current narrative spine), migrated on load. The member-list key
    is read by `investigation_member_slugs()`, which accepts **`studies:`** (pre-migration)
    or **`members:`** (post-migration), preferring `studies:` when both are present. Confirm
    field names against a live workspace.

The spine groups into five parts:

| Group | Fields | Purpose |
|---|---|---|
| **Identity** | `schema_version`, `name`, `title`, `created`, `status` | What this is. |
| **Framing** | `question`, `hypothesis`, `lead`, `biological_story`, `glossary` | Why it exists. |
| **Membership** | `studies[]` / `members[]`, `at_a_glance`, `acceptance_criteria[{study, behavior}]`, `parts[]` | What it contains. |
| **Synthesis** | `executive`, `scientific_argument` | What it concludes. |
| **Review** | `feedback_rounds[]`, `expert_docs[]` | How it was reviewed. |

```yaml
# investigation.yaml (schema_version 2)
schema_version: 2
name: dnaa-replication
title: DnaA-driven replication initiation in whole-cell E. coli
created: 2026-09-23
status: in-progress

question: Which DnaA regulatory mechanisms are required to hold the ATP fraction in band?
hypothesis: Intrinsic hydrolysis is insufficient; the extrinsic reset network is required.
lead: eagmon

executive:                                # state-first opening, single-sourced into the report
  what_is_this: A staged port of the DnaA nucleotide cycle into the baseline cell.
  verdict: The reset network is required.
  verdict_status: in-progress             # in-progress | passed | complete | blocked | failed | planning
  decisions_needed: []

members: [dnaa-00-parameter-foundation, dnaa-02-atp-hydrolysis, dnaa-03-box-binding]
acceptance_criteria:
  - {study: dnaa-02-atp-hydrolysis, behavior: datp_in_band}

parts:                                     # optional — group members into narrative phases
  - name: "II. Nucleotide cycle"
    overview: Split the pool into apo / ATP / ADP and wire the cycle.
    studies: [dnaa-02-atp-hydrolysis]

expert_docs:
  - {name: Boesen 2024, path: references/Boesen2024.pdf}
```

!!! note "The dependency DAG is computed, not stored"
    An investigation stores **no edges**. The cross-study DAG is computed at render time
    from each member's `pipeline_gate.prerequisites`. Since August 2026 an investigation is
    also *compiled* into a process-bigraph composite — each study becomes a `StudyStep` node
    and each prerequisite edge becomes store wiring, so the real scheduler orders execution.
    A blocked prerequisite prunes the dependent member rather than a scheduler deciding "skip
    this." See [Investigations](../investigate/investigations.md).

---

## The on-disk workspace layout

Putting it together, a workspace directory looks like this:

```text
my-project/                                    # a git repository
├── workspace.yaml                             # the manifest (schema above)
├── viva_my_project/                           # the Python package (package_path)
│   ├── core.py                                #   build_core() — the type/process registry
│   ├── composites/<id>.composite.json         #   runnable substrate (JSON or a generator .py)
│   ├── processes/                             #   Process / Step classes
│   └── visualizations/                        #   @as_visualization / Visualization steps
├── investigations/
│   └── <inv-slug>/
│       ├── investigation.yaml                 #   the collection (= git branch = worktree)
│       ├── studies/<study-slug>/study.yaml    #   nested studies (current convention)
│       └── reports/                           #   per-investigation report HTML
├── studies/                                   # flat studies (legacy path — still resolves)
│   └── <study-slug>/
│       ├── study.yaml                         #   the question + spine
│       ├── runs.db                            #   canonical run + outcome record (SQLite)
│       └── parquet-runs/<run>/                #   emitted trajectories (Parquet hive)
├── references/papers.bib                      # shared bibliography
├── notes/                                     # field records — cleanup PRs must SPARE these
└── .pbg/                                       # runtime control dir (NOT renamed to .viva/)
    ├── server/                                #   dashboard runtime state (server-info, pid, log)
    ├── artifacts/<hash>/                      #   content-addressed artifact store
    └── worktrees/<inv-slug>/                  #   per-investigation worktrees
```

Two runtime artifacts are worth calling out because you will read them directly:

- **`runs.db`** — a per-study SQLite database. Its `runs_meta` table is the authoritative
  provenance record (`run_id`, `started_at`, `completed_at`, `composite`, `variant`,
  `emitter_path`, `generation_id`). Every run appends here; the derive-on-read verdict reads
  from it. Some visualizations (3D viewers, nested coordinate arrays) open it directly.
- **`parquet-runs/<run>/`** — the emitted trajectories, when the workspace's emitter is
  Parquet. The SQLite emitter instead writes full per-step state into `runs.db`.

!!! note "The relocatable layout"
    A workspace may move any of these directories via the `layout:` block in
    `workspace.yaml`; tooling resolves paths through `WorkspacePaths`, never by hardcoding
    the names. The tree above is the conventional flat default.

### Schema-version drift at a glance

Because the ecosystem is mid-migration, the three documents version independently:

| Document | Versions | What later versions add |
|---|---|---|
| `workspace.yaml` | **2 → 3** | v3 adds `default_baseline`. |
| `study.yaml` | **2 → 3 → 4** | v3 adds the canonical body; v4 adds the narrative spine and reserves `tests`/`references`/`implementation_tasks`. |
| `investigation.yaml` | **1 → 2** | v2 adds the 9-section narrative spine and the `executive` block. |

Legacy v2 studies live at `investigations/<name>/spec.yaml` and are migrated in memory on
read. When in doubt, the **loader is the authority**, not a frozen list.

---

**Next:** [Install & deploy](install-and-deploy.md)
