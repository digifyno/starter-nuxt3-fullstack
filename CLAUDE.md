# Nuxt 4 Fullstack Starter

## Project Structure

```
├── app/                       # Nuxt 4 app directory
│   ├── app.vue               # Root component
│   ├── assets/css/main.css   # Tailwind CSS entry point
│   ├── composables/useAuth.ts # Authentication composable
│   ├── layouts/default.vue   # Default layout with navbar
│   ├── middleware/auth.ts    # Route authentication middleware
│   └── pages/                # File-based routing
│       ├── index.vue         # Landing page
│       ├── login.vue         # Login page
│       ├── register.vue      # Registration page
│       ├── forgot-password.vue
│       ├── reset-password.vue
│       └── tasks.vue         # Task management (protected)
├── prisma/
│   ├── schema.prisma         # Database schema (Task has @@index([userId]))
│   └── seed.ts               # Seed data
├── server/
│   ├── api/
│   │   ├── health.get.ts     # Health check endpoint
│   │   ├── auth/             # Authentication endpoints
│   │   └── tasks/            # CRUD task endpoints (GET supports pagination)
│   ├── middleware/
│   │   ├── rate-limit.ts     # Rate limiting for auth endpoints (10 req/min/IP)
│   │   ├── csp.ts            # Dynamic Content Security Policy with per-request nonces
│   │   └── csrf.ts           # CSRF protection middleware
│   ├── plugins/
│   │   └── startup-check.ts  # Validates JWT_SECRET is set on startup (via NUXT_JWT_SECRET)
│   └── utils/
│       ├── prisma.ts         # Prisma client singleton
│       └── jwt.ts            # JWT utilities
├── tests/                    # Vitest test files
│   ├── global-setup.ts       # Global test setup (isolated test DB)
│   ├── health.test.ts        # Health endpoint smoke test
│   ├── auth.test.ts          # Auth integration tests (register, login, me, logout)
│   ├── tasks.test.ts         # Task CRUD integration tests
│   ├── rate-limit.test.ts    # Rate limiting integration tests
│   ├── security-headers.test.ts  # Security headers tests
│   ├── csp.test.ts           # Content Security Policy tests
│   ├── csrf.test.ts          # CSRF protection tests
│   └── token-cleanup.test.ts # JWT token cleanup tests
├── eslint.config.mjs         # ESLint flat config (via @nuxt/eslint)
├── vitest.config.ts          # Vitest configuration
├── nuxt.config.ts            # Nuxt configuration
└── package.json
```

## Commands

```bash
npm install                   # Install dependencies
npx prisma generate           # Generate Prisma client
npx prisma db push            # Push schema to database
npm run db:seed               # Seed demo data
npm run dev                   # Start dev server (http://localhost:3000)
npm run build                 # Build for production (output in dist/)
npm run preview               # Preview production build
npm run typecheck             # Run type checking
npm run lint                  # Lint with ESLint
npm run lint:fix              # Auto-fix ESLint issues
npm run format                # Format with Prettier
npm test                      # Run tests with Vitest (requires prior npm run build)
```

## Development Setup

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Demo account (after seeding): `demo@example.com` / `Password123`

## Tech Stack

- **Nuxt 4** — Vue 3 framework with SSR, file-based routing, auto-imports
- **Tailwind CSS 4** — Utility-first CSS via `@tailwindcss/vite` plugin
- **Prisma** — Type-safe ORM with SQLite (swap to PostgreSQL for production)
- **TypeScript** — Full type safety throughout
- **Zod** — Request validation on server API routes
- **ESLint** — Code linting via `@nuxt/eslint` (flat config)
- **Prettier** — Code formatting
- **Vitest** — Unit/integration testing via `@nuxt/test-utils`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/logout` | No | Logout (clears cookie) |
| GET | `/api/tasks` | Yes | List user's tasks (paginated) |
| POST | `/api/tasks` | Yes | Create a task |
| PUT | `/api/tasks/:id` | Yes | Update a task |
| DELETE | `/api/tasks/:id` | Yes | Delete a task |

### Task List Pagination

`GET /api/tasks` accepts optional query parameters and returns a paginated response:

```
GET /api/tasks?page=1&limit=20
```

Response shape:
```json
{
  "tasks": [...],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

Defaults: `page=1`, `limit=20`. Maximum `limit` is 100.

## Authentication

JWT-based auth with httpOnly cookies. The `auth` middleware on the `/tasks` page checks for a valid token before allowing access.

`JWT_SECRET` **must** be set as an environment variable. Use `NUXT_JWT_SECRET` when running the production server (`node dist/server/index.mjs`). The server plugin (`server/plugins/startup-check.ts`) throws on startup if it is missing.

## Nuxt 4 Directory Structure

In Nuxt 4, application code lives in `app/`:
- `app/pages/` — file-based routes
- `app/layouts/` — layout components
- `app/composables/` — auto-imported composables
- `app/middleware/` — route middleware
- `app/assets/` — CSS and static assets
- `app/app.vue` — root component

The `server/` directory remains at the project root (not inside `app/`).

## Build Output

Build output goes to `dist/` (configured via `nitro.output.dir` in `nuxt.config.ts`):
- `dist/public/` — static assets served by nginx
- `dist/server/` — SSR server bundle

Start the server: `node dist/server/index.mjs`

## Security

- **CSP & security headers** — applied globally via `routeRules` in `nuxt.config.ts`:
  - `Strict-Transport-Security` (HSTS, max-age=63072000 with preload), `Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
  - `Content-Security-Policy` applied dynamically via `server/middleware/csp.ts` with per-request nonces (eliminates `unsafe-inline`)
- **Rate limiting** — `server/middleware/rate-limit.ts` enforces 10 requests/60s per IP on `/api/auth/login` and `/api/auth/register`. Returns `429 Too Many Requests` with a `Retry-After` header. Set `RATE_LIMIT_DISABLED=1` to bypass in tests.
- **JWT secret required** — enforced at startup; the server refuses to start without `NUXT_JWT_SECRET`.

## Testing Notes

Tests use `build: false` to avoid rebuilding the app during test runs. A `pretest` npm lifecycle hook automatically builds when `dist/` is missing, so `npm test` works on fresh checkouts:

```bash
npm test       # Auto-builds if dist/ is missing, then runs tests
```

If `dist/` already exists (e.g., you built recently), the pretest completes instantly and skips rebuilding. To force a rebuild, delete `dist/` before running `npm test`.

Tests pass environment variables with Nuxt 4 conventions:
- `NUXT_JWT_SECRET` instead of `JWT_SECRET`
- `DATABASE_URL` for the SQLite test database

## Conventions

- Server API routes use Nuxt's file-based routing (`server/api/`)
- Request validation uses Zod schemas
- Prisma client is a singleton (see `server/utils/prisma.ts`)
- Composables in `app/composables/` are auto-imported by Nuxt
- Pages use `definePageMeta({ middleware: 'auth' })` for protected routes
- Server files use relative imports (not `~/server/utils/`) since `~` resolves to `app/`

## Deployment

Build output is in `dist/`. For production:
1. Set `DATABASE_URL` to your PostgreSQL connection string
2. Set `NUXT_JWT_SECRET` to a secure random value (required — server will not start without it)
3. Run `npx prisma migrate deploy` then `npm run build`
4. Start with `node dist/server/index.mjs`
