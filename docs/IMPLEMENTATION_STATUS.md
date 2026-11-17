# CodeMentor AI — Implementation Status

## Current branch
- `full-platform-completion`

## Supabase production audit (2026-11-17)
- Existing project `codementor-ai-prod` (`ap-northeast-1`) is active and linked
  with the Supabase CLI. No project was created.
- Remote, read-only catalog queries succeeded. The public schema contains the
  15 application tables from the migrations plus `problem_hint_progress`; RLS
  is enabled on all 15.
- `supabase migration list --remote` reports no remote migration versions, and
  the migration-history table is absent. The dry run lists all five local files
  as pending. The schema objects already exist, so no migration was applied and
  `db push` must not be run blindly.
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
  could not be run. Backend unit suite: 70 passed; two deprecation warnings.
- Migration reconciliation and teacher-policy changes were not approved.
  No migration repair or production SQL was run. The two `20261118_*.sql`
  files share a migration version, which must be resolved before history can
  safely represent both.

## Migration inventory

Remote status means whether a version is recorded in Supabase's migration
history. Present schema objects do not prove when or how an individual script
was run.

| Migration | Tables / columns | Policies, indexes, constraints, dependencies | Remote status |
|---|---|---|---|
| `20261117_init_auth_schema.sql` | Creates `profiles`: `id`, `email`, `full_name`, `role`, `preferred_language`, `is_active`, `created_at`, `updated_at`. | Four profile policies; `idx_profiles_role`, `idx_profiles_email`; `user_role` enum; profile PK and FK to `auth.users(id)`; role helper functions and signup trigger. Depends on Supabase Auth. | Not recorded. Profile schema and policies exist remotely. |
| `20261118_platform_database_schema.sql` | Creates/reuses `profiles`; creates `problems`, `problem_test_cases`, `submissions`, `learning_dna_profiles`, `learning_dna_events`, `daily_plans`, `daily_plan_tasks`, `courses`, `course_enrollments`, `mentor_conversations`, `mentor_messages`, `knowledge_chunks`, `audit_logs`. Columns are the fields shown in each `CREATE TABLE` in the migration. | Enables RLS on all 14 tables; adds profile/problem/test-case/submission/course/mentor/knowledge/audit policies; 11 named `idx_*` indexes; PK/FK/unique constraints and checks for difficulty, submission status, plan/task/enrollment/conversation statuses. Depends on Supabase Auth, profiles, `pgcrypto`, and `vector`. | Not recorded. All 14 tables and RLS are present remotely. |
| `20261118_problem_hidden_column_security.sql` | No tables or columns created. | Revokes client table/column SELECT and re-grants selected public `problems` columns; no index/constraint/policy changes. Depends on `public.problems`. | Not recorded. Catalog confirms hidden JSON and hint columns are not client-selectable, but this script's run is unproven. |
| `20261119_harden_profile_role_rls.sql` | No tables or columns created. | Replaces role helper functions and three profile policies; no indexes/constraints. Depends on `user_role`, `profiles`, and authenticated role. | Not recorded. Hardened functions/policies exist remotely. |
| `20261120_problem_catalog_metadata.sql` | Adds `problems.problem_mode`, `tags`, `supported_languages`, `progressive_hints`; creates `problem_hint_progress(user_id, problem_id, tier, requested_at)`. | Enables RLS and revokes client access to hint progress; PK `(user_id, problem_id, tier)`, profile/problem FKs, tier 1-4 check, PK index. Depends on `profiles` and `problems`. | Not recorded. Columns and table are present remotely. |

The platform migration's full column definitions, indexes, triggers, and
constraints remain in the SQL source. The remote schema currently appears
consistent with these objects, but migration history reconciliation requires
approval and a versioning fix before using `supabase migration repair`.

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
- Backend suite: 70 tests passed in the latest run (two dependency/API deprecation warnings).
- Frontend production build: successful in the latest run.
- This status is based on local code/tests; Supabase, Judge0, and LLM live connections are not verified.

