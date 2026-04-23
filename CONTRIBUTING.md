# Contributing

Thanks for considering a contribution. This project is pre-alpha, so the bar for merged code is high and the scope of accepted PRs is narrow until `v0.1.0` ships.

## Before you open a PR

1. Open an issue first. Describe the problem, the proposed change and the alternatives you considered.
2. Wait for a green light before writing code — the roadmap is tight and I may be actively working on the same area.
3. Keep the PR focused. One logical change per PR.

## Local setup

```bash
corepack enable
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All of the above must pass before you push. CI runs the same commands on every push.

## Code style

- TypeScript strict mode is non-negotiable. `any` and `as unknown as` are allowed only with a clear comment explaining why.
- Follow the existing naming: `fce-*` for shared web components, `frigate-*` for feature panels, kebab-case file names.
- Keep each component under ~200 lines. Extract shared fields into `components/shared/`.
- Comments belong on _why_ something is done the way it is, not on _what_ the code does.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). The automation that ships `v0.1.0` will rely on them:

```
feat(cameras): add zone editor placeholder
fix(yaml): preserve trailing newline when serialising
chore(ci): bump pnpm to 10.33
```

## Documenting decisions

Non-trivial design choices land in [`DECISIONS.md`](DECISIONS.md) as a dated ADR. If your PR introduces or diverges from a design decision already recorded there, update the ADR in the same PR.

## Security issues

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the disclosure process.
