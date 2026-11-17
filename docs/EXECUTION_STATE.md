# CodeMentor AI — Execution State

## Current checkpoint

- Branch: `feature/complete-production-launch`
- Base commit: `dd67f0b` (merged PR #7, based on `origin/main`).
- PR #8 is open against `main`; it has not been merged.
- Latest complete validation: backend 80 passed (two deprecation warnings); frontend lint, TypeScript check, and production build passed.
- No authenticated app-level Supabase, Judge0, or LLM request was verified.

## Supabase production audit checkpoint (2026-11-18)

- The existing `codementor-ai-prod` Supabase project is active and linked via
  the CLI; the remote database answered read-only schema catalog queries.
- Read-only catalogs confirmed all 15 tables with RLS enabled and compared
  column definitions/defaults, constraints, indexes, 29 policies, routines,
  triggers, extensions, and relevant grants with migration effects.
- Before repair, migration history had no remote versions although all five
  migrations' effective schema objects existed. After explicit user approval,
  the five versions were recorded as applied with metadata-only
  `migration repair`; no SQL was pushed. The subsequent remote migration list
  confirmed all five versions.
- The duplicate migration version is resolved locally: the hidden-column file
  is now `20261118000100_problem_hidden_column_security.sql` with identical SQL
  bytes. Do not push these migrations; their effects already exist, and history
  repair does not prove when the SQL was originally executed.
- A new additive migration, `20261121000100_scope_course_data_rls.sql`, was
  added locally to narrow teacher profile/conversation reads, remove
  student-managed enrollment and submission writes, and secure mentor-message
  ownership. It is not applied remotely and needs isolated role-based tests
  plus explicit approval before production deployment.
- Added `.github/workflows/ci.yml` for backend tests, frontend lint/type/build
  checks, and unique migration versions. Hosted CI verification is pending.
- Latest read-only migration listing shows the five baseline versions recorded
  remotely and `20261121000100` pending. No production migration or SQL change
  was made in this milestone.
- Student dashboard and daily-plan pages now use authenticated persisted data;
  daily-task completion is owner-scoped and saved through the backend.
- Submission history uses the authenticated safe-summary endpoint and public
  problem metadata; it no longer renders seeded mock submissions or test output.
- Teacher dashboard now shows teacher-owned course metadata and exact active
  enrollment counts, without claiming student analytics or hint delivery.
- Frontend was upgraded to Next.js 16.4.6 / React 19.3.1 and CI Node 22.
  Production audit reports zero vulnerabilities; full audit still reports 21
  development dependency findings, mostly requiring a reviewed Tailwind major
  upgrade.
- Teachers are intentionally not granted direct submission reads: the schema
  has no problem-to-course assignment relation, so active enrollment alone
  cannot prove an individual submission belongs to a teacher's course.
- RLS gaps: teachers can read all profiles/submissions/mentor conversations
  directly; student submissions have a direct-client `FOR ALL` policy. Narrow
  these against course enrollment before claiming full authorization.
- This is not a backend connection test: `.env` files are absent and no real
  service-role/JWT configuration was loaded. The backend test suite passed
  locally (80 tests); no remote test records were created.

## Latest milestone

- Handoff documents were added and the implementation checklist is current.
- Submission verdict persistence now uses the existing database-supported statuses and preserves the actual verdict in metadata.
- Learning DNA aggregates the signed-in user's persisted submission history; no-history users receive an explicit empty result.
- The frontend Learning DNA page is connected to that authenticated endpoint with loading, error, empty, and success states.
- Published problem reads omit hidden-test fields; the additive column-grant migration prevents client roles from selecting the legacy hidden JSON column.
- Submission grading loads database test cases on the backend, persists aggregate/verdict data only, and returns no hidden input, expected output, or execution output.
- Student submission history is projected to safe summary fields so legacy runtime metadata cannot expose previously stored hidden cases.
- Platform status reports Judge0 URL configuration accurately instead of treating an authenticated user as evidence of service configuration.
- Authentication now fails closed if the configured JWT secret or persisted database role cannot be verified; JWT role claims are not authoritative.
- Role reads/writes and database persistence failures surface explicit errors instead of successful-looking local fallbacks.
- Judge0 polling recognizes only pending status IDs, applies resource limits, and keeps service timeouts distinct from student execution time limits.
- Problem catalog and both workspace routes now load published problem data and public samples through FastAPI; mock fallbacks and fabricated submission history were removed.
- Debugging verification now uses the real submit grader against backend-held cases; code-string heuristics and fabricated mastery rewards were removed.
- Added a metadata migration and backend endpoints for supported problem modes/languages and one-at-a-time hints.
- Hint tier progression is persisted per student/problem; the API prevents skipped tiers.

## Remaining verified gaps

- Complete safe database-backed admin problem authoring/publication and adaptive challenge selection.
- Add shared execution rate limiting before public exposure.
- Persist mentor conversations and messages; implement pgvector retrieval only when configured.
- Validate ML with real attributable data and a reproducible evaluation.
- Perform live Supabase, Judge0, and LLM verification when credentials are available.
- Test the new RLS migration against isolated role accounts; deploy only after
  explicit approval. The five baseline versions are already recorded remotely.

## Next command/action

PR #8 is open against `main`; verify hosted checks and do not merge without approval. Live app-level Supabase/Judge0/LLM verification still awaits private configuration.

No authenticated app-level Supabase, Judge0, or LLM integration verification
has occurred. Read-only Supabase catalog queries did succeed. Do not commit or
describe this partial milestone as full-platform completion; production RLS
hardening and live-service checks remain outstanding.
