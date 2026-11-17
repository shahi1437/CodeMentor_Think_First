# Supabase Migration Reconciliation

Audit date: 2026-11-18
Project: `codementor-ai-prod` (`ttihfqchblylycboytwc`)
Target: production
Method: Supabase CLI, read-only PostgreSQL catalog queries, and an explicitly
approved metadata-only migration-history repair

## Result

All five migrations' **effective schema effects** match the inspected remote
definitions. Before repair, the remote `supabase_migrations` schema/table and
history records were absent, so there was no evidence of when the SQL was
originally executed. After explicit user approval, all five verified versions
were recorded as applied; the history record does not prove when their SQL was
originally executed. “Fully applied” below describes schema equivalence.

No production SQL, DDL, DML, `db push`, or `db reset` was run. The only
production write was the approved `migration repair` metadata update. No
application data was queried or changed.

## Migration mapping

| Local migration | Unique version | Classification | Remote evidence |
|---|---:|---|---|
| `20261117_init_auth_schema.sql` | `20261117` | **FULLY APPLIED — net effects present; later role changes supersede its helper/policy definitions.** | `user_role` labels, `profiles` columns/PK/FK, role indexes, own-profile policies, signup function and `auth.users` trigger exist. The profile helpers and role policies match the later hardening migration. |
| `20261118_platform_database_schema.sql` | `20261118` | **FULLY APPLIED.** | All 14 declared tables, expected column types/defaults/nullability after ordered `CREATE TABLE IF NOT EXISTS`, 11 named indexes, PK/FK/unique/check constraints, 29 final policies, `set_updated_at`, and 11 update triggers match. Both required extensions are installed. |
| `20261118000100_problem_hidden_column_security.sql` (originally `20261118_problem_hidden_column_security.sql`) | `20261118000100` | **FULLY APPLIED.** | The `problems` table has no client table-level SELECT; the exact listed public-column grants are present. `hidden_test_cases`, `notes`, and `created_by` are not selectable by `anon`/`authenticated`. SQL bytes were preserved during rename. |
| `20261119_harden_profile_role_rls.sql` | `20261119` | **FULLY APPLIED.** | `current_user_role`, `is_admin`, and `is_teacher` definitions, fixed `search_path`, and the three final profile policy expressions match. `PUBLIC` execute is revoked; `authenticated` execute is granted. |
| `20261120_problem_catalog_metadata.sql` | `20261120` | **FULLY APPLIED.** | Four problem metadata columns, mode check, `problem_hint_progress` columns/PK/FKs/tier check/RLS, and service-role-only table grants match. Clients have no access to the hint-progress table. |

## Dependency order

1. `20261117_init_auth_schema.sql` requires Supabase Auth's `auth.users`; it
   creates `user_role`, `profiles`, helper functions, and the signup trigger.
2. `20261118_platform_database_schema.sql` depends on `auth.users`,
   `user_role`, profiles, and the `pgcrypto`/`vector` extensions.
3. `20261118000100_problem_hidden_column_security.sql` depends on
   `public.problems` from step 2.
4. `20261119_harden_profile_role_rls.sql` depends on the role type, profile
   table, and helper functions created in steps 1-2.
5. `20261120_problem_catalog_metadata.sql` depends on `profiles` and `problems`
   from the earlier migrations.
6. `20261121000100_scope_course_data_rls.sql` depends on the platform tables
   from `20261118_platform_database_schema.sql` and the role helper functions
   from `20261119_harden_profile_role_rls.sql`; it remains local and pending.

### Duplicate version resolution

Two original files shared version `20261118`. The hidden-column migration was
renamed with Git to:

```text
20261118000100_problem_hidden_column_security.sql
```

The new numeric version sorts after `20261118` and before `20261119`; the
migration's SHA-256 remained
`00F11C9DAA6BDA2A194CF3D752F4E89C8D30A6395388EA01A951C761C37C8BCB`.
`npx supabase migration list --remote` lists five unique local versions and,
after repair, all five as applied remotely.

## Remote catalog comparison

- **Tables and columns:** 15 public application tables. Names, SQL types,
  defaults, and nullability were queried from `pg_catalog`. The `profiles`
  `preferred_language` column is nullable because the first migration creates
  it that way; the later `CREATE TABLE IF NOT EXISTS` does not alter it.
- **Constraints:** 45 validated constraints: 15 PK, 19 FK, 3 unique, 8 check.
  Definitions and delete actions match the SQL.
