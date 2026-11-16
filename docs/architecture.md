# Frontend architecture

Next.js (App Router) + TypeScript (strict). See `CLAUDE.md` for the full set of
product, stack and engineering conventions this structure follows.

## Route shell vs. feature modules

- `src/app/` owns routing, layouts, loading/error boundaries and page
  composition. `page.tsx`/`layout.tsx` files stay thin and delegate to
  feature/component code.
- `src/features/<feature>/` owns feature-specific components, API access,
  hooks and types. Current feature domains: `auth`, `performance`, `rehab`,
  `recovery`, `profile`, `admin`. Each starts empty (`.gitkeep`) and grows
  flat subfolders (`components`, `api`, `hooks`, `types`, `lib`) only once its
  size justifies them.
- `src/components/ui/` owns small, reusable design-system primitives:
  `button.tsx`, `input.tsx`, `card.tsx`, `section-label.tsx`, `heading.tsx`.
- `src/components/layout/` owns cross-feature shells, navigation and page
  layout — `navbar.tsx` (content-driven: takes `links`/`actions`, used by both
  `(public)` and `(authenticated)`), `mobile-nav.tsx` (its client-side menu
  toggle) and `footer.tsx` (public layout only).
- `src/lib/` is reserved for app-wide infrastructure (HTTP client, auth
  integration) once those are needed.
- `src/config/` holds validated configuration (`env.ts`) and app-wide
  constants (`constants/*.constants.ts`), kept separate from feature-specific
  constants that live inside their owning feature.
- `src/features/auth/` holds the login form and `signInWithEmail`, the only
  code that calls the login endpoint. Tests sit next to the code
  (`*.test.ts(x)`) and run with `pnpm test`.

## Base layouts

- `src/app/layout.tsx`: root layout (fonts, global `<html>`/`<body>`).
- `src/app/(public)/layout.tsx`: public shell (header + footer) wrapping
  public routes — currently just the home page.
- `src/app/(auth)/layout.tsx`: access shell (logo + "Volver al sitio", no
  navbar or footer) wrapping `/login`.
- `src/app/(authenticated)/layout.tsx`: authenticated shell (nav) wrapping
  authenticated routes — `/dashboard`, `/bookings`, `/plans` and `/history`,
  all placeholder content pending their own tickets.

The authenticated layout is a **visual shell only**: it does not check or
enforce a session yet, since Better Auth isn't integrated into this project
yet (per `CLAUDE.md`). Real session guarding belongs to the auth integration
ticket.

## Styling and design system

Tailwind CSS v4 (CSS-based config, no `tailwind.config.ts`). All design tokens
live in a single `@theme` block in `src/app/globals.css` — colors
(`bg`/`soft`/`card`/`line`/`muted`, plus semantic `success`/`warning`/`danger`
aliases over Tailwind's emerald/amber/red so feature code never hardcodes a
raw color) and fonts (`font-display` = Archivo, `font-sans` = Inter, both
self-hosted via `next/font/google` in `src/app/layout.tsx`). These were
extracted from MOVE's visual reference mockups (`htmls/` in the repo root,
outside this project) — every mockup uses the exact same palette and is
dark-only (no light theme/toggle exists in the reference, so none was built).

Variant-driven components use `class-variance-authority` + the `cn()` helper
in `src/lib/cn.ts` (clsx + tailwind-merge) — see `button.tsx` for the pattern
(variants: `primary`/`secondary`/`ghost`; sizes: `sm`/`md`).

**Headings never carry raw Tailwind size classes directly on `<h1>`/`<h2>`/`<h3>`
in page code** — use `<Heading>` (`src/components/ui/heading.tsx`) instead.
`size` (`display`/`lg`/`md`/`sm`) controls the visual scale and `as`
(`h1`–`h4`) controls the actual tag, kept independent so visual hierarchy and
document semantics don't have to match 1:1. Changing what any heading level
looks like app-wide means editing `headingVariants` in that one file, not
hunting through every page.

**Scope note:** the reference mockups also contain a second, structurally
different layout (fixed sidebar) for staff/admin pages (`08`, `09`, `10` in
`htmls/`). MOVE-13 built that shell (`src/components/layout/staff-sidebar.tsx`)
with all six sections from the mockup — Dashboard, Clientes, Turnos y
asistencia, Pagos, Seguimiento, Configuración. Dashboard keeps a simple
greeting; the other five render `ComingSoonSection` until their own tickets
add real data.

**Roles:** each private page declares the role it serves with
`requireRole(role)` (`src/lib/session.ts`). A user with another role is sent
to their own area via `HOME_BY_ROLE` (`src/config/constants/routes.constants.ts`),
the single place that maps roles to routes. This only picks the screen — the
API enforces permissions.

## Environment variables

Validated in `src/config/env.ts` via `zod`. See `.env.example` for the full
list and `.env.local` (gitignored) for local dev values.

- `NEXT_PUBLIC_API_URL` — required; base URL of the NestJS API
  (`http://localhost:4000` locally). The browser calls Better Auth on that
  API directly (`/api/auth/*`) with `credentials: "include"`, so the session
  cookie belongs to the API.
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET` — declared but optional until the Better Auth
  integration ticket wires authentication in.
