# CodeMentor AI — Implementation Status

## Current branch
- `feature/complete-production-launch`, based on `origin/main` at `dd67f0b`.
- Milestone commit `67b7721` is pushed to the feature branch; a pull request has not yet been opened.

## Supabase production audit (2026-11-18)
- Existing project `codementor-ai-prod` (`ap-northeast-1`) is active and linked
  with the Supabase CLI. No project was created.
- Remote, read-only catalog queries succeeded. All 15 application tables,
  column types/defaults/nullability, 45 constraints, 29 indexes, 29 complete
  RLS policy definitions, functions, triggers, extensions, and relevant grants
  were compared with the ordered migration effects.
- Before reconciliation, `supabase migration list --remote` reported no remote
  migration versions, although their schema effects already existed. After
  explicit user approval, all five verified versions were recorded as applied
  using metadata-only `migration repair`; the subsequent list confirmed them.
  No migration SQL was executed. Do not run `db push` for these versions.
- Client column privileges for `problems.hidden_test_cases` and
  `problems.progressive_hints` are false. `problem_test_cases` has a
  student-facing SELECT policy limited to non-hidden cases on published
  problems; catalog verification is not a live authenticated-client test.
- RLS is not fully compliant with intended teacher scope: policies permit
  teachers to read all profiles, submissions, and mentor conversations.
  Students can also directly write their own submission rows under the current
  `FOR ALL` policy. Do not enable direct-client access to those flows until
  policy scope is corrected and tested.
- No local `.env`, `backend/.env`, or `frontend/.env.local` exists. Backend
  connectivity from the application and test-account data-isolation tests
  could not be run. Backend unit suite: 80 passed; two deprecation warnings.
- The duplicate local migration version was resolved by renaming the
  hidden-column migration to `20261118000100_problem_hidden_column_security.sql`;
  its SHA-256 was unchanged. Migration history now records all five versions
  after explicit approval; no production migration SQL was run.
- Remote schema effects match all five migrations. The history repair records
  the verified versions but does not prove when their SQL was originally
  executed. Teacher policies remain broader than the intended course scope.
- The latest read-only `npx supabase migration list --remote` confirms the five
  baseline versions are recorded and `20261121000100_scope_course_data_rls.sql`
  is pending. No migration repair, SQL deployment, or other production database
  mutation was run for this milestone.

## Migration inventory

Remote status means whether a version is recorded in Supabase's migration
history. Present schema objects do not prove when or how an individual script
was run.

| Migration | Tables / columns | Policies, indexes, constraints, dependencies | Remote status |
|---|---|---|---|
| `20261117_init_auth_schema.sql` | Creates `profiles`: `id`, `email`, `full_name`, `role`, `preferred_language`, `is_active`, `created_at`, `updated_at`. | Four profile policies; `idx_profiles_role`, `idx_profiles_email`; `user_role` enum; profile PK and FK to `auth.users(id)`; role helper functions and signup trigger. Depends on Supabase Auth. | Recorded as applied after explicit approval; schema effects verified. |
| `20261118_platform_database_schema.sql` | Creates/reuses `profiles`; creates `problems`, `problem_test_cases`, `submissions`, `learning_dna_profiles`, `learning_dna_events`, `daily_plans`, `daily_plan_tasks`, `courses`, `course_enrollments`, `mentor_conversations`, `mentor_messages`, `knowledge_chunks`, `audit_logs`. Columns are the fields shown in each `CREATE TABLE` in the migration. | Enables RLS on all 14 tables; adds profile/problem/test-case/submission/course/mentor/knowledge/audit policies; 11 named `idx_*` indexes; PK/FK/unique constraints and checks for difficulty, submission status, plan/task/enrollment/conversation statuses. Depends on Supabase Auth, profiles, `pgcrypto`, and `vector`. | Recorded as applied after explicit approval; schema effects verified. |
| `20261118000100_problem_hidden_column_security.sql` (renamed from duplicate `20261118`) | No tables or columns created. | Revokes client table/column SELECT and re-grants selected public `problems` columns; no index/constraint/policy changes. Depends on `public.problems`. | Recorded as applied after explicit approval; exact column grants match. |
| `20261119_harden_profile_role_rls.sql` | No tables or columns created. | Replaces role helper functions and three profile policies; no indexes/constraints. Depends on `user_role`, `profiles`, and authenticated role. | Recorded as applied after explicit approval; hardened functions/policies match. |
| `20261120_problem_catalog_metadata.sql` | Adds `problems.problem_mode`, `tags`, `supported_languages`, `progressive_hints`; creates `problem_hint_progress(user_id, problem_id, tier, requested_at)`. | Enables RLS and revokes client access to hint progress; PK `(user_id, problem_id, tier)`, profile/problem FKs, tier 1-4 check, PK index. Depends on `profiles` and `problems`. | Recorded as applied after explicit approval; columns and table match. |
| `20261121000100_scope_course_data_rls.sql` | No tables or columns created. | Replaces broad profile/conversation reads with active-enrollment checks; removes student submission writes and self-managed enrollments; binds mentor messages to the user's own conversation and role. Teachers receive no submission reads because problems are not related to courses. Depends on baseline profile/course/enrollment/submission/mentor tables and role helpers. | Confirmed absent from the latest read-only remote migration list; pending. Requires isolated RLS tests and explicit production approval. |

