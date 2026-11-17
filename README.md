# CodeMentor AI

CodeMentor AI is a learning platform for coding practice, debugging skill development, adaptive mentoring, and classroom analytics.

## Project structure

- `backend/` — FastAPI API and RBAC/auth logic
- `frontend/` — Next.js app with Supabase auth and protected routes
- `supabase/migrations/` — PostgreSQL and RLS migration scripts
- `docs/` — implementation and status notes

## Local setup

1. Copy `.env.example` to `backend/.env` for server-only settings.
2. Copy the frontend values (`NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) into `frontend/.env.local`.
3. Fill in your private backend values locally. Never put service-role, JWT, Judge0, or LLM credentials in the frontend environment.
4. Start the backend:
   - `cd backend`
   - `python -m venv venv`
   - `venv\Scripts\python.exe -m pip install -r requirements.txt`
   - `venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload`
5. Start the frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Connect an existing Supabase project

Do not create a second project for this repository. From the repository root, use
the existing project's reference ID from Supabase Dashboard -> Project Settings ->
General:

```powershell
npx supabase login
npx supabase projects list
npx supabase link --project-ref <project-reference-id>
npx supabase migration list --remote
npx supabase db push --remote --dry-run
```

The CLI login uses the browser/account flow. Never paste an access token into chat
or commit local Supabase CLI state. Review the remote schema and migration history
before applying SQL; a dry run only lists pending migrations and does not check
whether their objects already exist.

**Deployment audit:** the linked production project contains the platform
tables and schema objects. After schema reconciliation and explicit approval,
the five verified local versions were recorded as applied in Supabase migration
history; no migration SQL was executed. `migration list --remote` confirmed
the versions. Do not run `db push` for these versions. The duplicate `20261118`
local version was resolved by renaming the hidden-column migration to
`20261118000100_problem_hidden_column_security.sql` without changing its SQL.
History now matches the repository, but it does not prove when the SQL was
originally executed.
The new `20261121000100_scope_course_data_rls.sql` migration is not applied;
do not push it to production until isolated RLS tests pass and explicit
production approval is obtained.

For local configuration, copy the backend values from `.env.example` to
`backend/.env`, and only the frontend values (`NEXT_PUBLIC_BACKEND_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) to
`frontend/.env.local`. Obtain the URL, anon key, service-role key, and JWT
verification secret from the existing project's Dashboard -> Project Settings ->
API. The service-role key and JWT secret must remain backend-only.

Sign up a user in the app. Provision the first administrator through a trusted,
out-of-band database procedure; after that, role changes must use the backend's
admin-only role flow. Never promote an account from client code.

Important:
- Never commit `.env` or service-role credentials to Git.
- Keep service-role access backend-only.
- Do not trust client-supplied roles; always validate them on the server.
- Apply migrations only to the intended Supabase project and verify each script completes before continuing.

## Configure Judge0 CE

Code execution is sent from FastAPI to Judge0; the browser never receives the Judge0 auth token. Set these values in `backend/.env`:

- `JUDGE0_API_URL`: the Judge0 CE API base URL (for example, your self-hosted instance URL).
- `JUDGE0_AUTH_TOKEN`: the private Judge0 token when the instance requires authentication.

The backend sends bounded CPU, wall-clock, memory, and output limits with each run. Python, JavaScript, and C++ are enabled in the current execution registry. A missing URL returns an explicit configuration error; it does not report simulated execution results. No live Judge0 connection has been verified in this environment.

## Problem catalog and workspaces

The Problem Hub and coding/debugging workspaces read published problems and public sample cases from the authenticated FastAPI API. Hidden test cases remain server-side and are used only by the grading endpoint. Debugging hints are requested one tier at a time through the backend. The catalog is empty until real problems and test cases are added to Supabase; the app does not seed fake challenges.

Problem metadata includes `problem_mode` (`normal`, `debugging`, or `both`), `tags`, `supported_languages`, and `progressive_hints`. The administrator problem list reads real records, but create/edit/publish and debugging-variant verification are not implemented. The UI does not simulate saving or validation; use a trusted administrative process until the backend authoring and test-harness workflow is ready.
Hint unlock progress is stored per student/problem in `problem_hint_progress`; higher tiers cannot be requested before prior tiers have been unlocked.