## Phase 3: Database architecture and APIs
- Supabase migration for auth, profiles, and RLS exists under `supabase/migrations/20261117_init_auth_schema.sql`.
- Added a full additive platform schema migration at `supabase/migrations/20261118_platform_database_schema.sql` covering profiles, problems, test cases, submissions, learning DNA, daily plans, courses, enrollments, mentor data, knowledge chunks, and audit logs.
- Added a real database service abstraction in `backend/app/core/database.py` with explicit configuration errors and repository-style CRUD wrappers for platform tables.
- Added platform API support for profile access, problem retrieval, course visibility, and student daily plans using backend-side authorization checks.
- Student problem reads use a safe column allowlist. Added `supabase/migrations/20261118_problem_hidden_column_security.sql` to revoke direct client access to the legacy `problems.hidden_test_cases` column and grant only public columns; live migration execution is pending.
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
- Submission grading uses backend-controlled records, but live DB/Judge0 validation is pending.
- Student submission history omits runtime metadata and outputs, including any legacy hidden-test details stored by older submissions.
- Platform health status reports whether a Judge0 URL is configured; it does not claim that the external service is reachable.

## Phase 6: ML classifier
- Added a scikit-learn-backed error classifier in `backend/app/core/ml_classifier.py`.
- It trains on common debugging labels when dependencies are available and gracefully falls back to heuristics otherwise.
- This keeps the project safe and testable without fabricating accuracy claims.

## Phase 7: AI Mentor
- Frontend Mentor requests are sent with the Supabase access token to `POST /api/v1/platform/mentor`; the hard-coded sample transcript and timeout-based reply simulation have been removed.
- Backend supports an OpenAI-compatible provider configured by `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL`. Credentials remain backend-only.
- Socratic and conceptual modes, bounded conversation history, and persisted `learning_dna_profiles` context are sent to the provider.
- Missing configuration returns HTTP 503; provider failures return an explicit HTTP error. The endpoint does not substitute generated local text.
- Automated tests cover provider request construction, provider failures, missing configuration, and persisted Learning DNA context.
- Current verification: full backend suite passes (70 tests; two deprecation warnings) and the frontend production build succeeds.
- Live provider verification is still pending until real backend credentials are supplied and a request succeeds.

## Phase 8: Learning DNA
- Backend aggregates up to 500 recent per-user persisted submissions into per-language accepted rates, solved-problem counts, failure-verdict counts, activity consistency, streak, and recommendations.
- Missing database configuration returns HTTP 503; no-submission users receive an explicit empty profile with no invented metrics.
- The Learning DNA page calls the authenticated API and renders loading, error, empty, and data states; its mock profile and simulated refresh were removed.
- Exact submission verdicts are stored in `runtime_metadata`; the database `status` column uses allowed `passed`, `failed`, and `error` values.
- Full backend suite: 70 passed; frontend production build passed. Live Supabase verification remains pending.

## Phase 9: Dashboards
- A teacher/admin summary endpoint exists, but currently returns hard-coded metrics/alerts and is not production analytics.
- Frontend route structure remains intact and UI design is preserved.

## Phase 10: Deployment preparation
- Validation: 70 backend tests passed; the Next.js production build passed; `git diff --check` and `git diff --cached --check` passed.
- No credentials or real `.env` files were detected in the current staged/unstaged changes; `.env.example` contains placeholders. A repository-wide historical secret scan was not performed.
- Live external integrations remain gated behind environment configuration.

## Current constraints
- No live Supabase, Judge0, or LLM provider verification was performed in this environment.
- Live services are implemented safely and documented as requiring actual configuration before runtime verification.
- The system intentionally does not claim external service success without live credentials and successful checks.
- Problem records, public samples, supported languages, and progressive hints now load through backend APIs. A live database is required for end-to-end verification.
- Rate limiting must be deployed through a shared/distributed mechanism before exposing execution endpoints publicly.
- The new hidden-column grants migration has not been applied to a live Supabase project.

## Next sustained work
1. Configure Supabase privately, apply the migrations in order, and verify database queries against the intended project.
2. Configure and smoke-test Judge0, then implement a shared rate limiter before public deployment.
3. Complete database-backed teacher/admin problem CRUD, publication validation, and challenge analytics.
4. Replace remaining mock dashboard and daily-plan data with authorized API data.
5. Persist mentor conversations/messages and add pgvector retrieval when configured.
6. Validate ML with real attributable data and a reproducible evaluation.
7. Add CI/CD and deployment pipeline documentation.
