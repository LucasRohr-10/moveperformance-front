# MOVE Web — Claude Code project instructions

## Product and scope
MOVE is a web platform for Performance, Rehab and Recovery. The MVP includes public service pages, authentication, customer self-service, plan purchases and renewals, reservations, attendance history, and a Staff dashboard. AI-based recommendations and full workout planning are outside the MVP.

## Business context: the Obsidian vault
Business context and decisions live in the **`MOVE_OBSIDIAN`** vault, a separate repo normally cloned next to this one (`../MOVE_OBSIDIAN`). If it is not there, ask the developer where it is; do not invent a path.

Before working on a business feature (plans, payments, bookings, attendance, staff, auth):
1. Read `../MOVE_OBSIDIAN/00-START-HERE.md` and `../MOVE_OBSIDIAN/CLAUDE.md`, then start from `MOC/MOC MOVE.md`. The useful notes are in `systems/`, `constraints/` and `failures/`. If the vault is open in Obsidian it is also reachable through the `obsidian` MCP.
2. **The code wins.** If the vault and the code disagree about what is built, trust the code; the vault records what was agreed.
3. Check each note's `status`: `proposed` means agreed but not built, `todo` means an open question. Never cite them as facts.
4. Do not write to the vault unless the developer asks.

## Stack and responsibilities
- Next.js App Router, React, TypeScript. Deploy to Vercel.
- NestJS owns business rules, persistence, payments, booking capacity and authorization. Do not reimplement those rules in the frontend.
- Better Auth is planned for authentication. Respect the decided session flow and verify its interaction with the NestJS API before implementing protected features.
- Prefer Server Components for rendering and data reads when appropriate. Use Client Components for actual interactivity only. Do not expose secrets or privileged operations to the browser.
- Follow the installed framework versions and the existing package manager. Never upgrade the stack or add a UI/state library without a clear need.

## Organization: route shell + feature modules
- `src/app/` owns routing, layouts, loading/error boundaries, page metadata and composition. Keep `page.tsx` and `layout.tsx` thin.
- `src/features/<feature>/` owns feature-specific components, API access, hooks and types. Suggested features: `auth`, `services`, `plans`, `bookings`, `payments`, `customer`, `staff`.
- `src/components/ui/` owns small, reusable design-system primitives. `src/components/layout/` owns cross-feature shells, navigation and page layout.
- `src/lib/` contains application-wide infrastructure only (HTTP client, environment validation, auth integration). `src/config/` holds validated constants/configuration. Avoid generic dumping-ground `utils/` and `shared/` folders.
- Constants: `src/config/constants/` holds app-wide constants (route paths, pagination defaults, limits) in kebab-case `*.constants.ts` files, kept separate from environment configuration (`src/config/env.ts`). Feature-specific constants live inside the owning feature (`src/features/<feature>/constants.ts`). Enum-like values follow the POJO convention (`UPPER_SNAKE_CASE` const object + `PascalCase` type via `ValueOf`), not TypeScript `enum`, matching backend conventions.
- A feature may start flat. Add subfolders (`components`, `api`, `hooks`, `types`, `lib`) only when its size justifies them.
- Keep feature internals private. Cross-feature access should use an explicit public API (e.g. the feature's `index.ts`) when useful. Never import another feature's deeply nested implementation.
- Prefer reusable presentational components driven by props and composition. Keep domain-specific decisions in the feature, not in global UI primitives.

## Frontend engineering rules
- Use semantic HTML, accessible controls, labels, keyboard interactions, clear focus states, and responsive layouts. Build mobile-first where reasonable.
- Use consistent design tokens for colors, spacing, typography and component variants. Avoid hard-coded values repeated throughout pages.
- Represent loading, empty, error and success states for data-driven screens. Do not silently swallow errors.
- Prefer URL state for shareable filters/navigation, local state for local interactions, and server-derived state for API data. Do not add global state by default.
- Keep API calls in the feature API layer or server-side integration layer, not scattered through visual components. Centralize error handling and auth/session handling.
- Use generated or shared API types from the backend contract when available. Do not maintain duplicate hand-written request/response models without reason.
- Do not trust frontend checks for permissions, payment confirmation, plan validity or booking capacity. These are enforced by NestJS.
- Avoid excessive abstractions, premature generic components and speculative extensibility. Apply KISS, DRY (knowledge, not superficial syntax), YAGNI, cohesion and low coupling.
- Use names reflecting product concepts and intent. Prefer readable, explicit code over cleverness.

## Product-specific boundaries
- Public routes: Home, Performance, Rehab, Recovery, plans/services and login/register.
- Customer routes: plan, renewals, bookings, history and notices.
- Staff routes: clients, scheduling, capacity, attendance, payments and follow-ups.
- Client UI should distinguish reservations from actual attendance, and pending payments from verified payments.
- Confirm cancellation windows, slot holds, timezone, staff permissions and payment flow before hard-coding UX behavior.

## Working agreement
1. Inspect nearby code, existing conventions, docs and API contracts before editing.
2. For cross-cutting changes, briefly describe the plan and affected files before implementation.
3. Make the smallest cohesive change. Avoid unrelated formatting, refactors, new dependencies or feature creep.
4. Add or update focused tests for changed behavior and critical flows. Prefer accessible, behavior-focused UI tests over implementation-detail tests.
5. Run relevant checks using scripts that actually exist in `package.json` (lint, typecheck, tests, build). Do not invent commands or claim unrun checks passed.
6. At completion report changes, tests run, remaining risks and any decision or API contract that needs coordination with backend.
7. Never commit secrets, `.env` values, tokens or customer data. Do not use production credentials for tests.

## References and decision process
- `docs/architecture.md`: approved module structure and frontend/backend boundaries (create when first needed).
- `docs/decisions/`: ADRs for consequential and hard-to-reverse decisions, not everyday code changes.
- `.claude/rules/`: add scoped guidance when conventions grow; do not inflate this root file.
- If these files are absent, do not assume their contents. Use current repository conventions and propose the minimum useful documentation.
