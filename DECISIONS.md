# Architecture Decision Log

This file tracks non-obvious choices made during the implementation that are
not fully resolved in `docs/MVP_SPEC.md`, or that diverge from the spec.
Each entry documents the context, the options considered, the final choice
and the reasoning.

---

## ADR-001 — Form engine

**Date:** M0
**Status:** Accepted
**Context:** MVP spec §3.1 proposes `@rjsf/core 5` OR `@jsforms/core` for
auto-generating forms from the Frigate JSON Schema.

**Problem:**

- `@rjsf/core` is React-only; using it in a Lit project would require either a
  React-in-Lit bridge (doubling runtime cost, bundle size) or forking the
  package.
- `@jsonforms/core` (correct package name) ships Vanilla/Angular/React/Vue
  renderers but no native Lit renderer.
- The Frigate schema uses roughly 20 recurring field types; a full generic
  form framework is overkill.

**Decision:** implement a custom Lit form renderer in
`src/lib/schema-form/` that reads a JSON Schema node and dispatches to a set
of dedicated field components (`field-text`, `field-number`, `field-select`,
`field-list`, etc.).

**Consequences:**

- +2 days in M2 to build the renderer and a small schema-to-widget mapper.
- Zero additional runtime dependency, smaller bundle.
- Full control over inline validation errors returned by the Frigate server.
- Post-MVP we can still swap in `@jsonforms/core` with Vanilla renderers if
  the custom engine becomes a maintenance burden.

---

## ADR-002 — YAML serializer

**Date:** M0
**Status:** Accepted
**Context:** MVP spec §6.1 selects `js-yaml` and notes that migrating to
`yaml` (eemeli/yaml) for comment preservation is a post-MVP concern.

**Decision:** use `yaml` (eemeli/yaml) from day one, in Document/CST mode.

**Reasoning:**

- `js-yaml` drops comments on serialization, which is a known footgun for
  Frigate configs where users often annotate camera URLs and retention
  rules.
- Migrating the serializer after M4 would require rewriting
  `lib/yaml-utils.ts`, `lib/diff.ts` and all related tests. Estimated cost:
  2 days.
- `yaml` package is actively maintained, compatible with browsers, and the
  API overhead over `js-yaml` is modest.

**Consequences:**

- Slightly more verbose YAML serialization code.
- Comment preservation becomes an MVP feature, not a future nice-to-have.

---

## ADR-003 — Package manager

**Date:** M0
**Status:** Accepted
**Context:** Spec §12 recommends pnpm workspaces.

**Decision:** pnpm 10 (via corepack), Node 20+.

**Reasoning:** pnpm is the de-facto standard in the HACS / HA frontend
ecosystem, its strict node_modules layout catches phantom dependencies
early, and install times are meaningfully better than npm.
