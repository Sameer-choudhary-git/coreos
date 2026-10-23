# AI Context: HCL Backend Starter

Read this file before editing the repository. Keep changes consistent with this context.

## Goal

Build a small, maintainable backend starter for a five-person, four-hour hackathon. The final domain may be event booking, food ordering, or another problem statement, so do not invent domain models/features before requirements are provided.

## Stack

- Node.js with ES modules (`package.json` should contain `"type": "module"`)
- Express 5
- TypeScript with `module`/`moduleResolution` set for `NodeNext`
- pnpm
- Supabase-hosted PostgreSQL
- Prisma ORM 7 using `@prisma/adapter-pg` and `pg`
- Zod validation
- `helmet`, `cors`, `dotenv`, `tsx`
- Supabase JS client is installed; Supabase Auth middleware may not yet be implemented

## Known setup facts

- Prisma version installed: `7.10.1` (as last reported).
- Prisma generator output is configured under `src/generated/prisma`.
- Prisma config uses `env("DATABASE_URL")` from `prisma/config` and imports `dotenv/config`.
- Prisma 7's PostgreSQL adapter is used to construct the client.
- A temporary `DemoItem` table/model was migrated and a database check successfully created/read a record from Supabase.
- The user is working on Windows PowerShell, e.g. `D:\Shinchan\hcl-backend`.
- TypeScript's `tsconfig.json` includes `"types": ["node"]`, `rootDir: "./src"`, `outDir: "./dist"`, strict checking, and `NodeNext` module behavior.

## Architecture to follow

Use this request flow:

`route -> validation middleware -> controller -> service -> Prisma Client -> PostgreSQL`

Responsibilities:

- `routes/`: paths, HTTP verbs, middleware and controller mapping only.
- `controllers/`: read validated inputs, call services, set status codes and responses.
- `services/`: business rules and database operations.
- `validators/`: Zod schemas for bodies, params, and query strings.
- `middleware/`: authentication, validation, 404 handling, centralized error handling.
- `db/prisma.ts`: export one shared Prisma Client instance using `PrismaPg`.
- `app.ts`: configure Helmet, CORS, JSON parsing, register routes and final error middleware.
- `server.ts`: load environment variables and start listening.

Do not put substantial business logic/Prisma queries in route definitions. Keep implementation straightforward; avoid unnecessary abstractions for a four-hour event.

## Commands

```powershell
pnpm install
pnpm dev
pnpm exec tsc --noEmit
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate dev --name describe_change
pnpm exec prisma studio
```

`pnpm dev` works only if `package.json` has a `dev` script such as `tsx watch src/server.ts`.

## Important implementation rules

1. Check existing files before changing them; preserve the user's working setup.
2. Use installed project tools via `pnpm exec`, not `pnpx tsc` (that previously downloaded an unrelated package named `tsc`).
3. Prisma 7 uses the PostgreSQL driver adapter. Instantiate the client with `new PrismaClient({ adapter })`.
4. Generated Prisma Client output is `src/generated/prisma`; do not edit generated files. Match imports to the actual generated output and ESM/TypeScript setup.
5. Read `DATABASE_URL` from environment/config. Never hardcode credentials or print secrets.
6. Do not commit `.env`. Never expose database URLs or privileged Supabase keys to React/browser code.
7. Validate external input with Zod. Use consistent status codes and error responses.
8. Do not claim Supabase Auth, role authorization, tests, deployment, or other features exist unless they are implemented and verified.
9. For unexpected server errors, log details server-side but return a generic message to clients.
10. Before changing Prisma models, check with the user if the official hackathon domain has not yet been provided. Keep `DemoItem` temporary.
11. Avoid adding dependencies unless they solve a current requirement. Keep `package.json` and `pnpm-lock.yaml` consistent.
12. Test changes with `pnpm exec tsc --noEmit`; for DB changes also validate, migrate, generate, and test the relevant endpoint.

## Collaboration constraints

The user is the backend developer on a five-member team. Optimize for quick integration and clear API contracts. Keep explanations concise and actionable during the hackathon. Do not switch the backend to Java, Prisma alternatives, or a different framework unless the user explicitly asks.