The platform migration's full column definitions, indexes, triggers, and
constraints remain in the SQL source. Their remote definitions match the
effective final state of the migration sequence. The duplicate version has
been corrected locally and all five baseline versions are recorded remotely.
The new RLS hardening migration remains pending.

### `20261118_platform_database_schema.sql` detail

- Columns: `profiles` (`id`, `email`, `full_name`, `role`,
  `preferred_language`, `is_active`, `created_at`, `updated_at`);
  `problems` (`id`, `title`, `slug`, `difficulty`, `category`,
  `description`, `starter_code`, `hidden_test_cases`, `notes`,
  `is_published`, `created_by`, `created_at`, `updated_at`);
  `problem_test_cases` (`id`, `problem_id`, `name`, `input_text`,
  `expected_output`, `is_hidden`, `created_at`, `updated_at`);
  `submissions` (`id`, `user_id`, `problem_id`, `status`, `score`,
  `language`, `source_code`, `stdout`, `stderr`, `runtime_metadata`,
  `created_at`, `updated_at`);
  `learning_dna_profiles` (`user_id`, `mastery`, `streak_days`,
  `consistency`, `last_activity_at`, `created_at`, `updated_at`);
  `learning_dna_events` (`id`, `user_id`, `event_type`, `event_data`,
  `created_at`);
  `daily_plans` (`id`, `user_id`, `plan_name`, `summary`, `status`,
  `created_at`, `updated_at`);
  `daily_plan_tasks` (`id`, `plan_id`, `title`, `description`, `task_type`,
  `completed`, `created_at`, `updated_at`);
  `courses` (`id`, `teacher_id`, `title`, `code`, `description`,
  `is_published`, `created_at`, `updated_at`);
  `course_enrollments` (`id`, `course_id`, `student_id`,
  `enrollment_status`, `created_at`, `updated_at`);
  `mentor_conversations` (`id`, `user_id`, `course_id`, `topic`, `status`,
  `created_at`, `updated_at`);
  `mentor_messages` (`id`, `conversation_id`, `sender_id`, `sender_role`,
  `message`, `created_at`);
  `knowledge_chunks` (`id`, `source_type`, `source_id`, `title`, `content`,
  `metadata`, `embedding`, `is_public`, `created_at`, `updated_at`);
  `audit_logs` (`id`, `actor_id`, `action`, `resource_type`, `resource_id`,
  `details`, `created_at`).
- Policies: `Users can view own profile`; `Teachers and Admins can view all
  profiles`; `Users can update own profile non-role fields`; `Admins can
  update any profile`; `Published problems are readable by students`;
  `Teachers and admins manage problems`; `Teachers and admins update
  problems`; `Students can read public case data`; `Teachers and admins can
  read hidden cases`; `Teachers and admins manage problem cases`; `Teachers
  and admins update problem cases`; `Students can manage their own
  submissions`; `Teachers and admins can read submissions`; `Owners manage
  learning profiles`; `Owners manage learning events`; `Owners manage daily
  plans`; `Owners manage daily plan tasks`; `Students can view published
  courses`; `Teachers and admins manage courses`; `Students can manage own
  enrollments`; `Teachers and admins manage enrollments`; `Users manage own
  mentor conversations`; `Teachers and admins can view mentor conversations`;
  `Users can manage own mentor messages`; `Knowledge chunks protected`;
  `Teachers and admins manage knowledge chunks`; `Teachers and admins update
  knowledge chunks`; `Admins can read all audit logs`; `Admins can write audit
  logs`.
- Explicit indexes: `idx_profiles_email`, `idx_profiles_role`,
  `idx_problems_published`, `idx_problem_test_cases_problem`,
  `idx_submissions_user_problem`, `idx_learning_dna_events_user`,
  `idx_daily_plans_user`, `idx_course_enrollments_student`,
  `idx_mentor_conversations_user`, `idx_knowledge_chunks_public`,
  `idx_audit_logs_actor`, in addition to PK/unique indexes.
