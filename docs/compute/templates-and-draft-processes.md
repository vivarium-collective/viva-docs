---
tags:
  - template
  - draft-process
  - composite
---
# Templates & draft processes

[Core concepts](../foundations/core-concepts.md) establishes that a composite, a template, a
study, and an investigation are all *the same kind of thing* — a typed document — differing
in structure, not in execution machinery. This chapter is about interface-first modeling:
designing a document with the mechanism deliberately left out, and filling it in later.

There are two ways to leave a mechanism out, and they are worth keeping apart:

- A **site** is an empty *hole* — a place where a whole composite, process, or value has to
  plug in before the document can run.
- A **draft process** is a present-but-*inert* node — the interface is there, wired and
  visible, but it carries no dynamics, so it no-ops when stepped.

A site makes a document refuse to run; a draft lets it run and simply does nothing. Both let
you commit to the *shape* of a model before you commit to its *behaviour*.

## Sites, fill, and ground

Sites, fill, and ground are three ideas: a typed **document**, the **fill** operation that
fills its sites, and the **`is_ground`** law that lets a document run only when no required
site is left unfilled. (Core concepts states these as the "one object, one operation, one
law" triad.)

A **template** is just a document that still has holes. The holes are **sites**, written in
the document as `{"_type": "site", ...}`; each site records the *face* (the port interface)
a filler must present. The one operation on documents is **fill** — substitute a value or a
sub-composite into a site. And the one law is **groundness**: `Composite` refuses to build a
document with any open *required* site, because "an open site is a hole where a process
should be."

```mermaid
flowchart LR
    T["Template<br/><small>document with an open site</small>"] -->|"fill(model)"| G["Ground document<br/><small>no required sites left</small>"]
    G -->|"Composite(...)"| R["Runnable"]
    T -.->|"Composite(...)"| X["Refused<br/><small>not ground</small>"]
    style X stroke-dasharray: 4 4
```

The primitives live in **bigraph-schema** — this is the layer that owns "what a document
*is*." Filling and the groundness check are real, shipped functions:

| Concept | Where it lives | What it is |
|---|---|---|
| a **site** (place-graph hole) | `bigraph_schema.schema` (`Site`), re-exported through `assembly` | a hole in the place graph a filler substitutes into |
| **`fill`** | `Core.fill(schema, state, ...)` | substitute fillers into open sites; incremental |
| **`is_ground`** | `bigraph_schema.assembly.is_ground(schema)` | true iff no sites remain and all ports are wired |

!!! note "Verified against code"
    `is_ground` is a real function in `bigraph_schema/assembly.py` ("no Sites, all ports
    wired"); `Core.fill` is a real method in `bigraph_schema/core.py`; the `Site`
    place-graph hole is a real type defined in `bigraph_schema/schema.py` and used
    throughout `assembly.py` (from which it is importable). process-bigraph's `templates.py`
    imports `fill_sites` from `bigraph_schema.assembly` and builds on all three. This is the
    machinery the design docs describe as "shipped in bigraph-schema" — the site/fill/ground
    layer is current API, not a plan.

!!! note "Legacy vocabulary"
    Older design documents call sites **slots**, and call filling them **bind** or
    **reify**. Prefer **site / fill / ground**; treat *slot / bind / reify* as synonyms when
    you meet them in older material.

### Building and filling a template

process-bigraph wraps the bigraph-schema primitives in a small template toolkit
(`process_bigraph/templates.py`) so you can read the state of a document and fill it. The
functions are thin and honest:

| Function | What it does |
|---|---|
| `open_sites(document)` | the paths of every site still open |
| `required_open_sites(document)` | the open sites with no `_default` — the ones that block a build |
| `is_ground_document(document)` | `not required_open_sites(...)` — the runnable predicate |
| `fill_template(core, template, bindings)` | fill sites; unbound sites stay open (filling is incremental) |
| `template_document(core, template, bindings)` | fill **and render** the document `Composite` consumes; raises, naming any required site left unfilled |

Here is the whole arc — a "study" template that fixes its analysis and leaves the *model* as
a hole, then fills the hole with a conforming composite so it becomes ground and runs:

```python
from process_bigraph import Composite, Step, allocate_core
from process_bigraph.templates import open_sites, is_ground_document, template_document

class ReportCard(Step):                               # a fixed downstream verdict
    config_schema = {'threshold': 'float'}
    def inputs(self):  return {'level': 'float'}
    def outputs(self): return {'verdict': 'string'}
    def update(self, state):
        return {'verdict': 'pass' if state['level'] >= self.config['threshold'] else 'fail'}

core = allocate_core()
core.register_link('ReportCard', ReportCard)
core.register_link('Grow', Grow)                      # the Grow process from the emitters chapter
MODEL_FACE = {'_type': 'link', '_inputs': {'level': 'float'}, '_outputs': {'level': 'float'}}

# analysis fixed; the model is a HOLE with a declared face
template = core.access({'study': {
    'level': 1.0, 'verdict': 'string',
    'model':  {'_type': 'site', '_sort': MODEL_FACE},
    'report': {'_type': 'step', 'address': 'local:ReportCard', 'config': {'threshold': 2.0},
               'inputs': {'level': ['level']}, 'outputs': {'verdict': ['verdict']}}}})

print(open_sites(template), is_ground_document(template))   # [('study', 'model')] False

def model(rate):                                      # any conforming composite fits the hole
    return core.access({'_type': 'process', 'address': 'local:Grow', 'config': {'rate': rate},
                        'interval': 1.0, 'inputs': {'level': ['level']}, 'outputs': {'level': ['level']}})

sim = Composite({'state': template_document(core, template, {'study/model': model(0.5)})}, core=core)
sim.run(4.0)
print(sim.state['study']['verdict'])                  # pass  (a slower model would fail)

# template_document(core, template, {}) → ValueError: not ground — required site 'study/model'
```

The last comment is the law in action: hand `template_document` an empty binding and it
raises, naming the required site you left open — the same condition `Composite` enforces,
reported before construction so you see *which* hole is empty rather than a downstream
constructor error.

The composite is reusable across many questions; the template attaches one question by
filling one hole.

This is exactly how the agentic spine works. A **study** is a template with its model site
filled; an **investigation** is a document with one site per member study, admitted by
filling. process-bigraph even ships `investigation_document(...)`, which fills the members
you bind and *prunes* the regions you leave open — so "gating a study" is not a scheduler
deciding to skip it, it is simply a site left unfilled. Gating and template binding are the
same mechanism. See [Studies](../investigate/studies.md) and
[Investigations](../investigate/investigations.md) for that layer.

## Draft processes

A site is an empty hole. A **draft process** is the complementary idea: a node that is
*there but inert*. A `DraftProcess` declares a **contract** — its input and output ports
plus a human-readable description of the transformation it is *meant* to perform — but
carries **no `update` dynamics**. It inherits the base `Process.update` no-op, so a composite
containing a draft still builds and still runs; the draft just contributes nothing.

!!! quote ""
    A draft lets the model topology — which process connects which stores — be designed and
    reviewed *before* anyone commits to a mechanism.

A draft never invents dynamics it does not have: stepped, it returns `{}`, and it announces
itself as unfinished — which matters in a framework whose verdicts are computed from what a
run actually produced. It is the meta-modeler's move: declare what a part *exposes* — its
ports and intent — before committing to how it works, since an interface is a concrete,
testable target even while the mechanism behind it stays open.

### `@draft_process`

You define a concrete, registrable draft with the `@draft_process` decorator. It injects the
ports and contract onto a bare `DraftProcess` subclass:

```python
from process_bigraph import DraftProcess, draft_process

@draft_process(
    name="PTH secretion",
    inputs={'ca_sense': 'float'},
    outputs={'pth_out': 'float'},
    contract={'summary': 'senses serum Ca, secretes PTH',
              'senses': 'calcium', 'makes': 'PTH'})
class PTHSecretion(DraftProcess):
    pass

core.register_link('PTHSecretion', PTHSecretion)
print(PTHSecretion({}, core=core).describe())
# DRAFT — senses serum Ca, secretes PTH  ·  makes: PTH  ·  senses: calcium  ·  status: draft - no update dynamics yet
```

There is no `update` on the class — deliberately. `describe()` renders the whole contract
prefixed with `DRAFT —`, and the decorator stamps `status: "draft - no update dynamics yet"`
into the contract automatically. Because a module-scope `DraftProcess` subclass is discovered
and auto-registered by a workspace's `build_core()` (the same walk that registers every
Process and Step), a draft **shows up in the Workbench dashboard by name, with its ports and
contract, marked** <span class="pill draft">DRAFT</span> — with no extra wiring. Replace it
with a real `Process` once the mechanism is committed, and nothing else in the composite has
to change.

!!! note "Verified against code — `DraftProcess` is a shipped primitive"
    `DraftProcess` and `@draft_process` are real, exported from `process_bigraph`
    (`process_bigraph/draft_process.py`; re-exported in `__init__.py`). The decorator
    signature is `@draft_process(*, name, inputs, outputs, contract)` — all keyword-only.
    Registry tooling reads a draft *uninitialized*: it calls `inputs()`/`outputs()` on the
    class and `describe()` on a bare instance, which is why every method reads class
    attributes and needs no configured instance.

Three "blanks" are easy to confuse — keep them apart:

| Blank | State of the document | Fills it with |
|---|---|---|
| **site** | not runnable until filled (a hole) | `fill` — a value or sub-composite |
| **draft process** | runnable; the node no-ops | replacing it with a real `Process` |
| **`config` / params** | runnable; the node runs | supplying parameter values |

A site is an *empty hole*; a draft is a *present-but-inert node*; a config value fills a
node's *parameters*, not a hole and not a node.

## The compiler view

Drafts and sites point past scaffolding: the ecosystem's design notes sketch the framework
as a **compiler** from what a biologist *means* to what an engine can *run*, with a
`DraftProcess` — a contract with roles, ports, and intent but no dynamics — as the
source-level semantic model at the top of that pipeline.

!!! warning "Accuracy note — direction, not a shipped one-click feature"
    The site/fill/ground machinery and `DraftProcess` are **shipped code** (verified above).
    The full "biology → executable" compiler — an elaborator library that turns a semantic
    `kind` into elementary reactions, a handler registry that fixes how each reaction is
    simulated, ontology grounding — is a **documented direction**, explored in a working
    prototype (`littleb-pbg`) and specified in the semantic-layer RFCs, not a one-click
    feature in the current package. The load-bearing pieces you can rely on today are the
    two on this page: leave a hole (**site**) or leave a mechanism undeclared (**draft**),
    and fill it in when the science is ready. Treat the compiler itself as where the
    interface-first workflow is *heading*.

A template is a document with holes and a draft is a document with an inert node; the same
act — filling the hole, supplying the mechanism — turns designed structure into executable
behaviour, and never lets the framework pretend a mechanism exists before it does.

---

**Next:** [Workspaces & the Workbench](../investigate/workspaces-and-workbench.md)
