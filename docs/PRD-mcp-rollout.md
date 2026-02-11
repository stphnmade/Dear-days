# PRD: MCP Rollout for Dear Days

Date: 2026-02-10  
Status: Draft  
Owner: Steph  
Project: Dear Days (`Next.js` + `React` + `Prisma` + `Docker`, deploy to `AWS`)

Related PRD:

- `docs/PRD-mvp-v1.md`

## 1) Objective

Roll out MCP tooling in this exact sequence so local development, testing, container workflows, database operations, deployment, and production troubleshooting can be executed consistently and safely:

1. Terminal/Command
2. Filesystem + Git
3. Docker
4. Postgres (local first, prod read-only)
5. AWS (deploy actions only)
6. CloudWatch (logs/metrics for deployed app)

Cross-cutting testing dependency:

- Chrome DevTools MCP is required by the MVP acceptance gate and should be enabled before end-to-end sign-off.

## 2) Problem

Current workflows are split across manual terminal commands and ad-hoc checks. This creates friction in:

- running repeatable local build/test/database tasks
- validating Docker-based runtime behavior early
- shipping to AWS with least privilege
- debugging production issues quickly from logs and metrics

## 3) Goals

- Standardize daily engineering workflows through MCP tools.
- Keep production access constrained by default.
- Support end-to-end loop: code change -> local validation -> container validation -> deploy -> production verification.
- Minimize accidental destructive operations.

## 4) Non-Goals

- Replacing CI/CD entirely with MCP.
- Granting broad admin permissions in AWS.
- Granting write access to production database.
- Finalizing full infrastructure-as-code in this phase.

## 5) Current Context

- App stack: Next.js 15 + React 19 in `web/`.
- ORM and schema: Prisma in `web/prisma/schema.prisma`.
- Local container workflow exists in `docker-compose.yml`.
- Local Prisma datasource is currently `sqlite` in schema; compose already includes optional Postgres service for migration path.

## 6) Scope and Requirements by Phase

### Phase 1: Terminal/Command MCP

Requirements:

- Execute project scripts in `web/package.json` (`dev`, `build`, `lint`, `db:*`).
- Run Docker compose and Prisma commands from controlled working directories.
- Capture command outputs for traceability.

Guardrails:

- Restrict to approved command prefixes where possible.
- Require explicit approval for destructive commands (`db reset`, resource delete, teardown).

Acceptance Criteria:

- Can run `pnpm dev`, `pnpm lint`, `pnpm db:validate`, and `pnpm db:generate` via MCP.
- Can run `docker-compose up --build` and inspect output via MCP.

### Phase 2: Filesystem + Git MCP

Requirements:

- Read and edit repository files.
- Inspect diffs, branch state, and commit history for change review.

Guardrails:

- No automatic force pushes or history rewrites.
- No mass file deletion without explicit confirmation.

Acceptance Criteria:

- Can produce and review minimal diffs for app and infra files.
- Can inspect status and changed files before deploy steps.

### Phase 3: Docker MCP

Requirements:

- Build and run app image from `web/Dockerfile`.
- Manage `web` and `postgres` services from `docker-compose.yml`.
- Inspect container health, logs, and restart behavior.

Guardrails:

- Restrict pruning/deletion commands unless explicitly approved.

Acceptance Criteria:

- Local containerized app starts and serves on `:3000`.
- Postgres service healthcheck passes when enabled.
- Logs can be retrieved for troubleshooting.

### Phase 4: Postgres MCP (Local First, Prod Read-Only)

Requirements:

- Connect to local Postgres container for schema and query validation.
- Connect to production database in read-only mode only.
- Validate Prisma migration behavior against Postgres.

Guardrails:

- Production role enforces read-only access.
- Block DDL/DML against production by policy.

Acceptance Criteria:

- Local Postgres connection works and can inspect tables/indexes.
- Prisma migration and client generation succeed against local Postgres target.
- Production connection can run read-only diagnostics only.