- **Indexes:** all 29 `pg_get_indexdef` values match, including PK/unique
  backing indexes and the 11 named secondary indexes.
- **RLS:** enabled on all 15 tables. All 29 permissive policy definitions,
  commands, roles, `USING`, and `WITH CHECK` expressions were inspected and
  match the effective migration sequence. `FORCE ROW LEVEL SECURITY` is off.
- **Functions and triggers:** the five migration functions match their
  definitions. The auth signup trigger and all 11 `updated_at` triggers match.
- **Extensions:** `pgcrypto` 1.3 and `vector` 0.8.2 are installed; the other
  observed extensions are Supabase/platform extensions.
- **Privileges:** `problem_hint_progress` is revoked from `anon` and
  `authenticated` and granted to `service_role`. `service_role` bypasses RLS.
  `problems` has only the explicit migration public-column SELECT grants;
  hidden JSON and progressive hints are denied. Other tables have Supabase
  client table grants with RLS policies in force.
- **History/config:** the `supabase_migrations` schema/table and five history
  records were absent during the initial audit. After the approved repair, the
  CLI records all five versions as applied. `supabase/config.toml` is absent;
  the CLI's existing project link is in ignored `supabase/.temp/` state.

## Security findings still open

1. Teacher SELECT policies expose all profiles, submissions, and mentor
   conversations instead of only authorized course/enrollment records.
2. Students have an `ALL` policy on their own submissions, allowing direct
   client writes to submission rows.
3. Role helper functions are not executable by `PUBLIC`, but their ACLs include
   direct `anon` execute grants. Anonymous `auth.uid()` is null, so these
   helpers do not return a user's role; revoke the direct grant in a reviewed
   security migration for least privilege.
4. `handle_new_user()` is `SECURITY DEFINER` without a pinned `search_path`.
   Its table reference is schema-qualified, but a hardened replacement should
   set a safe path.
5. Catalog checks do not replace authenticated test-account attempts to read
   another user's rows or hidden cases. No such test account/configuration was
   available; no real user data was used.

## Production history repair — EXECUTED AFTER EXPLICIT APPROVAL

The exact command that recorded the already-verified versions was:

```powershell
npx supabase migration repair --status applied --remote 20261117 20261118 20261118000100 20261119 20261120 --yes
```

The CLI confirmed all five versions were repaired to `applied`, and the
subsequent `migration list --remote` verification confirmed the remote records.
This changed migration-history metadata only; it did not execute the SQL files.
Do not follow it with `db push` for these versions: their effects already
exist. This history update does not establish when the SQL was originally run.

## Follow-up hardening migration

After this audit, `20261121000100_scope_course_data_rls.sql` was added locally
to address the verified broad teacher policies and student write access. It
has not been applied to production. It replaces teacher-wide profile and
conversation reads with active-course-enrollment checks, removes direct
student submission writes and self-managed enrollment changes, and binds
mentor messages to the authenticated user's own conversation and role.

The schema has no problem-to-course assignment relationship. To avoid exposing
an enrolled student's unrelated submissions, teachers receive no direct
submission SELECT policy until an assignment relationship can be established.
Test the migration against isolated student, teacher, and admin accounts in a
non-production database and obtain explicit approval before applying it to
production.

### Validation and rollback plan

Before deployment, run these catalog checks in the isolated test database and
confirm RLS remains enabled and the former broad policies are absent:

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'profiles', 'submissions', 'course_enrollments',
    'mentor_conversations', 'mentor_messages'
  )
ORDER BY c.relname;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'submissions', 'course_enrollments',
    'mentor_conversations', 'mentor_messages'
  )
ORDER BY tablename, policyname;
```

Then exercise the APIs/direct client with isolated accounts: a student must
only read their own profile, submissions, enrollments, and conversation
messages; student writes to submissions/enrollments and role spoofing must be
denied. A teacher must read only profiles for students with an active
enrollment in that teacher's course, must not read submissions, and must not
read conversations outside an active matching course enrollment. An
administrator must retain verified administrative reads. Also test inactive
enrollments, unrelated students, and unrelated conversations. These tests
have not yet been run because isolated accounts and a non-production database
are not configured.

The migration uses a transaction, so a failed run should roll back its policy
changes. After a successful commit, do not restore the former broad policies
as an automatic rollback. If a defect is found, deploy a reviewed forward
migration that corrects the policy while preserving the least-privilege
boundary; no table or user data needs to be removed.
