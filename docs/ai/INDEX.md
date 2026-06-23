---
canonical_context: true
lifecycle: stable
migration_status: not_required
legacy_write_mode: none
last_audit: 2026-06-22
---

# Project AI Context Index

Project: `brasil-data-mcp`
Root: `/Users/alancastriola/Projects/brasil-data-mcp`

## Read Order

1. Use conversation context already available.
2. Read `docs/ai/CURRENT.md` once for relevant work.
3. Read this index when scope is broad or when locating context sources.
4. Read `docs/ai/PROJECT_STATE.md`, decisions, modules, plans, or archived legacy only when the task requires them.
5. Do not read `docs/ai/archive/` by default.

## Canonical Context

- `docs/ai/CURRENT.md`: short operational snapshot.
- `docs/ai/PROJECT_STATE.md`: durable verified facts.
- `docs/ai/decisions/INDEX.md`: durable decision index.

## Detected Project Markers

- `.git`
- `AGENTS.md`
- `README.md`
- `package.json`

## Archived Legacy Context

External legacy memory paths were removed after portability. Original content, when present, lives inside the new model under:

- Nenhum.

- Manifest: `docs/ai/archive/legacy/MANIFEST.md`
- Snapshot: `docs/ai/archive/legacy/SNAPSHOT.md`

Archived legacy exists for historical lookup and must not be read by default. Use the manifest for the full file list.

## Migration Notes

- No commit, stage, push, build, test suite, service start, or dependency install was performed by this portability pass.
- Before high-impact work, verify relevant archived claims against current code, docs, config, tests, and runtime evidence.
