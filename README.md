# Vivarium Users Guide (`viva-docs`)

📖 **Read it live: <https://vivarium-collective.github.io/viva-docs/>**

The comprehensive, versioned users guide to the **viva ecosystem**:

- **bigraph-schema** — the type system
- **process-bigraph** — the composition engine
- **vivarium-workbench** — the dashboard server
- **viva-superpowers** — the `/viva-*` authoring skills

> *Simulation you can compose. Reasoning you can audit.*

## Build locally

```bash
# serve with live reload
uvx --with mkdocs-material mkdocs serve

# build the static site into ./site
uvx --with mkdocs-material mkdocs build
```

## Structure

| Part | Covers |
|---|---|
| **Foundations** | The Two Spines, core concepts (from first principles), the layered stack |
| **Build & run models** | Schemas/types/state, Processes & Steps, Composites & wiring, Emitters, Templates & draft processes |
| **Investigate** | Workspaces & the Workbench, Studies, Analyses/Visualizations/Report cards, Investigations, Rigor & evidence, Working with AI agents |
| **Reference** | Skill reference, HTTP API, on-disk schemas, install & deploy, a worked end-to-end example, glossary |

## Contributing

Content lives in `docs/`. The navigation is defined in `mkdocs.yml`. House style is in
`docs/stylesheets/extra.css`. Every code snippet should be verified against the current
`main` of the package it documents before publishing — the ecosystem is mid-migration
(see the accuracy notes in each chapter).
