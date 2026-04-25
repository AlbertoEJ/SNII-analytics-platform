# SNII Analytics Platform

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=for-the-badge&logo=d3dotjs&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

An open browser for Mexico's **Sistema Nacional de Investigadoras e Investigadores (SNII)** roll — 1984 through 2026. Search any of ~72,000 researchers, follow their level/area/institution timelines, and explore aggregate trends across four decades.

> Unofficial project. Built on publicly-available SECIHTI data; not affiliated with or endorsed by SECIHTI.

---

## What's in here

The dataset combines:

- The current padrón (`Padron_enero_2026.xlsx`, ~48k researchers).
- Yearly historical SNI rolls (`Investigadores_vigentes_<year>.xlsx`, 1984–2025).

After identity resolution (CVU + expediente + name normalization across schema changes over four decades) the database holds:

- **72,190 unique researchers**
- **668,417 yearly snapshots**
- **42 yearly snapshots** (1984–2026, with 2021 missing in the source)

## Features

- **Researcher search** — fuzzy search by name with trigram indexing.
- **Researcher detail** — full level/area/institution/state timeline for one person.
- **Stats dashboard** — distribution by level, area, state, institution for any year.
- **Historic view** — six time-series charts: totals, levels, top institutions, areas, states, net flows.
- **Bilingual UI** — Spanish and English.

## Stack

- **Next.js 16** (App Router, React 19, Server Components)
- **TypeScript** + **Tailwind v4**
- **Supabase** (Postgres + PostgREST) — data lives in the `snii` schema, never touches `public`
- **Clean architecture** under `src/`: `domain/` · `application/` · `infrastructure/` · `presentation/` · `app/` (routes) · `lib/container.ts` (DI)

## Getting started

### Prerequisites

- Node 20+
- A Supabase project (cloud) **or** a local Supabase Docker stack

### Install

```bash
npm install
```

### Configure environment

Copy the example below into `.env.local` and fill in your project's values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...           # required only for the importer
DATABASE_URL=postgresql://...                      # required only for the importer / DDL
SNII_DB_SCHEMA=snii
```

### Provision the database

The schema is dumped into `db/snii_schema.sql`. To bring it up on a fresh Supabase project:

```bash
# 1. Extensions and PostgREST exposure
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;"
psql "$DATABASE_URL" -c "ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, snii'; NOTIFY pgrst, 'reload config';"

# 2. Schema
psql "$DATABASE_URL" -f db/snii_schema.sql

# 3. RLS, grants, and policies — see db/apply_to_cloud.sql for the full block
```

(Supabase free-tier note: the direct DB hostname is IPv6-only. If your network doesn't route IPv6, use the Session Pooler connection string instead — same password, different host/user.)

### Import the data

Place the Excel sources where the importer expects:

- `C:/Users/alber/Documents/Padron_enero_2026.xlsx`
- `C:/Users/alber/Documents/Historico SNII/Investigadores_vigentes_<year>.xlsx`

(Or pass alternate paths as CLI args.) Then run:

```bash
npx tsx src/infrastructure/import/importHistorical.ts
```

The importer reads every file, resolves canonical identities across years, and upserts in 1,000-row batches. Total import is ~5–10 minutes against cloud Supabase.

### Run

```bash
npm run dev
```

Open http://localhost:3000.

## Project layout

```
src/
├── app/               # Next.js routes (/, /researchers, /researchers/[id], /stats, /historic)
├── domain/            # Entities, value objects, repository interfaces — no I/O
├── application/       # Use cases — orchestrate domain + repositories
├── infrastructure/    # Supabase client, repository impls, Excel importer
├── presentation/      # i18n, shared components
└── lib/container.ts   # Dependency injection wiring

db/
├── snii_schema.sql    # pg_dump of the snii schema (tables, functions, indexes)
└── apply_to_cloud.sql # extensions, RLS policies, grants for fresh deployment
```

## Database

Two tables in the `snii` schema:

- `researchers` — one row per canonical researcher (CVU, expedientes, canonical name, name variants, first/last year).
- `researcher_snapshots` — one row per (researcher, year) with level, category, area/discipline/subdiscipline/specialty, institution, state, country, validity dates.

Plus 15 RPC functions used by the dashboards (counts by year/level/state/area/institution, net flows, timelines).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js in dev mode |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npx tsx src/infrastructure/import/importHistorical.ts` | (Re)import all data |

## Deploying

Set the same env vars in your host (Vercel, etc.). `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` are *only* needed if you run the importer there too — the running app needs only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgements

- Source data: [SECIHTI](https://secihti.mx/) — Sistema Nacional de Investigadoras e Investigadores. The padrón is published as open data; this project does not redistribute the raw files.
- Built with assistance from [Claude Code](https://claude.com/claude-code) — Anthropic's coding agent helped design the data model, build the historic import pipeline, and migrate the database from local to cloud Supabase.
