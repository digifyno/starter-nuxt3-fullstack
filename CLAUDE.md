# Nuxt 3 Fullstack Starter

## Project Structure

```
├── app.vue                    # Root component
├── assets/css/main.css        # Tailwind CSS entry point
├── composables/useAuth.ts     # Authentication composable
├── layouts/default.vue        # Default layout with navbar
├── middleware/auth.ts         # Route authentication middleware
├── pages/                    # File-based routing
│   ├── index.vue             # Landing page
│   ├── login.vue             # Login page
│   ├── register.vue          # Registration page
│   └── tasks.vue             # Task management (protected)
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed data
├── server/
│   ├── api/
│   │   ├── health.get.ts     # Health check endpoint
│   │   ├── auth/             # Authentication endpoints
│   │   └── tasks/            # CRUD task endpoints
│   └── utils/
│       ├── prisma.ts         # Prisma client singleton
│       └── jwt.ts            # JWT utilities
├── tests/                    # Vitest test files
│   └── health.test.ts        # Smoke test
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
npm run build                 # Build for production
npm run preview               # Preview production build
npm run typecheck             # Run type checking
npm run lint                  # Lint with ESLint
npm run lint:fix              # Auto-fix ESLint issues
npm run format                # Format with Prettier
npm test                      # Run tests with Vitest
```

## Development Setup

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Demo account: `demo@example.com` / `password123`

## Tech Stack

- **Nuxt 3** — Vue 3 framework with SSR, file-based routing, auto-imports
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
| GET | `/api/tasks` | Yes | List user's tasks |
| POST | `/api/tasks` | Yes | Create a task |
| PUT | `/api/tasks/:id` | Yes | Update a task |
| DELETE | `/api/tasks/:id` | Yes | Delete a task |

## Authentication

JWT-based auth with httpOnly cookies. The `auth` middleware on the `/tasks` page checks for a valid token before allowing access.

## Conventions

- Server API routes use Nuxt's file-based routing (`server/api/`)
- Request validation uses Zod schemas
- Prisma client is a singleton (see `server/utils/prisma.ts`)
- Composables in `composables/` are auto-imported by Nuxt
- Pages use `definePageMeta({ middleware: 'auth' })` for protected routes

## Deployment

Build output is in `.output/`. For production:
1. Set `DATABASE_URL` to your PostgreSQL connection string
2. Set `JWT_SECRET` to a secure random value
3. Run `npx prisma migrate deploy` then `npm run build`
4. Start with `node .output/server/index.mjs`
