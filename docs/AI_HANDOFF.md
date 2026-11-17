# CodeMentor AI — AI Handoff

## Verified repository state

- Repository: `shahi1437/CodeMentor_Think_First`
- Branch: `full-platform-completion`
- Base commit for the current milestone: `c5a8cdad781153077a2f80c7d3d2f14d3789a447`.
- The locally validated milestone has been committed and pushed to `full-platform-completion`; preserve the branch history.
- Latest complete checks: backend `70 passed` (two deprecation warnings); frontend production build passed.
- No live Supabase, Judge0, or LLM-provider request was verified.

## Supabase production check (2026-11-17)

- Existing project `codementor-ai-prod` is active, and local Supabase CLI state
  is linked to it. The CLI project listing confirmed access to the requested
  reference.
- A read-only catalog query connected to the remote database. All 15 audited
  public tables have RLS enabled, including the 14 platform/auth tables and
  `problem_hint_progress`.
- Remote migration history is empty/absent. `migration list --remote` reports
  all five local migrations as pending even though their corresponding tables,
  columns, policies, and indexes already exist. No migration was applied by
  this session; do not run `db push`.
- The `problems.hidden_test_cases` and `progressive_hints` client column grants
  are false. The student test-case policy selects only public cases. This is
  catalog-level verification, not a live authenticated-client denial test.
- Teacher direct-client policies currently grant broad reads of profiles,
  submissions, and mentor conversations; the submission owner policy is `FOR
  ALL`. This does not meet the intended class-scoped/read-only student record
  boundary. Backend teacher profile/submission endpoints currently reject
  requests without an authorized course scope.
- Two files have the same migration version prefix (`20261118`), so history
  cannot safely represent them as separate versions until fixed.
- No backend/frontend `.env` files exist. The app's live database connection
  and test-account isolation/persistence checks remain unverified.
- Do not use migration repair until the user approves after reviewing the
  object comparison and migration-version correction plan.

## Current architecture snapshot

- Next.js App Router frontend is under `frontend/src/app/`; FastAPI routes are registered through `backend/app/api/v1/api.py`.
- Supabase profiles and application data are accessed by backend services. Roles are database-authoritative in the role repository.
- Additive schema migrations are under `supabase/migrations/`.
- Judge0 and LLM integrations use backend environment configuration. A build or mocked provider test is not live-service verification.
- Authentication is Supabase Auth, not Firebase. `profiles.id` is a UUID
  foreign key to `auth.users(id)`; Firebase UIDs require a separately approved
  identity-mapping design before they can be used.

## Verified unfinished or misleading areas

1. `/api/v1/platform/learning-dna` previously used hard-coded metrics. It now aggregates per-user persisted submissions (up to 500 records) and returns an explicit empty profile when there are no submissions.
2. The Learning DNA page previously rendered `MOCK_DNA_PROFILE` and simulated recalculation. It now calls the authenticated API and renders loading, error, empty, and data states.
3. Submission verdicts are normalized to the existing database constraint's `passed`, `failed`, and `error` values; the exact verdict remains in `runtime_metadata`. Judge0-not-configured is reported as `configuration_error`, not as a wrong answer.
4. Hidden test protection now has API projection tests, an additive column-grant migration for `problems.hidden_test_cases`, and server-side submission grading from `problem_test_cases`. Apply the migration to Supabase before claiming live direct-client protection.
5. Student submission history returns safe summary fields only; legacy runtime metadata and outputs are excluded to avoid exposing previously stored test data.
6. Problem Hub and coding/debugging workspaces now use authenticated database-backed problem and public-sample APIs; debugging hints are returned one tier at a time and hint progression is stored per student/problem.
7. Dashboard and daily-plan pages still contain mock data and require further API integration.
8. The ML classifier has a small in-code example set and heuristics; no independently verified real dataset or model evaluation was found.
9. `knowledge_chunks` and mentor tables exist, but no verified pgvector retrieval path was found during this audit.
10. Service credentials and live Supabase/Judge0/LLM behavior remain unverified.

## Latest milestone and verification

- Full backend test suite: 70 passed; frontend production build passed.
- Backend tests cover hidden-case projection, database-owned grading, role verification, and tiered-hint privacy. The new migrations have not been applied to a live project.
- Frontend production build passed before the final documentation and small UI refinements.
- Submission status values were normalized to the existing database constraint; no status migration was needed.

## Next actions

1. Configure Supabase and Judge0 privately, apply migrations in order, and perform live integration checks.
2. Implement database-backed admin problem CRUD, publication validation, adaptive selection, and a shared execution rate limiter.
3. Persist mentor conversations/messages and add knowledge retrieval only when vector/provider configuration is available.
4. Replace remaining mock dashboard and daily-plan data with authorized API data.
5. Continue from the committed state; do not claim live-service verification.

## Configuration and live verification

Backend configuration is read from environment variables / the backend working directory's `.env`, including Supabase, Judge0, and `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL`. Keep provider/service-role keys backend-only. Never copy secret values into handoff documents. Record live checks only after making the actual authenticated request.
