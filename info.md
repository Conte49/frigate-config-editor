## Frigate Config Editor

A Home Assistant panel that replaces hand-editing `config.yml` for Frigate with a form-based GUI, a raw YAML fallback, and a pre-save diff preview.

### Highlights

- Auto-discovers Frigate instances through the Home Assistant Frigate integration.
- Per-camera editor: FFmpeg inputs with role pills, detect resolution, record retention.
- Global editors for `record`, `objects`, `motion`, and `go2rtc`.
- Comment-preserving YAML round-trip; untouched sections stay byte-for-byte identical.
- Diff modal before every save and local rolling history of the latest versions.
- Dark / light theme inherited from Home Assistant.

### Requirements

- Home Assistant `2024.6.0`+
- Frigate `0.15`+

Admin-only by default. Full install instructions in the repository README.
