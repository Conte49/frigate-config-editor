# Frigate Config Editor

A Home Assistant custom panel to edit the Frigate `config.yml` through a graphical interface, with live validation, diff preview and automatic restart. Distributed via [HACS](https://hacs.xyz/).

> Status: **pre-alpha / MVP in progress**. Not yet installable from HACS. Follow the [CHANGELOG](CHANGELOG.md) for the latest milestone.

## Why

Editing Frigate's YAML config by hand is error-prone. This panel generates form editors for the most common sections, validates every change against the server, and applies the config with a single click. Comments in your YAML are preserved across saves. No more whitespace-induced restarts at 2 AM.

## Features

- Auto-discovery of Frigate instances registered with the Home Assistant Frigate integration
- Per-camera editor: enable, FFmpeg inputs with role pills, detect resolution, record retention
- Global editors for `record`, `objects`, `motion`, `go2rtc`
- Schema-driven field rendering powered by the Frigate JSON Schema
- Diff preview before every save (old vs new YAML)
- Automatic restart of Frigate after save with polling until the API is healthy again
- Raw YAML fallback with line numbers and Tab-to-indent for advanced sections
- Local rolling history of the latest saves, scoped per Frigate instance (LocalStorage)
- Comment-preserving YAML round-trip (via [eemeli/yaml](https://github.com/eemeli/yaml))
- Dark / light theme follows the active Home Assistant theme
- Responsive layout with a drawer sidebar on mobile

## Requirements

- Home Assistant `2024.6.0` or later
- Frigate `0.15` or later
- The official [Frigate HA integration](https://docs.frigate.video/integrations/home-assistant/) configured and reachable

## Installation

> Not yet published on the HACS default repository. Once the first release ships (`v0.1.0`), install via HACS as a **custom repository**:
>
> 1. In HACS, open the kebab menu, pick **Custom repositories**.
> 2. Add `https://github.com/Conte49/frigate-config-editor` with category **Panel**.
> 3. Install the entry called "Frigate Config Editor".
> 4. Restart Home Assistant when HACS prompts you to do so.
> 5. The new panel appears in the sidebar, visible to admin users only.

## Development

Stack: Lit 3, TypeScript, Vite, pnpm, Vitest. Node 20+.

```bash
corepack enable            # enables pnpm via Node corepack
pnpm install

pnpm dev                   # start Vite dev server
pnpm typecheck             # strict TypeScript check
pnpm lint                  # ESLint
pnpm format                # Prettier (write)
pnpm test                  # Vitest (single run)
pnpm test:coverage         # Vitest + v8 coverage report
pnpm build                 # emit dist/frigate-config-editor.js
```

The build produces a single ES module (`dist/frigate-config-editor.js`) that HA loads as a custom panel.

## Roadmap

| Milestone | Scope                                                                |
| --------- | -------------------------------------------------------------------- |
| M0        | Project scaffolding, Vite build, CI                                  |
| M1        | Frigate API wrapper, HA instance discovery, history store            |
| M2        | Per-camera editor and end-to-end save flow                           |
| M3        | Raw YAML editor, pre-save diff modal, history restore                |
| M4        | Editors for `record`, `objects`, `motion`, `go2rtc`                  |
| M5        | Responsive layout, accessibility polish                              |
| M6        | Testing, documentation, CHANGELOG                                    |
| M7        | First release, HACS custom repo entry                                |
| Post-MVP  | Zone drawing, camera wizard, detector editor, semantic_search, genai |

## Troubleshooting

- **"No Frigate instances found"** — Verify the Frigate integration is installed and the Frigate device exposes a `configuration_url` in HA (Settings → Devices & services → Frigate → pick a device).
- **Save fails with validation errors** — The panel shows the exact Frigate error message. Fix the indicated line in the raw YAML editor and retry.
- **Comments disappear after a save** — Only comments inside sections edited through the form editors should survive; comments inside raw YAML edits are untouched as long as the document round-trips successfully. If you spot a regression, open an issue with a minimal reproducible config.

## Contributing

Pre-alpha stage, the public API and internal structure will change frequently. Issues and feature requests are welcome; please hold off on PRs until `v0.1.0` is tagged. See [CONTRIBUTING.md](CONTRIBUTING.md) once it lands.

## License

[MIT](LICENSE)

## Disclaimer

This project is not affiliated with Frigate, Home Assistant or Nabu Casa. "Frigate" and "Home Assistant" are trademarks of their respective owners.
