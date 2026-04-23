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

---

## ADR-006 — Form renderer surface area for M2

**Date:** M2
**Status:** Accepted
**Context:** The MVP spec covers the full Frigate camera config; trying
to build a UI for every leaf on day one would have delayed the first
end-to-end save flow.

**Decision:** ship M2 with hand-written Lit components for the top
cameras.\* sections most users touch (general enable, ffmpeg inputs,
detect w/h/fps, record retention). Anything outside that surface is
preserved on save via the full YAML round-trip (see ADR-002) and will
receive dedicated editors in later milestones.

**Consequences:** we keep the editor approachable and the bundle small
for the first pushable version while still guaranteeing round-trip
safety for the rest of the config.

---

## ADR-007 — Save flow uses surgical patch over the raw document

**Date:** M2
**Status:** Accepted
**Context:** Replacing the full config with a re-serialised JS object
would strip every comment and reformat user-authored YAML, defeating
ADR-002.

**Decision:** `#save` re-parses the original YAML document, calls
`applyPatch(doc, 'cameras', workingConfig.cameras)` and serialises the
document. Sections untouched by the editor keep their original
formatting and comments byte-for-byte.

**Consequences:** adding editors for new sections (`record`, `objects`,
etc.) only requires extending the patch call with the matching path.

---

## ADR-008 — Raw YAML editor: textarea over Monaco for the MVP

**Date:** M3
**Status:** Accepted
**Context:** MVP spec §3.1 picks Monaco as the raw YAML editor.

**Problem:** Monaco ships as a multi-megabyte asset tree (core + theme
workers + basic-languages) that Vite can bundle into the target ES
module only with significant duct tape. HA custom panels are served as
a single file; bundling Monaco brings the output well above 3 MB,
which noticeably impacts the panel cold start.

**Decision:** ship M3 with a hand-rolled editor built around a
`<textarea>` that exposes:

- line-numbered gutter synchronised with scroll,
- Tab-to-indent,
- `fce-yaml-change` event,
- monospace styling consistent with HA themes.

No syntax highlighting or completion for the first release. If real-
world feedback shows the textarea is insufficient, we will migrate to
**CodeMirror 6** (not Monaco): it is explicitly designed for embedding,
tree-shakeable, and a YAML highlighter costs ~40 kB gzipped.

**Consequences:** the raw editor is functional but modest. Users that
need full IDE-grade editing can keep doing so in their regular editor;
the panel is meant for quick tweaks and emergency fixes, not as a
replacement for an IDE.

---

## ADR-009 — Pre-save diff modal is mandatory

**Date:** M3
**Status:** Accepted
**Context:** A bad save corrupts the Frigate config and can take the
NVR offline (see risk #6 in MVP spec §10).

**Decision:** every `Save` click opens a full diff modal against the
last known-good YAML. The call to `saveConfig` only fires after explicit
user confirmation. Reload and history restore flows never bypass the
modal.

**Consequences:** one extra click for every save; acceptable trade-off
for the safety it provides. Keyboard shortcut (Enter to confirm) is a
post-MVP polish item.

---

## ADR-010 — Ship as an HACS integration, not as a plugin

**Date:** post-M7 hotfix
**Status:** Accepted
**Context:** The MVP was meant to be distributed as a HACS "plugin"
(Lovelace resource). During the first install attempt HACS rejected
the repository with `Repository structure for main is not compliant`
because recent HACS releases no longer allow plugins to register
sidebar panels — only Lovelace cards live in that category.

**Decision:** add a minimal Python "integration" shim under
`custom_components/frigate_config_editor/` whose only responsibility
is to serve the bundled JS and register the panel via
`frontend.async_register_built_in_panel`. The front-end code itself is
unchanged.

**Consequences:**

- `hacs.json` becomes an integration manifest; HACS category is
  "Integrazione / Integration".
- The Vite build now outputs directly into
  `custom_components/frigate_config_editor/www/` so the release zip can
  be produced with a single step.
- Users no longer need to hand-edit `configuration.yaml`; HACS +
  restart is enough.
- The shim is static (~40 lines of Python). It is expected to stay
  untouched for the foreseeable future.
