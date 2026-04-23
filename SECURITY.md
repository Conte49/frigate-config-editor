# Security Policy

## Supported Versions

This project is pre-alpha. No released version is considered supported for security advisories at this time. Once `v0.1.0` ships, the two most recent minor versions will receive security fixes.

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for security reports.

Instead, use the **Report a vulnerability** button on the repository's Security tab to open a private advisory. Include:

- A short description of the issue.
- Steps to reproduce, or a minimal proof of concept.
- The Frigate version and Home Assistant version involved.
- Any relevant configuration (redact credentials before sending).

Expect an initial acknowledgement within five business days. Once the issue is triaged, you will receive an ETA for the fix and, if applicable, a CVE request.

## Scope

In scope:

- Arbitrary code execution from crafted YAML submitted through the panel.
- Unauthorized access to Frigate endpoints from the panel.
- Data exfiltration of Home Assistant state beyond what the user already has access to.

Out of scope:

- Issues in Frigate itself — report those to [blakeblackshear/frigate](https://github.com/blakeblackshear/frigate).
- Issues in Home Assistant — report those to [home-assistant/core](https://github.com/home-assistant/core).
