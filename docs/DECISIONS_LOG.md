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
