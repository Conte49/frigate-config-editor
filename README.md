# Frigate Config Editor

A Home Assistant custom panel to edit the Frigate `config.yml` through a graphical interface, with live validation, diff preview and automatic restart. Distributed via [HACS](https://hacs.xyz/).

> Status: **pre-alpha / MVP in progress**. Not yet installable.

## Why

Editing Frigate's YAML config by hand is error-prone. This panel generates dynamic forms from Frigate's own JSON Schema, validates every change against the server, and applies the config with a single click. No more whitespace-induced restarts at 2 AM.

## Features (MVP scope)

- Auto-discovery of Frigate instances connected to Home Assistant
- Form editors for `cameras`, `record`, `detect`, `objects`, `motion`, `go2rtc`
- Live schema validation against `/api/config/schema.json`
- Diff preview before saving (old vs new YAML)
- Automatic restart of Frigate after save
- Raw YAML fallback via Monaco editor for sections not covered by forms
- Local history of the last 10 saves (LocalStorage, compressed)
- Dark/light theme aligned with Home Assistant

## Requirements

- Home Assistant `2024.6.0` or later
- Frigate `0.15` or later
- The official [Frigate HA integration](https://docs.frigate.video/integrations/home-assistant/) configured

## Installation

> Not yet published. Once the first release ships, installation will be via HACS as a custom repository. Check back after `v0.1.0` is tagged.

## Development

Stack: Lit 3, TypeScript, Vite, pnpm.

```bash
# Node 20+ required (use nvm: `nvm use`)
corepack enable
pnpm install

pnpm dev         # start Vite dev server
pnpm typecheck   # strict TypeScript check
pnpm lint        # ESLint
pnpm format      # Prettier (write)
pnpm test        # Vitest (single run)
pnpm build       # produce dist/frigate-config-editor.js
```

See [DECISIONS.md](DECISIONS.md) for the log of architectural choices.

## Contributing

Pre-alpha stage, the public API and internal structure will change frequently. Issues and discussions are welcome; please hold off on PRs until `v0.1.0` is tagged and `CONTRIBUTING.md` is published.

## License

[MIT](LICENSE)

## Disclaimer

This project is not affiliated with Frigate, Home Assistant or Nabu Casa. "Frigate" and "Home Assistant" are trademarks of their respective owners.
