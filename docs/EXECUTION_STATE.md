# CodeMentor AI — Execution State

## Current checkpoint

- Branch: `full-platform-completion`
- Base commit for the current milestone: `c5a8cdad781153077a2f80c7d3d2f14d3789a447`.
- The milestone is committed and pushed; continue from current branch history.
- Latest complete validation: backend 70 passed (two deprecation warnings); frontend production build passed.
- No live Supabase, Judge0, or LLM request was verified.

## Supabase production audit checkpoint (2026-11-17)

- The existing `codementor-ai-prod` Supabase project is active and linked via
  the CLI; the remote database answered read-only schema catalog queries.
- Remote public schema: all 15 application tables are present and RLS is
  enabled. Client SELECT is revoked on `problems.hidden_test_cases` and
  `problems.progressive_hints`; student case policy filters hidden cases.
- Migration list shows no remote versions (migration-history table absent),
  while the dry run lists all five local files as pending. The schema already
  has the corresponding objects. No migration was pushed or repaired.
- Do not push or repair until the user approves history reconciliation. The two
  `20261118` files share a version prefix and need a unique-version plan first.
- RLS gaps: teachers can read all profiles/submissions/mentor conversations
  directly; student submissions have a direct-client `FOR ALL` policy. Narrow
  these against course enrollment before claiming full authorization.
- This is not a backend connection test: `.env` files are absent and no real
  service-role/JWT configuration was loaded. The backend test suite passed
  locally (70 tests); no remote test records were created.

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

- Complete database-backed teacher/admin problem CRUD, publication validation, and adaptive challenge selection.
- Add shared execution rate limiting before public exposure.
- Persist mentor conversations and messages; implement pgvector retrieval only when configured.
- Replace remaining mock dashboards and daily-plan/problem-page data.
- Validate ML with real attributable data and a reproducible evaluation.
- Perform live Supabase, Judge0, and LLM verification when credentials are available.
- Apply and verify all current migrations on the intended Supabase project.

## Next command/action

The current milestone is locally implemented, validated, committed, and pushed. Live Supabase/Judge0/LLM verification still awaits private configuration; do not describe the services as live-tested.

No live external service verification has occurred. Do not commit or push this partial platform milestone as full-platform completion.