- Constraints: PKs on each table (the Learning DNA profile PK is `user_id`);
  FKs connect profiles to `auth.users`, problem creators/test cases/
  submissions to profiles or problems, child tasks to plans, courses to
  teachers, enrollments to courses/students, mentor records to users/courses/
  conversations, and audit actors to profiles. Unique constraints cover
  problem slug, course code, and `(course_id, student_id)`. Checks constrain
  problem difficulty, submission status, plan status, task type, enrollment
  status, and conversation status.
- Dependencies: Supabase `auth.users`, the `user_role` enum, `pgcrypto`,
  `vector`, and the profile table. The migration also creates `set_updated_at`
  and update triggers on mutable records.

## Verified completion to date
- Phase 1 authentication foundation: complete and tested.
- Phase 2 Supabase frontend authentication: complete and tested.
- Database-backed role repository: implemented with Supabase/PostgreSQL persistence.
- Server-side RBAC and role verification: implemented and tested.
- Backend suite: 80 tests passed in the latest run (two dependency/API deprecation warnings).
- Frontend production build: successful in the latest run.
- The Supabase connection was used for read-only schema catalog checks and an approved metadata-only history repair; backend/authenticated-client, Judge0, and LLM live behavior are not verified.

## Phase 3: Database architecture and APIs
- Supabase migration for auth, profiles, and RLS exists under `supabase/migrations/20261117_init_auth_schema.sql`.
- Added a full additive platform schema migration at `supabase/migrations/20261118_platform_database_schema.sql` covering profiles, problems, test cases, submissions, learning DNA, daily plans, courses, enrollments, mentor data, knowledge chunks, and audit logs.
- Added a real database service abstraction in `backend/app/core/database.py` with explicit configuration errors and repository-style CRUD wrappers for platform tables.
- Added platform API support for profile access, problem retrieval, course visibility, and student daily plans using backend-side authorization checks.
- Student problem reads use a safe column allowlist. Added `supabase/migrations/20261118000100_problem_hidden_column_security.sql` to revoke direct client access to the legacy `problems.hidden_test_cases` column and grant only public columns; its version is recorded in history, while authenticated-client denial testing is pending.
- Added additive metadata migration `supabase/migrations/20261120_problem_catalog_metadata.sql` for problem mode, tags, enabled languages, and progressive hints. The hints column is not part of public problem responses.
- Added authenticated public-sample and tiered-hint endpoints. Public samples are selected with `is_hidden = false`; hint requests return a single requested tier.
- Submission grading loads tests from `problem_test_cases` on the backend, persists aggregate verdict metadata, and does not return hidden input, expected output, or execution output.

## Phase 4: Code execution and Monaco-ready APIs
- Added Judge0 service wrapper in `backend/app/core/judge0.py`.
- Execution API is guarded by live configuration and returns an explicit unconfigured result when credentials are absent.
- Judge0 requests use bounded CPU, wall-clock, memory, and output limits. External timeout errors are not mislabeled as student time-limit verdicts.
- This keeps the system honest: external execution is never claimed as live unless configured.

## Phase 5: Coding and debugging modes
- Added secure execution endpoint and classification flow under `/api/v1/platform`.
- Real debugging support is prepared through structured responses and workflow endpoints.
- Problem Hub and both workspaces load records and public cases from the backend API; mock problem lists are no longer used for those workflows.
- The coding workspace renders persisted per-problem submission history instead of sample history.
- Debugging verification now submits source to the backend regression grader; the previous string-based “fixed code” heuristic and fabricated pass/score message were removed.
- Debugging hints are fetched one tier at a time from the database-backed API. The frontend does not receive the full hint set.
- Hint unlock progress is persisted per student and problem; the API rejects attempts to skip tiers.
- Problem Hub supports database-backed difficulty, mode, topic, and language filtering.
- Problem CRUD/publishing UI, adaptive challenge selection, hint/time/attempt analytics, and execution rate limiting remain incomplete.
- The administrator problem list reads persisted records, but create/edit/publish controls and variant verification remain unavailable; simulated success actions were removed.
- Submission grading uses backend-controlled records, but live DB/Judge0 validation is pending.
- Student submission history omits runtime metadata and outputs, including any legacy hidden-test details stored by older submissions.
- Platform health status reports whether a Judge0 URL is configured; it does not claim that the external service is reachable.

## Phase 6: ML classifier
- Added a scikit-learn-backed error classifier in `backend/app/core/ml_classifier.py`.
- The in-code examples and heuristic fallback are not a validated, attributable training dataset. No production accuracy or held-out evaluation is claimed; real-data training/evaluation remains incomplete.

