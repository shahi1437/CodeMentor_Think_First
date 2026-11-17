# CodeMentor AI — Decisions Log

## 2026-11-17 — Preserve staged AI Mentor work

- The AI Mentor request flow, environment setup, tests, and implementation-status changes from the preceding task were already staged when the platform brief arrived.
- Keep that staged set intact. Do not reset or silently combine it with unrelated work.
- Provider tests use an HTTP mock; this is not evidence of live LLM availability.

## 2026-11-17 — Truthful completion reporting

- Distinguish source implementation, local tests/builds, and real external-service verification.
- Missing LLM configuration and provider failures must be explicit, not replaced with generated local responses.
- Missing persisted Learning DNA must produce an empty/first-time state rather than invented mastery or activity.

## 2026-11-17 — Submission status compatibility

- Existing SQL accepts `submitted`, `running`, `passed`, `failed`, and `error` in `submissions.status`.
- Store normalized `passed`/`failed`/`error` values and preserve the exact verdict in `runtime_metadata`; no migration is required, and historical rows remain unchanged.
- Calculate Learning DNA from the current user's persisted submission history; do not generate default metrics for users with no records.

## 2026-11-18 — Hidden-test privacy at API and database boundaries

- Use an explicit public problem-field allowlist; never select the legacy `hidden_test_cases` column for student-facing reads.
- Grade submissions against database-owned `problem_test_cases`; return and persist only verdict/count summaries, not test inputs or outputs.
- Exclude runtime metadata and outputs from student submission history so old rows cannot leak hidden cases.
- Apply the additive column-grant migration before claiming direct Supabase-client privacy; its live execution remains unverified.

## 2026-11-19 — Fail-closed authentication and persistence

- Database profile roles are authoritative; JWT metadata roles cannot grant access when role verification fails.
- Missing JWT/database configuration, role lookup failures, and unconfirmed writes produce explicit errors rather than local success-shaped fallbacks.
- Teachers do not receive unscoped profile or submission reads without an authorized course scope.

## 2026-11-20 — Judge0 result integrity and database-backed problem flow

- Only Judge0 status IDs 1 and 2 are treated as pending; external request/poll timeouts are service errors, not student time-limit verdicts.
- Judge0 submissions include bounded CPU, wall-clock, memory, and output limits; live provider behavior remains unverified.
- Problem catalog and workspace routes use database-backed API data with public samples; hidden tests remain on the server.
- Debugging success comes only from the backend grading verdict. Client code-text heuristics and simulated challenge/test results are removed.
- Progressive hints are exposed one requested tier at a time, never in the public problem response.
