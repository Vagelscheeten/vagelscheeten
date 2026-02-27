# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build (TypeScript errors ignored)
npm run lint     # ESLint check
npm run start    # Start production server
```

There are no tests in this project.

## What This App Is

A full-stack event management platform for the annual **"Melsdörper Vagelscheeten"** (school bird shooting festival) at Regenbogenschule Melsdorf. Three distinct user roles:

- **Public visitors** — Frontpage with event info, schedule, games, gallery, downloads
- **Admins** — Full event management dashboard (`/admin/*`) protected by Supabase Auth
- **Game leaders (Leiter)** — Mobile-optimized result entry (`/leiter/*`) authenticated via custom JWT cookie

## Architecture

### Three-Zone Route Structure

| Zone | Routes | Auth |
|------|--------|------|
| Public | `/startseite`, `/faq`, `/galerie`, `/anmeldung`, etc. | None |
| Admin | `/admin/*` | Supabase Auth (redirects to `/login`) |
| Leiter | `/leiter/*` | JWT cookie `leiter_session` (signed with `LEITER_JWT_SECRET`) |

### Supabase Clients — Use the Right One

- `lib/supabase/client.ts` → browser/client components (`createBrowserClient`)
- `lib/supabase/server.ts` → server components and route handlers (`createServerClient`)
- `lib/supabase/admin.ts` → admin operations requiring service role key
- `lib/supabase/middleware.ts` → session refresh in middleware

### Event System

Everything in the app is scoped to an **active event** (table `events`, `ist_aktiv = true`). The `EventContext` (`context/EventContext.tsx`) exposes `useEvent()` and `useActiveEventId()` for client components. Server components query the active event directly. Only one event can be active at a time (enforced by migration `20260125_fix_single_active_event.sql`).

### Public Frontpage Architecture

`app/startseite/page.tsx` (Server Component, ISR 60s) fetches all data in parallel and passes it to `app/startseite/StartseiteClient.tsx` (Client Component), which renders section components from `components/public/`. All sections use `SectionWrapper` + `PageHeader` as base primitives.

### Scoring System

Games use typed scoring (`wertungstyp_enum`): `WEITE_MAX_AUS_N`, `MENGE_MAX_ZEIT`, `ZEIT_MIN_STRAFE`, `PUNKTE_SUMME_AUS_N`, `PUNKTE_ABZUG`, `PUNKTE_MAX_EINZEL`. Points logic lives in `lib/points.ts`. Top 10 children per game receive 10–1 points; per class, top boy and girl become class king/queen.

## Styling

**Tailwind CSS v4** — configuration is entirely in `app/globals.css` via `@theme {}`, not a JS config file.

Key custom values:
- **`md` breakpoint = 920px** (not the standard 768px)
- **Brand colors**: `melsdorf-orange` (#F2A03D), `melsdorf-red` (#E7432C), `melsdorf-green` (#33665B), `melsdorf-beige` (#F2E4C2)
- **Pastel section backgrounds**: `pastel-blue`, `pastel-green`, `pastel-yellow`, `pastel-orange`, `pastel-pink`
- **Accent** = golden yellow (#F6C91C), **Tertiary** = green (#27AE60)
- Component classes `.btn`, `.btn-primary/secondary/tertiary`, `.card`, `.polaroid` defined in `@layer components`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # admin client only
LEITER_JWT_SECRET           # signs leiter_session JWT
```

## Key Conventions

- **TypeScript strict mode is off** (`strict: false`, `noImplicitAny: false`) — type assertions with `!` and loose typing are common throughout the codebase.
- **Path alias `@/*`** maps to the project root.
- **`next.config.ts` ignores build type errors** — TypeScript errors will not fail `npm run build`.
- Admin layout (`app/admin/layout.tsx`) handles auth check client-side and redirects unauthenticated users to `/login`.
- Toast notifications use **sonner** (`<Toaster richColors />`), not react-hot-toast (both are installed, prefer sonner in new code).
- Animations via **Framer Motion** on public pages; Tailwind transitions in admin UI.
