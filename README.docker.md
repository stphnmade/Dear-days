# Docker guide — Dear-days

This document explains how to run the Dear-days Next.js app in Docker for local development and how to build a production image.

Prerequisites

- Docker and docker-compose installed

Development (fast, mounts your source)

1. Copy the example env into `web/.env.local` and edit values as needed:

   ```bash
   cp web/.env.example web/.env.local
   ```

2. Start the development container:

   ```bash
   docker-compose up --build
   ```

3. The app will be available at [http://localhost:3000](http://localhost:3000). Next is started in dev mode and will pick up file changes.

Notes

- The compose file mounts the `web/` folder into the container so host edits are live. Node modules are kept in an anonymous volume inside the container.
- If you use Prisma with the included SQLite DB (`web/prisma/dev.db`), the container uses the mounted file; ensure it exists and is accessible.

Production (build a production image)

1. Build the production image using the Dockerfile in `web/`:

   ```bash
   docker build -t dear-days-web ./web
   ```

2. Run the image:

   ```bash
   docker run -p 3000:3000 -e NODE_ENV=production dear-days-web
   ```

3. For production you should switch Prisma to Postgres (recommended) or another managed DB. Supply a secure `DATABASE_URL` and secrets as environment variables.

Prisma: quick migration guide from SQLite -> Postgres (local dev)

1. Update `web/prisma/schema.prisma`:

   - Change the datasource provider from `sqlite` to `postgresql`.
   - Example datasource block:

     ```prisma
     datasource db {
       provider = "postgresql"
       url      = env("DATABASE_URL")
     }
     ```

2. Set a Postgres `DATABASE_URL` for local development. If you want to use the Postgres service included in `docker-compose.yml`, you can add the following to the `web` environment in `docker-compose.yml` (or export it locally):

   ```env
   DATABASE_URL=postgresql://dd_user:dd_pass@postgres:5432/dear_days?schema=public
   ```

3. Start the Postgres service (if not already running):

   ```bash
   docker-compose up -d postgres
   ```

4. Create and run migrations from the `web/` directory.

   From host (requires prisma installed):

   ```bash
   cd web
   pnpm prisma migrate dev --name init
   ```

   Or run inside the web container:

   ```bash
   docker-compose run --rm web pnpm prisma migrate dev --name init
   ```

5. Generate the client (if necessary):

   ```bash
   pnpm prisma generate
   ```

Notes on this migration

- Migrating from SQLite to Postgres can require small schema adjustments (indexes, enums). Run tests and inspect generated SQL when migrating.
- For CI / production, use `pnpm prisma migrate deploy` to apply already-created migrations.

Devcontainer (VS Code)

There is a `.devcontainer/devcontainer.json` that uses `docker-compose.yml` and attaches VS Code to the `web` service. It will forward port 3000 and run the same dev command from compose.

Next steps / suggestions

- Add CI steps to build and push the production image to your registry.
- Consider switching to Postgres for production and using a managed provider (Heroku, Supabase, Neon, RDS) and store secrets in your CI/CD or cloud provider.
