# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-04-23

### Fixed

- Release workflow no longer uses `make_latest`, which caused an `Error updating policy` and prevented the `frigate_config_editor.zip` asset from being uploaded. HACS now has a reliable zip to pull on every tag.
- `actions: read` permission added to the release workflow to match the scopes required by newer `softprops/action-gh-release` versions.

## [0.1.1] - 2026-04-23

### Changed

- `hacs.json` now declares `zip_release: true` and `filename: frigate_config_editor.zip`, so HACS downloads the curated release asset instead of scraping the repository tree.
- CI and release workflows bumped to Node 22 and rely on `packageManager` from `package.json` for pnpm version selection (fixes `ERR_PNPM_BAD_PM_VERSION`).

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

[Unreleased]: https://github.com/Conte49/frigate-config-editor/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/Conte49/frigate-config-editor/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Conte49/frigate-config-editor/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Conte49/frigate-config-editor/releases/tag/v0.1.0
