# CodeMentor AI — Verified Implementation Checklist

Status definitions: **Implemented** means source exists; **Tested** means the relevant local check passed; **Live verified** means the real external service was exercised. A built UI or mocked integration is not live verification.

## Foundation and access

- [x] Next.js/FastAPI/Supabase project structure exists.
- [x] Supabase authentication and server-side role resolution are implemented.
- [x] Backend tests cover core authentication and role protections.
- [ ] Live Supabase authentication/database verification.
- [ ] Review RLS policies against all current API operations and document live-policy checks.

## Database and submissions

- [x] Additive migrations define the platform table set and RLS policies.
- [x] Existing five migration versions are recorded in production after schema-equivalence review.
- [ ] Apply the new course-scoped RLS hardening migration after isolated policy tests and explicit production approval.
- [x] Problem metadata migration adds mode, tags, configured languages, and server-controlled progressive hints.
- [x] Backend public-sample query explicitly filters hidden cases.
- [x] Progressive hints are served one tier per authenticated backend request.
- [x] Hint-tier progression is persisted per student/problem and tier skips are rejected.
- [x] Student problem reads omit hidden-test columns; an additive column-grant migration blocks direct client reads of legacy hidden JSON.
- [x] Submission grading uses backend-loaded problem test cases and returns only safe verdict/count information.
- [x] Database service exposes Supabase-backed operations.
- [x] Submission API maps verdicts to constraint-supported statuses and preserves exact verdict metadata.
- [ ] CRUD APIs completed and tested for all required domains.
- [x] Verify baseline migration-history records with `supabase migration list --remote`.
- [ ] Verify hidden-test denial using authenticated student and teacher test accounts.
- [ ] Run the new RLS migration against an isolated database and test student/teacher/admin boundaries before requesting production approval.

## Coding and debugging

- [x] Monaco editor is integrated in the coding/debugging workspaces.
- [x] Backend Judge0 request/polling wrapper and execution endpoints exist.
- [x] Problem Hub and coding/debugging workspaces load problem data and public samples through the backend API.
- [x] Coding workspace renders persisted per-problem submission history instead of static sample history.
- [x] Debugging verification uses the actual submission grader; no code-string acceptance shortcut remains.
- [x] Isolated tests cover database-backed test execution and hidden data non-disclosure.
- [ ] Validate submission workflow against real persisted data and live Judge0.
- [ ] Live Judge0 run and submission verification.
- [ ] Adaptive challenge selection, verified seeded challenge management, and time/attempt analytics.
- [ ] Database-backed teacher/admin problem CRUD, publication validation, and complete challenge analytics.
- [ ] Shared/distributed execution rate limiting.

## ML

- [x] A scikit-learn classifier module and prediction endpoint exist.
- [ ] Validate an attributable real dataset and reproducible train/evaluate pipeline.
- [ ] Evaluate and report metrics from real held-out data; do not infer accuracy from embedded examples.
- [ ] Integrate reliable predictions and unknown/error handling into debugging flow.

## AI Mentor

- [x] Authenticated frontend-to-FastAPI request is implemented.
- [x] Backend-configured OpenAI-compatible provider, Socratic/conceptual modes, bounded history, and persisted Learning DNA context are implemented.
- [x] Missing provider configuration and provider failures are explicit; no local simulated response is returned.
- [x] Mocked provider tests and frontend production build passed.
- [ ] Persist conversations/messages and retrieve curriculum knowledge with pgvector.
- [ ] Live LLM request and privacy verification.

## Learning DNA and dashboards

- [x] Learning DNA is aggregated from authenticated persisted submission history.
- [x] First-time learner and loading/error states are implemented.
- [ ] Replace remaining student/teacher mock dashboard metrics with authorized backend data.
- [x] Replace administrator mock metrics with an admin-only database-count endpoint; teacher analytics remain explicitly unavailable pending scope-safe data.
- [ ] Verify teacher/student data boundaries with tests and live RLS.
- [ ] Add a problem-to-course assignment relationship before enabling teacher submission access.

## Quality and delivery

- [x] Add GitHub Actions checks for backend tests, frontend type/build checks, and unique migration versions.
- [ ] Verify CI results on the pushed feature branch.
- [x] Re-run the full backend suite after admin metrics changes: 74 passed, 2 deprecation warnings.
- [x] Frontend ESLint, TypeScript check, and production build pass.
- [x] Re-run the frontend production build after the latest workspace/filter changes.
- [ ] Complete repository-wide historical secret and security review.
- [ ] Resolve the critical Next.js production dependency advisory; the available fix is a major-version upgrade and needs review.
- [x] Final backend tests, frontend build, and staged/unstaged whitespace checks pass after the latest edits.
- [x] Staged and unstaged diffs contain no detected real `.env` files or common credential/token patterns.
- [x] Review the current staged and unstaged implementation diffs; live service checks remain pending configuration.
- [x] Review staged changes and push only to the development branch after validation.