## Phase 7: AI Mentor
- Frontend Mentor requests are sent with the Supabase access token to `POST /api/v1/platform/mentor`; the hard-coded sample transcript and timeout-based reply simulation have been removed.
- Backend supports an OpenAI-compatible provider configured by `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL`. Credentials remain backend-only.
- Socratic and conceptual modes, bounded conversation history, and persisted `learning_dna_profiles` context are sent to the provider.
- Missing configuration returns HTTP 503; provider failures return an explicit HTTP error. The endpoint does not substitute generated local text.
- Automated tests cover provider request construction, provider failures, missing configuration, and persisted Learning DNA context.
- Current verification: full backend suite passes (80 tests; two deprecation warnings); frontend lint, TypeScript check, and production build succeed.
- Live provider verification is still pending until real backend credentials are supplied and a request succeeds.

## Phase 8: Learning DNA
- Backend aggregates up to 500 recent per-user persisted submissions into per-language accepted rates, solved-problem counts, failure-verdict counts, activity consistency, streak, and recommendations.
- Missing database configuration returns HTTP 503; no-submission users receive an explicit empty profile with no invented metrics.
- The Learning DNA page calls the authenticated API and renders loading, error, empty, and data states; its mock profile and simulated refresh were removed.
- Exact submission verdicts are stored in `runtime_metadata`; the database `status` column uses allowed `passed`, `failed`, and `error` values.
- Full backend suite: 80 passed; frontend lint, TypeScript check, and production build passed. Live Supabase verification remains pending.

## Phase 9: Dashboards
- The admin dashboard reads exact profile, published problem/course, and submission counts from Supabase through an admin-only endpoint; provider labels reflect configuration, not service health.
- The student dashboard reads persisted Learning DNA, submissions, and daily plans through authenticated APIs; adaptive selection is explicitly not implemented.
- The submission history page reads only the signed-in user's safe summary fields and public problem metadata; source code and test outputs are not displayed.
- Daily plans load persisted tasks and save completion changes through an owner-scoped endpoint.
- The teacher dashboard reads only courses owned by the signed-in teacher and exact active-enrollment counts; student-level analytics and hint delivery remain unimplemented.
- Frontend route structure remains intact and UI design is preserved.

## Phase 10: Deployment preparation
- Validation: 80 backend tests passed; frontend lint, TypeScript check, and production build passed; `git diff --check` passed before final documentation changes.
- Added GitHub Actions checks for backend tests, frontend lint/type/build checks, and migration-version uniqueness; the hosted workflow has not yet run.
- Frontend is upgraded to Next.js 16.4.6 / React 19.3.1 with Node 22 in CI. `npm audit --omit=dev` reports zero production vulnerabilities. The full audit still reports 21 development dependency findings (3 moderate, 18 high); resolving them requires a breaking Tailwind upgrade, so no force fix was applied.
- No local `.env` files were found; `.env.example` contains placeholders. A repository-wide historical secret scan was not performed.
- Live external integrations remain gated behind environment configuration.

## Current constraints
- No authenticated app-level Supabase, Judge0, or LLM provider verification was performed; Supabase catalog metadata was queried read-only.
- The production dependency audit is clear; development-tool advisories remain and need a reviewed Tailwind/toolchain upgrade before treating the full dependency tree as clean.
- Live services are implemented safely and documented as requiring actual configuration before runtime verification.
- The system intentionally does not claim external service success without live credentials and successful checks.
- Problem records, public samples, supported languages, and progressive hints now load through backend APIs. A live database is required for end-to-end verification.
- Rate limiting must be deployed through a shared/distributed mechanism before exposing execution endpoints publicly.
- The hidden-column grants exist remotely and migration version `20261118000100` is recorded as applied; authenticated-client denial testing is still pending.
- Production still has broad teacher profile/submission/conversation policies and student direct-submission writes. The local `20261121000100_scope_course_data_rls.sql` migration narrows these, but has not been applied.
- The database has no problem-to-course assignment relationship. Teacher submission access therefore stays denied until such a scope can be proven; active enrollment alone is insufficient.

## Next sustained work
1. Review and test `20261121000100_scope_course_data_rls.sql` with isolated role accounts, then obtain explicit approval before applying it to production.
2. Configure and smoke-test Judge0, then implement a shared rate limiter before public deployment.
3. Implement safe admin problem CRUD, publication validation, and challenge analytics; the current admin list is read-only and no longer simulates success.
4. Persist mentor conversations/messages and add pgvector retrieval when configured.
5. Validate ML with real attributable data and a reproducible evaluation.
6. Configure deployment credentials privately and verify live Supabase, Judge0, and LLM integrations.
