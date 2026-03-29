# IPD Budget App — Developer Notes

## Stack
- Next.js 14 (App Router) + React 18 + Tailwind CSS + Recharts
- Supabase (Auth + PostgreSQL + RLS)
- Project ID: `rbllwezrsovrxjyovmko`

## Post-Build Workflow
When a build or feature implementation is validated/completed, **always run the following automatically** (no user request needed):

1. **Run Supabase migrations**: Apply any new SQL files in `supabase/migrations/` to the Supabase project using `mcp__supabase__apply_migration` or `mcp__supabase__execute_sql`
2. **Start the dev server**: Run `npm run dev -- -p 3020` to start the Next.js development server on port 3020

## Project Structure
- `app/(auth)/` — Login page (public)
- `app/(app)/` — Protected app routes (requires auth)
- `app/(app)/admin/` — Admin-only panel (user/permission management)
- `components/budget/` — Main budget app UI components
- `components/admin/` — Admin panel components
- `lib/supabase/` — Supabase client files (client, server, admin)
- `lib/queries/` — Server-side data fetching functions
- `lib/auth-context.js` — Client-side auth context (useUser hook)
- `lib/budget-utils.js` — Shared formatters and constants
- `app/(app)/actions/` — Server actions (budget, scenarios, users)
- `supabase/migrations/` — SQL migration files
- `middleware.js` — Auth redirect middleware

## Auth
- Admin account: sedar.henri
- Only admins can create new users (via admin panel at /admin)
- Roles: admin, editor, viewer
- Permissions: per Business Unit read/write access

## Dev Server
- **Always use port 3020** for this project
- `npm run dev -- -p 3020` — Start development server
- `npm run build` — Production build
