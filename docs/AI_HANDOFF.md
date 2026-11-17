# CodeMentor AI — AI Handoff

## Verified repository state

- Repository: `shahi1437/CodeMentor_Think_First`
- Branch: `main`
- Base commit for the current milestone: `c5a8cdad781153077a2f80c7d3d2f14d3789a447`.
- The locally validated milestone has been committed and pushed to `full-platform-completion`; preserve the branch history.
- Latest complete checks: backend `74 passed` (two deprecation warnings); frontend TypeScript check and production build passed.
- No authenticated app-level Supabase, Judge0, or LLM-provider request was verified.

## Supabase production check (2026-11-18)

- Existing project `codementor-ai-prod` is active, and local Supabase CLI state
  is linked to it. The CLI project listing confirmed access to the requested
  reference.
- Read-only catalog queries compared the remote table/column definitions,
  defaults, constraints, indexes, RLS policy expressions, routines, triggers,
  extensions, and relevant grants with all migration effects. All 15 tables
  have RLS enabled.
- Before repair, remote migration history was empty although all five
  migrations' effective schema objects already existed. After explicit user
  approval, the five versions were recorded as applied with
  `supabase migration repair`; no migration SQL was executed. A subsequent
  `migration list --remote` confirmed all five versions. Do not run `db push`
  for these versions.
- The `problems.hidden_test_cases` and `progressive_hints` client column grants
  are false. The student test-case policy selects only public cases. This is
  catalog-level verification, not a live authenticated-client denial test.
- Teacher direct-client policies currently grant broad reads of profiles,
  submissions, and mentor conversations; the submission owner policy is `FOR
  ALL`. This does not meet the intended class-scoped/read-only student record
  boundary. Backend teacher profile/submission endpoints currently reject
  requests without an authorized course scope.
- The duplicate `20261118` version was resolved locally by renaming the
  hidden-column migration to `20261118000100_problem_hidden_column_security.sql`;
  its SQL bytes were preserved. `supabase/config.toml` is absent; the existing
  CLI link is in ignored `supabase/.temp` state.
- The five migrations' effective schema effects match the inspected remote
  definitions. History was repaired after explicit approval; this records
  verified versions but does not prove when the SQL was originally run.
- A new local migration, `20261121000100_scope_course_data_rls.sql`, replaces
  broad teacher profile/conversation reads with active-enrollment checks,
  removes direct student submission writes and self-managed enrollments, and
  binds mentor messages to the user's own conversation and verified role. It
  has not been applied to production and requires review, isolated RLS tests,
  and explicit approval before deployment.
- GitHub Actions now checks backend tests, frontend lint/type/build, and migration
  version uniqueness. The hosted workflow has not yet run.
- Frontend dependency audit found one critical production Next.js advisory
  (`npm audit --omit=dev`) and 17 additional development-dependency findings.
  Safe compatible overrides fixed the vulnerable DOMPurify/PostCSS production
  transitive packages; the remaining production fix requires a major upgrade
  to Next.js 16.4.6. Do not force-upgrade Next/Tailwind without reviewing the
  breaking change and rerunning the full regression suite.
- The schema has no problem-to-course assignment relationship. Therefore the
  migration deliberately grants teachers no direct submission reads; those
  remain blocked until a safe assignment scope is designed.
- No backend/frontend `.env` files exist. The app's live database connection
  and test-account isolation/persistence checks remain unverified.
- Do not reapply these migrations. Authenticated-client RLS and hidden-case
  access testing remains unverified.

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
4. Hidden test protection now has API projection tests, an additive column-grant migration for `problems.hidden_test_cases`, and server-side submission grading from `problem_test_cases`. Remote catalog grants/policies block student access; no authenticated-client test was run.
5. Student submission history returns safe summary fields only; legacy runtime metadata and outputs are excluded to avoid exposing previously stored test data.
6. Problem Hub and coding/debugging workspaces now use authenticated database-backed problem and public-sample APIs; debugging hints are returned one tier at a time and hint progression is stored per student/problem.
7. Student/teacher dashboards and daily-plan pages still contain mock data. The admin dashboard now uses database-backed counts; its live database connection remains unverified.
8. The ML classifier has a small in-code example set and heuristics; no independently verified real dataset or model evaluation was found.
9. `knowledge_chunks` and mentor tables exist, but no verified pgvector retrieval path was found during this audit.
10. Service credentials and live Supabase/Judge0/LLM behavior remain unverified.

## Latest milestone and verification

- Full backend test suite: 74 passed; frontend TypeScript check and production build passed.
- Backend tests cover hidden-case projection, database-owned grading, role verification, and tiered-hint privacy. The five baseline migrations are recorded in production; the new security migration remains unapplied.
- Frontend production build passed before the final documentation and small UI refinements.
- Submission status values were normalized to the existing database constraint; no status migration was needed.

## Next actions

1. Review and test `20261121000100_scope_course_data_rls.sql` with isolated student/teacher/admin accounts, then obtain explicit production approval before applying it.
2. Configure backend credentials privately and run authenticated Supabase/Judge0/LLM integration checks.
3. Implement database-backed admin problem CRUD, publication validation, adaptive selection, and a shared execution rate limiter.
4. Persist mentor conversations/messages and add knowledge retrieval only when vector/provider configuration is available.
5. Replace remaining student/teacher dashboard and daily-plan mock data with authorized API data.
6. Continue from the current `main` worktree; verify branch and commit status before delivery.
7. Review and approve the major frontend framework upgrade needed to clear the remaining critical dependency advisory.

## Configuration and live verification

Backend configuration is read from environment variables / the backend working directory's `.env`, including Supabase, Judge0, and `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL`. Keep provider/service-role keys backend-only. Never copy secret values into handoff documents. Record live checks only after making the actual authenticated request.
