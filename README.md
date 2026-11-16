# MOVE Frontend

Next.js (App Router) + TypeScript frontend for MOVE — Performance, Rehab and
Recovery.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in values, see docs/architecture.md
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript, no emit
- `pnpm test` — unit and component tests (Vitest + Testing Library)

## Conventions

See `CLAUDE.md` for product scope, stack and engineering conventions, and
`docs/architecture.md` for the project's folder structure and base layouts.
