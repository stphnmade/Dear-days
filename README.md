# Dear Days

A family hub that syncs calendars and special days (birthdays, anniversaries), then reminds and celebrates.

## Tech
Next.js (App Router) · Auth.js · Postgres (Prisma) · Vercel/Neon · Google & Microsoft Calendar

## Setup
1. Copy `.env.local.example` → `.env.local` and fill values.
2. `pnpm install`
3. `pnpm dlx prisma migrate dev`
4. `pnpm dev` → http://localhost:3000

## OAuth Redirects
- Google: `/api/auth/callback/google`
- Microsoft: `/api/auth/callback/azure-ad`

## Development Notes
- Manual sync: `POST /api/sync/run`
- Daily cron: `GET /api/cron/daily`
