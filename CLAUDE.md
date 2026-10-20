# PCN Website

## Community name

The community is **programaConNosotros**: one word, lowercase `p`, capital `C` and `N`. Never
"Programa Con Nosotros", "Programa con nosotros" or "ProgramaConNosotros" — not in the UI, email
subjects or bodies, metadata, notifications, data files or docs. Lowercase `programaconnosotros` is
only for domains, handles and repo names. `src/lib/community-name.test.ts` fails on any other
spelling.

## Development

- Package manager: pnpm
- Dev server: `pnpm dev` (uses portless by default — requires Node 24+)
- Plain next dev (Docker / no portless): `pnpm dev:docker`

## Worktrees

Each worktree gets an isolated Postgres database (provisioned automatically by the SessionStart hook) and its own URL when running `pnpm dev`:

- Main checkout → `https://pcn-website.localhost`
- Linked worktree on branch `<name>` → `https://<name>.pcn-website.localhost`

No port conflicts, no extra config needed.

## Data cache

Reads that are the same for everyone go through `cached()` (`src/lib/cache.ts`) and declare every
table they read; every Prisma write expires those tables' cached reads automatically (extension in
`src/lib/prisma.ts`), so server actions don't invalidate by hand. Cache rows, not signed URLs or
anything filtered by the current time. In dev, `[cache] <name> reads <Model>` means a table is
missing from `models`.

- A cached value whose result depends on the date (a range that ends today, like `/metricas`)
  carries the day in its key; otherwise it keeps serving yesterday's range after midnight.
- Code that signs URLs or otherwise depends on the request calls `await connection()` (from
  `next/server`) before querying, so the build's prerender attempt never touches the database.

## Production database

Production runs on a self-hosted PostgreSQL on an AWS EC2 instance. It used to be on Supabase and
no longer is: don't assume Supabase (its pooler, dashboard or settings) for anything.

## Generated data

- GitHub numbers shown on the site come from the committed snapshot `src/data/github-stats.json`; the site never calls the GitHub API at render time. Refresh with `pnpm github:stats` (skill: `actualizar-stats-github`).
- After changing `prisma/schema.prisma`, run `pnpm db:diagram` to regenerate the ER diagram data on `/desarrollo` (`src/app/(platform)/desarrollo/db-schema.ts`).
- Prisma 7: `prisma generate` (run by `postinstall`/`prebuild`) writes the client to `src/generated/prisma` and the full datamodel to `src/generated/datamodel` (gitignored). Import types and the client from `@/generated/prisma/client`, or `@/generated/prisma/browser` in client components; never `@prisma/client`. The app connects through `@prisma/adapter-pg` with `pgAdapter()` (`src/lib/database-url.ts`), which keeps Prisma 6's URL semantics (sslmode, connection_limit); the CLI's URL comes from `prisma.config.ts`. Details in `docs/migracion-prisma-7.md`.

## Security

How the site covers the OWASP Top 10, and the rules for new code, are in `docs/seguridad-owasp.md`.
In short: every server action checks the session or permissions itself (enforced by
`src/lib/server-action-auth.test.ts`), validates input with zod, talks to the database only through
Prisma or tagged `$queryRaw` (enforced by ESLint and `src/lib/sql-safety.test.ts`), and fetches
user-supplied URLs only through `safeFetch`. `pnpm test:db` runs the integration suite against a
throwaway local Postgres database.

## MCP server

`/api/mcp` is an OAuth-protected MCP server for admins with 2FA (`src/lib/mcp`, `src/lib/oauth`,
docs in `docs/mcp.md`). Tools select fields explicitly (`src/lib/mcp/selects.ts`, never
`include: { user: true }`), write only through the site's own server actions (they run as the
token's admin via `runAsUser`, so actions must read the session with `getCurrentSession()`), and
`pnpm test:db -- src/lib/mcp` (the secret-canary test) must pass.

## Testing

`pnpm test` (unit), `pnpm test:db` (Postgres integration) and `pnpm test:e2e` (Playwright) only run
locally. Skills: `verify-all` runs and reads every check, `fix-e2e` triages e2e failures,
`verify-docker` checks the images and the compose stack.

- The site shows member names through `displayName` (`src/lib/people-names.ts`), which capitalizes
  every run of more than three letters. E2E tests that create users store the name already as
  `displayName(...)`, or a random id in it makes exact assertions fail now and then.
- Locate what the user sees (`getByRole('main')`, a heading, `.visible()`): the news ticker and
  some pages keep hidden copies of the same text.
- A test that passes only on retry is a bug: run e2e with `--retries=0` before calling it green.

## Pull requests

PRs go to `testing`. The `create-pr`, `pr-review` and `commit` skills (`.agents/skills`, from
eagerworks/skills) take this repo's settings from `.eagerworks/*.json`.

When opening a PR that changes any UI, include screenshots in the description:

1. Start the app: `docker-compose up -d` (or `pnpm dev` with the DB running).
2. Capture the affected routes: `pnpm screenshot /route-a /route-b`. It saves PNGs to
   `.pr-screenshots/` and prints a `## Screenshots` section for the body plus the `--attach` flags.
3. Put that section in the body file and pass the flags to `gh pr create` or `gh pr edit`
   (gh ≥ 2.99.0). gh uploads each image and replaces its local path in the body.

Never commit screenshots. The old orphan `pr-screenshots` branch only backs PRs from before
`--attach`; don't push new images to it.