Dependencies:

- Update Prisma datasource provider from `sqlite` to `postgresql` when migration phase starts.

### Phase 5: AWS MCP (Deploy Actions Only)

Requirements:

- Allow deploy-related operations only for chosen webapp target on AWS.
- Support image push and service update flow.
- Read deployment state and health.

Guardrails:

- IAM scoped to deploy paths only.
- No wildcard admin policies.
- Block destructive infrastructure actions by default.

Suggested service scope:

- ECR (image push/pull metadata)
- ECS or App Runner (service deploy/update)
- IAM PassRole only for approved execution roles
- Secrets Manager/SSM Parameter Store read for runtime config

Acceptance Criteria:

- Can deploy a new app revision from container image.
- Can verify service rollout status via MCP.
- Non-deploy administrative actions are denied by policy.

### Phase 6: CloudWatch MCP (Logs/Metrics)

Requirements:

- Query application log groups for request and error analysis.
- Read service metrics and alarms for deploy validation.

Guardrails:

- Read-only CloudWatch permissions.
- Restricted to app-specific log groups and metric namespaces.

Acceptance Criteria:

- Can retrieve logs for latest deploy window.
- Can confirm core health metrics (error rate, latency, restarts).
- Can correlate production issue to specific deployment period.

## 7) End-to-End User Flows

Flow A: Feature development

1. Edit code through Filesystem MCP.
2. Run lint/build/tests via Terminal MCP.
3. Validate runtime in Docker MCP.
4. Validate DB behavior in local Postgres MCP.

Flow B: Deployment

1. Build and validate image with Docker MCP.
2. Trigger deploy with AWS MCP.
3. Validate rollout and logs with CloudWatch MCP.

Flow C: Production incident

1. Pull logs/metrics via CloudWatch MCP.
2. Confirm service state in AWS MCP.
3. Run safe read-only DB diagnostics in Postgres MCP.

## 8) Security and Compliance Requirements

- Principle of least privilege on every MCP server.
- Production DB credentials must be read-only and rotated.
- All deploy actions must be attributable to a named principal.
- Secrets must come from secure stores, never hardcoded in repo.

## 9) Risks and Mitigations

Risk: Over-scoped AWS permissions.  
Mitigation: Start with deny-by-default and permit only deploy resources.

Risk: Schema drift while moving from SQLite to Postgres.  
Mitigation: Run migrations in local Postgres first and validate generated SQL.

Risk: Unsafe commands in Terminal MCP.  
Mitigation: Prefix allowlists and explicit approvals for destructive actions.

Risk: Slow incident response due to noisy logs.  
Mitigation: Standardize log fields and ensure environment/version tags.

## 10) Milestones

M1 (Day 1): Terminal + Filesystem/Git configured and validated.  
M2 (Day 2): Docker workflows validated end-to-end.  
M3 (Day 3): Local Postgres MCP enabled; Prisma migration rehearsal complete.  
M4 (Day 4): AWS deploy-only permissions and deploy path validated in non-prod.  
M5 (Day 5): CloudWatch observability checks validated after deploy.

## 11) Definition of Done

- All six MCP servers are operational in the defined order.
- Acceptance criteria in each phase are met.
- Production access policies are least-privilege and audited.
- Team has a documented runbook for development, deploy, and incident triage.

## 12) Implementation Checklist

- [ ] Configure Terminal/Command MCP with safe defaults.
- [ ] Configure Filesystem + Git MCP and verify diff/review workflow.
- [ ] Configure Docker MCP and validate compose + image workflows.
- [ ] Configure Postgres MCP for local; create read-only prod role and connection.
- [ ] Configure AWS MCP with deploy-only IAM policy.
- [ ] Configure CloudWatch MCP read-only access to app log groups and metrics.
- [ ] Execute end-to-end dry run from local change to deployed verification.