The student dashboard, daily-plan page, and submission history use authenticated backend APIs for
persisted learning, submission, and task data. The teacher page shows courses
owned by the signed-in teacher and exact active enrollment counts; it does not
claim student-level analytics or hint delivery. The administrator dashboard
uses an admin-only backend endpoint for persisted database counts. External
provider labels show configuration only, not service health.

## Configure the AI Mentor

The Mentor sends requests from the authenticated frontend to the FastAPI endpoint at
`/api/v1/platform/mentor`. The backend then calls an OpenAI-compatible chat-completions
provider; its API key is never sent to the browser.

In the backend `.env`, configure:

- `LLM_API_URL`: the provider's chat-completions URL (the example uses OpenAI).
- `LLM_API_KEY`: a private provider key. Keep it only in the backend environment.
- `LLM_MODEL`: a model name supported by that provider.

When following the local setup commands (which start FastAPI from `backend/`), put
these values in `backend/.env`; the root `.env.example` is a template you can copy
from. Do not put `LLM_API_KEY` in `frontend/.env.local` or in any `NEXT_PUBLIC_*`
variable.

Restart FastAPI after setting these values. If provider configuration is missing, the
Mentor returns an explicit service-unavailable error; provider errors are also shown
to the user rather than replaced with simulated answers. When a persisted
`learning_dna_profiles` row exists for the signed-in user, its mastery and activity
summary is supplied to the provider as context. Without that row, no fabricated
Learning DNA values are used.

## Database security notes

- The database uses Supabase Row Level Security (RLS).
- RLS is enabled on all 15 audited public tables. Student-owned records and
  published problem/sample access have owner/public-case policies.
- The current direct-client teacher policies are broader than the intended
  class-scoped access: some permit teachers to view all profiles, submissions,
  and mentor conversations. The backend currently denies teacher profile and
  submission access without an authorized course scope; do not rely on the
  direct-client policies for that boundary until they are narrowed.
- Students have an `ALL` policy on their own submissions, which permits direct
  writes to their own rows. Current app submission writes go through the backend;
  restrict the policy before enabling browser-side submission writes.
- Backend problem and submission-history APIs exclude hidden test data, including legacy submission outputs.
- Browser clients are not granted access to the `progressive_hints` column; hints are served one tier at a time by the backend.
- The production catalog shows `SELECT` revoked for clients on
  `problems.hidden_test_cases` and `problems.progressive_hints`; row-level
  policies expose only public problem test cases to students. This was checked
  from PostgreSQL catalogs, not by an authenticated test-account query.
- The five baseline versions are recorded in production migration history.
  The new course-scoped security migration is local only and must not be
  deployed until it has been tested and explicitly approved.

## Validation

Run backend tests:

```bash
cd backend
venv\Scripts\python.exe -m pytest tests -q
```

External services are not represented as successful when configuration is missing. In particular, the AI Mentor requires backend LLM configuration and a successful provider response; configure real credentials to verify the live integration.

For frontend production validation, run `cd frontend` and `npm run build`. For the complete backend suite from the repository root, run `backend\\venv\\Scripts\\python.exe -m pytest backend\\tests -q`.

GitHub Actions runs the backend suite, frontend lint/type/build checks, and
verifies that Supabase migration versions are unique. It does not deploy
services or apply database migrations. The frontend uses Next.js 16.4.6 and
React 19; CI uses Node 22. `npm audit --omit=dev` reports zero production
vulnerabilities. The full audit still reports 21 development dependency
findings (3 moderate, 18 high), mainly in the Tailwind/lint toolchain; no
breaking Tailwind upgrade was applied.

The latest read-only Supabase migration listing confirms the five baseline
migrations are recorded and `20261121000100_scope_course_data_rls.sql` is
pending. Do not push or repair that production migration until isolated
role-based RLS tests pass and explicit production approval is obtained.
