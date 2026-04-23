# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-23

### Added

- Per-camera editor with FFmpeg inputs, role pills, detect resolution/FPS, and record retention controls.
- Global editors for `record`, `objects`, `motion`, and `go2rtc` sections.
- Raw YAML fallback with line-numbered gutter and Tab-to-indent.
- Pre-save diff modal showing added / removed lines, with Escape to cancel.
- Local rolling history (LocalStorage) with FIFO rotation, per-instance scope, and restore.
- Auto-discovery of Frigate instances through the HA device registry.
- Comment-preserving YAML round-trip via eemeli/yaml.
- Sticky page header and drawer sidebar on mobile viewports.
- Accessibility polish: `:focus-visible` rings, `role="status"` / `role="alert"` on banners, Escape closes the diff modal.
- Vitest coverage wired up with happy-dom for component smoke tests (60 tests, 85%+ on `src/lib/`).

### Notes

- First tagged release. Expect API and UI to evolve across `0.1.x` before a stable `1.0`.

[Unreleased]: https://github.com/Conte49/frigate-config-editor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Conte49/frigate-config-editor/releases/tag/v0.1.0
