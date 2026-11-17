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
- [x] Student problem reads omit hidden-test columns; an additive column-grant migration blocks direct client reads of legacy hidden JSON.
- [x] Submission grading uses backend-loaded problem test cases and returns only safe verdict/count information.
- [x] Database service exposes Supabase-backed operations.
- [x] Submission API maps verdicts to constraint-supported statuses and preserves exact verdict metadata.
- [ ] CRUD APIs completed and tested for all required domains.
- [ ] Live migration execution and database verification.
- [ ] Apply and verify the hidden-test column-grant migration in a live Supabase project.

## Coding and debugging

- [x] Monaco editor is integrated in the coding/debugging workspaces.
- [x] Backend Judge0 request/polling wrapper and execution endpoints exist.
- [ ] Workspaces still need a full audit for mock problem data and actual problem-bank loading.
- [x] Isolated tests cover database-backed test execution and hidden data non-disclosure.
- [ ] Validate submission workflow against real persisted data and live Judge0.
- [ ] Live Judge0 run and submission verification.
- [ ] Adaptive challenge selection, verified seeded challenge management, and persisted hints/attempt tracking.

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
- [ ] Replace mock dashboard metrics with authorized backend data.
- [ ] Verify teacher/student data boundaries with tests and live RLS.

## Quality and delivery

- [x] Full backend suite passed after hidden-test changes: 40 passed, 1 Starlette/httpx deprecation warning.
- [x] Frontend production build passed after hidden-test changes.
- [ ] Complete repository-wide historical secret and security review.
- [x] Final backend tests, frontend build, and staged/unstaged whitespace checks passed.
- [x] Staged and unstaged diffs contain no detected real `.env` files or common credential/token patterns.
- [x] Review the current staged and unstaged implementation diffs; live service checks remain pending configuration.
- [ ] Review staged changes before commit; push only to the development branch after validation.
