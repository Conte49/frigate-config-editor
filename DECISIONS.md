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

---

## ADR-004 — Frigate discovery via HA device registry

**Date:** M1
**Status:** Accepted
**Context:** MVP spec §3.3 proposes discovering Frigate instances by
scanning `hass.states` for entities matching `binary_sensor.*_camera_fps`
and inferring the base URL from their device info.

**Problem:** entity-id pattern matching is fragile. Entity ids depend on
the camera name chosen by the user, the integration version, and may be
renamed. The device registry, in contrast, is stable and directly exposes
the `configuration_url` of each Frigate instance.

**Decision:** query the HA websocket API (`config_entries/get` +
`config/device_registry/list`), filter by `domain === "frigate"` and
dedupe by `configuration_url`.

**Consequences:**

- Requires the official Frigate HA integration, which is already a
  prerequisite listed in the README.
- Robust to camera renames and locale changes.
- Falls back to empty list when the integration is absent; the UI will
  ask the user for a manual URL.

---

## ADR-005 — History timestamp disambiguation

**Date:** M1
**Status:** Accepted
**Context:** Multiple snapshots added within the same millisecond would
produce non-deterministic ordering when calling `list()`, which breaks
the "most recent first" contract users expect.

**Decision:** the `HistoryStore` tracks a monotonic `lastTimestamp` and
bumps it by `+1ms` whenever the clock did not advance. This guarantees
stable ordering without depending on `performance.now()` (which is not
available in every sandboxed context) and keeps the field numeric for
simple JSON serialisation.

**Consequences:** snapshot timestamps may drift up to a few ms into the
future on rapid bursts; acceptable given the human-oriented granularity.
