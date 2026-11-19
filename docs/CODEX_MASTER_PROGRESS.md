# CodeMentor AI — Master Progress Tracker

## Verified platform milestones checkpoint · ১৯ নভেম্বর ২০২৬

এই checkpoint-এ user-এর আলাদা অনুমোদিত scope-এর ভেতরে logical backup, Judge0 cgroup-v2 সমাধান, ৮টি verified problem publish এবং real student end-to-end যাচাই সম্পন্ন হয়েছে। কোনো pending migration অনুমতি ছাড়া apply করা হয়নি, কোনো credential print/log করা হয়নি, এবং কোনো commit/push/merge/deploy করা হয়নি।

### Phase 1 — Database backup ও isolated restore

- **PASS — logical backup:** `C:\Users\hafij\Documents\codementor_backups\20261119\schema_public.sql` (43,645 bytes, SHA-256 `b015279ebbd75894b2bd210b759361313665ffcfcb72334ec614743d8d77f4bc`) এবং `data_public.sql` (4,981 bytes, SHA-256 `60f74ffc47eb836976adc47ae7fd64172af30b63df5b78637bf00f354ead862c`)।
- **PASS — isolated restore:** `public.ecr.aws/supabase/postgres:17.12.0.000` container-এ (Supabase-managed `auth` schema/roles stub সহ) schema+data restore exit 0; ফল: 16 tables, `profiles=2`, `problems=0`, `problem_test_cases=0`, `submissions=0`, RLS-enabled tables=16, policies=27, FKs=20, indexes=30। verify container পরে মুছে ফেলা হয়েছে; মূল volume অক্ষত।
- Restore test-এ `auth.users`, `auth.uid()` ও Supabase roles stub করতে হয়েছে — এটি Supabase-managed object, backup-এ নেই।
- **নোট:** আগের এক `supabase db dump --dry-run` আউটপুটে plaintext `PGPASSWORD` দেখা গিয়েছিল; সেই temp файлы সঙ্গে সঙ্গে মুছে ফেলা হয়েছে, কোথাও commit/log হয়নি, এবং dry-run আর চালানো হয়নি।

### Phase 2 — Migrations

- Remote applied: `20261121000300` (execution quota), `20261121000400` (problem authoring), `20261121000600` ('mentor' action)।
- **PENDING (অনুমতি ছাড়া apply করা হয়নি):** `20261121000100`, `20261121000200`, `20261121000500`।
- `db push` ব্যবহার করা হয়নি, কারণ সেটি সব pending migration একসাথে apply করবে।

### Phase 3 — Judge0 CE

- **BLOCKER যাচাই:** official `judge0/judge0:1.13.1` image-এর isolate cgroup v1 চায়; এই machine-এর Docker Desktop/WSL2 শুধু cgroup v2 দেয়। ফলে প্রতিটি submission status 13, `Failed to create control group /sys/fs/cgroup/memory/box-1/`। Image-এ কোনো cgroup-v2 toggle নেই।
- **সমাধান (user-approved):** third-party community build `mrkushalsm/judge0:latest` (upstream Judge0 + patched `ioi/isolate`) লোকাল `docker-compose.cgv2.yml` দিয়ে চালানো হয়েছে; worker-এ `cgroup: host`, port শুধু `127.0.0.1:2358`, fresh project `judge0-cgv2` (আগের volume অক্ষত)। এই compose file repo-র বাইরে Judge0 ফোল্ডারে আছে।
- **PASS — real execution matrix:** authenticated `/about` version 1.13.1; accepted (`stdout=12`), Python syntax error → status 11, runtime error → status 11, `cpu_time_limit=1` timeout → status 5।
- `backend/app/core/judge0.py`-এ `trust_env=False` রাখা হয়েছে যাতে local proxy env Judge0 call ভাঙতে না পারে।
- **সীমাবদ্ধতা:** community image third-party ও privileged mode-এ চলে; শুধু localhost bind এবং disposable test environment-এ ব্যবহার হয়েছে। Production-এ যাওয়ার আগে digest pin ও স্বাধীন build/audit দরকার।

### Phase 4–5 — Admin authoring ও problem publish

- Owner admin আগেই promote হয়েছে; real admin API endpoints (`/admin/problems`, `/admin/problems/{id}/state`) দিয়ে ৮টি original Python problem draft তৈরি → Judge0 reference verification → publish সম্পন্ন হয়েছে (প্রতিটির `revision=2`, `verified_revision=2`)। `--apply` seed bypass ব্যবহার করা হয়নি।
- Published: Even Sum Snapshot `f76470be-…`, Delivery Fee Bands `13424637-…`, Longest Bit Streak `6eaa3a94-…`, Balanced Bracket Validator `b34bfc78-…`, Second Largest Distinct Value `962138f3-…`, Rotation Match `5d6aa151-…`, Minimum Coin Count `b9223226-…`, Maximum Subarray Sum `75710383-…` (সম্পূর্ণ UUID DB-তে)।
- ৩৮টি case (৮ public, ৩০ hidden) verified; public API-তে hidden case কখনো ফেরত যায় না।

### Phase 6 — Live API ও browser E2E (disposable student)

- **PASS — API:** health ok; admin published=8; catalog visible=8; public detail-এ `test_cases`/`reference_solutions` leak নেই; samples-এ hidden নেই; submit verdict=`accepted` (৫/৫, normal ও debugging); submission history persisted; admin dashboard-এ `judge0=configured`; execute status accepted/runtime_error/runtime_error/time_limit_exceeded।
- **PASS — quota:** student-এর টানা ৩টি submit 200, ৪র্থটিতে **429 + `Retry-After: 37`**।
- **PASS — browser E2E:** disposable student login → Problem Hub ৮টি challenge ও mode filter → Even Sum Snapshot workspace-এ Run Samples accepted (15 ms, output `14`) → Submit 4/4 passed → Submissions tab-এ Accepted entry → Longest Bit Streak Debugging Lab-এ Run Sample ও Verify Fix **4/4 regression passed** → dashboard ২টি solved, 100% accepted (৫ accepted / ৫), ৫টি recent submission persisted।
- **PASS — role isolation:** student token-এ `/admin/problems` ও `/platform/admin/dashboard-summary` → 403; `/auth/me` role=student; samples-এ শুধু public case।

### Phase 7 — Regression

- Backend: **150 passed, 3 skipped** (2 Starlette deprecation warnings)।
- Frontend: **11 passed / 0 failed**; `eslint .` clean; `tsc --noEmit` clean; production build exit 0 (all routes compiled, `ƒ Proxy (Middleware)`)।

### বাকি কাজ ও নোট

- `20261121000100`, `20261121000200`, `20261121000500` এখনো pending — আলাদা approval ছাড়া apply হবে না।
- Disposable test student `student.e2e.20261119@example.com` এবং local helper `127.0.0.1:8765` এখনো চালু; ইচ্ছা করলে পরে নিষ্ক্রিয়/মুছে ফেলা যাবে।
- সব code/doc পরিবর্তন working tree-তে uncommitted; কোনো commit/push হয়নি।
- Judge0 community image digest pin করা হয়নি; demo-র পর official-supported Linux VM/hosted path-এ migrate করার পরামর্শ রইল।

## Migration 00400 applied checkpoint · ১৯ নভেম্বর ২০২৬

ব্যবহারকারীর আলাদা অনুমোদনের পর শুধু `20261121000400_problem_authoring.sql` production-এ apply করা হয়েছে। অন্য কোনো pending migration apply করা হয়নি, কোনো problem insert/publish বা role change করা হয়নি।

- **PASS — 00400 apply ও live verification:** `problems` table-এ `revision` (`bigint NOT NULL DEFAULT 1`), `verified_revision`, `archived_at`, `reference_solutions` (`jsonb DEFAULT '{}'`), `debugging_starter_code` (`jsonb DEFAULT '{}'`) Columns আছে।
- **PASS — constraint:** `archived_problem_unpublished` CHECK constraint live আছে; এটি archived problem-কে published থাকতে দেয় না।
- **PASS — RPC:** `save_problem_draft(uuid,bigint,uuid,jsonb)` এবং `change_problem_state(uuid,bigint,text)` live আছে; দুটিই SECURITY INVOKER।
- **PASS — security:** `anon` ও `authenticated`-এর `problems`/`problem_test_cases` INSERT, UPDATE, DELETE privilege `false`; `service_role`-এর দুটি RPC EXECUTE privilege `true`; anon-এর RPC EXECUTE `false`।
- **PASS — history:** Live schema verification-এর পরে `migration repair --status applied 20261121000400` চালানো হয়েছে; `migration list`-এ 00400 remote-এ applied দেখাচ্ছে।
- **PASS — schema cache:** `notify pgrst, 'reload schema'` সফলভাবে চালানো হয়েছে।
- **ডেটা অপরিবর্তিত:** `problems = 0`, `problem_test_cases = 0`, `profiles = 1` (student)।
- **PENDING:** `20261121000100`, `20261121000200`, `20261121000300`, `20261121000500`, `20261121000600` এখনো apply হয়নি। `00300` inspection অনুযায়ী table/function live-এ নেই, `date_bin` কাজ করে এবং শুধু service_role access পাবে; Run/Submit-এর জন্য এটি দরকার, তাই আলাদা approval অপেক্ষায় আছে।
- **BLOCKED:** Judge0 `http://localhost:2358` configured, কিন্তু Docker নেই এবং WSL-এ কোনো distro নেই; Judge0 offline। Docker/WSL install-এর আগে approval দরকার।
- **BLOCKED:** live DB-তে ০ admin, ১ student; admin bootstrap/role change-এর আগে approval দরকার।
- এই checkpoint-এ কোনো commit, push, merge, deploy, problem seed/publish বা admin role change করা হয়নি।

## Blocked platform setup checkpoint · ১৯ নভেম্বর ২০২৬

এই checkpoint-এ কোনো production migration, problem seed/publish বা role change করা হয়নি। শুধু read-only database inspection, local validation, automated tests, checksummed logical backup এবং documentation সম্পন্ন হয়েছে।

### Database backup

- **PASS — checksummed logical backup:** `C:\Users\hafij\AppData\Local\CodeMentorBackups\codementor_backup_20261119T054936Z.zip` (Git-এর বাইরে, per-user AppData)।
- Backup-এ ১৫টি public table, ১টি profile row, ১টি sanitized auth-user metadata এবং ৫টি applied migration history আছে; auth password hash/session token/service-role key/JWT secret/Judge0 token নেই।
- Internal checksum verification এবং independent SHA-256 verification পাস করেছে। SHA-256: `ddbc8057982219ccbdc1f0149b53ef8b8586e7805df04d98e1437632111a149c`।
- **সীমাবদ্ধতা:** এই machine-এ `pg_dump`, `pg_restore`, `psql`, Docker বা WSL distro নেই। তাই native `pg_dump` restore test করা যায়নি; backup-টি schema migrations + JSON data export হিসেবে verified, কিন্তু isolated database-এ restore test বাকি।

### Migration ও blocker অবস্থা

- Remote applied: `20261117`, `20261118`, `20261118000100`, `20261119`, `20261120`।
- Pending: `20261121000100`, `20261121000200`, `20261121000300`, `20261121000400`, `20261121000500`, `20261121000600`।
- `20261121000400_problem_authoring.sql`-এর columns, constraint এবং RPC live DB-তে অনুপস্থিত; migration-টি additive এবং `20261120` dependency already applied।
- `20261121000300_execution_quota.sql`-এর `consume_execution_quota` RPC live DB-তে অনুপস্থিত। `/execute` ও `/submit` এটি ব্যবহার করে, তাই Judge0-এর পাশাপাশি এই migration-ও Run/Submit-এর জন্য দরকার।
- **BLOCKED:** 00400 apply করার explicit approval প্রয়োজন; তারপর 0003-এর জন্য আলাদা approval প্রয়োজন। `db push` ব্যবহার করা হবে না, কারণ সেটি সব pending migration একসাথে apply করবে।
- **BLOCKED:** Judge0 `localhost:2358`-এ unreachable; Docker/WSL2 install/system change-এর approval প্রয়োজন। Live Judge0 verification ছাড়া publishing করা হবে না।
- **BLOCKED:** live DB-তে ০ জন admin, ১ জন student; admin bootstrap/role change-এর জন্য আলাদা approval প্রয়োজন। Student-কে silently elevate করা হবে না।

### Tests ও files

- Backend: **150 passed, 3 skipped**; Frontend: **11 passed**; seed validation: **8/8 PASS** (38 cases)।
- `backend/scripts/seed_problem_catalog.py`-এ exact backend `ProblemDraft` Pydantic contract validation যোগ করা হয়েছে; `--apply` path এখনো API-level admin authorization ও Judge0 verification bypass করে, তাই সেটি চালানো হয়নি।
- কোনো commit, push, merge, deploy বা production table/data/migration write করা হয়নি।

## Visual Code Analyzer milestone · ১৯ নভেম্বর ২০২৬

Analyzer-এর পুরোনো preset/simulation UI সরিয়ে বাস্তব authenticated Python AST analysis যুক্ত করা হয়েছে। Source code কখনো execute করা হয় না; শুধু backend-এ parse করা হয়। Commit, push, merge, deploy বা production database migration চালানো হয়নি।

### যা বাস্তবায়ন হয়েছে

- **Backend API:** `POST /api/v1/platform/analyze` যোগ করা হয়েছে। এটি আগের `analyze_python()` output-ই reuse করে এবং `require_student` dependency দিয়ে student, teacher ও admin—তিন role-এর authenticated access নিশ্চিত করে।
- **Input validation:** শুধু Python গ্রহণ করা হয়, অজানা field প্রত্যাখ্যান করা হয় এবং source সর্বোচ্চ ১,০০,০০০ character। বেশি বড় source বা ভুল payload `422` দেয়; authentication ছাড়া request `401` দেয়।
- **Structured response:** `language`, `analysis_type`, `valid_syntax`, syntax error-এর line/offset/message, functions ও recursion, loops, branches, max loop depth, time/space complexity, findings, `estimates_are_heuristic`, `complexity_basis` এবং `limitations` ফেরত দেয়। Submitted source response-এ echo করা হয় না।
- **Safety:** AST parsing ছাড়া কোনো execution, `eval`, `exec` বা shell call নেই। অতিরিক্ত nested source-এ `RecursionError` হলে generic `422` দেয়; stack trace বা backend secret leak হয় না।
- **Frontend:** Monaco editor দিয়ে editable Python input, “Analyze Code” button, authenticated `backendRequest` integration এবং real result rendering যোগ করা হয়েছে। Loading, idle/empty, syntax-error, auth, validation, configuration, network/unavailable ও unexpected error—সব state আলাদা বার্তা ও recovery action সহ আছে।
- **Heuristic স্পষ্টীকরণ:** time/space complexity “estimated” হিসেবে দেখানো হয় এবং `complexity_basis` ও limitations UI-তে প্রদর্শিত হয়। Preset তিনটি শুধু example source হিসেবে লেবেল করা; কোনো fixed/simulated finding বাস্তব ফল হিসেবে দেখানো হয় না। আগের simulation banner ও timeline walkthrough সরানো হয়েছে।

### ফাইল পরিবর্তন

- নতুন: `backend/tests/test_analyzer.py`, `frontend/src/lib/analyzer.ts`, `frontend/tests/analyzer.test.mjs`
- পরিবর্তিত: `backend/app/schemas/platform.py`, `backend/app/api/v1/endpoints/platform.py`, `frontend/src/components/ui/CodeEditor.tsx`, `frontend/src/app/analyzer/page.tsx`, `frontend/package.json`, `docs/CODEX_MASTER_PROGRESS.md`

### যাচাইয়ের ফল

| যাচাই | ফল |
| --- | --- |
| `backend/venv/Scripts/python.exe -m pytest backend/tests supabase/tests -q -ra` | **PASS — ১৪৯ পাস, ৩ স্কিপ, ২ warning।** নতুন analyzer test ১৩টি পাস; ৩টি skip disposable Supabase integration test। |
| `npm test` (frontend) | **PASS — ৯ পাস, ০ ফেল, ০ স্কিপ।** এর মধ্যে analyzer contract ও error-classification test ৬টি নতুন। |
| `npm run lint` | **PASS — কোনো error বা warning নেই।** |
| `npx next typegen` ও `npx tsc --noEmit` | **PASS।** প্রথম tsc-এ preset-এর literal type নিয়ে দুটি error পাওয়া যায়; typed `useState<string>` দিয়ে ঠিক করার পর কোনো error নেই। |
| `npm run build` | **PASS — Next.js 16.4.6 (webpack), ১৮টি static page generate, `ƒ Proxy (Middleware)` স্বীকৃত।** |

### সীমাবদ্ধতা ও বাকি কাজ

- **BLOCKED (live verification):** বাস্তব Supabase session দিয়ে browser-এ analyzer flow চালানো হয়নি। Backend test fixture role repository ব্যবহার করেছে; deployed backend-এ role lookup-এর জন্য সঠিক Supabase service-role configuration দরকার।
- **BLOCKED (external services):** এই milestone-এ Judge0, LLM বা embedding provider ব্যবহার হয়নি; সেগুলোর live connectivity আগের মতোই যাচাই বাকি।
- Complexity estimate heuristic; এটি runtime-এর গাণিতিক প্রমাণ নয়। Static findings false positive হতে পারে এবং UI-তে সেটি স্পষ্ট করা আছে।
- Browser-level responsive behaviour ও real network failure পরিস্থিতি আলাদাভাবে manual QA করা বাকি; automated contract/type/build checks পাস করেছে।

## Verification checkpoint · ১৯ নভেম্বর ২০২৬

বর্তমান uncommitted worktree-এ source code, tests, migrations বা `.env` পরিবর্তন না করে verification চালানো হয়েছে। Commit, push, merge, deploy বা production database migration চালানো হয়নি। এই চেকপয়েন্টে শুধু এই ট্র্যাকার হালনাগাদ হয়েছে।

| যাচাই | ফল |
| --- | --- |
| `backend/venv/Scripts/python.exe -m pytest backend/tests supabase/tests -q -ra` | **PASS — ১৩৬ পাস, ৩ স্কিপ, ২ deprecation warning।** ৩টি skip disposable Supabase role-isolation integration test; `CODEMENTOR_SUPABASE_TEST_WORKDIR` নেই। |
| `npm test` (frontend) | **PASS — ৩ পাস, ০ ফেল, ০ স্কিপ।** Node শুধু `MODULE_TYPELESS_PACKAGE_JSON` performance warning দিয়েছে। |
| `npm run lint` | **PASS — কোনো error বা warning নেই।** |
| `npx next typegen` এবং `npx tsc --noEmit` | **PASS — কোনো TypeScript error নেই।** |
| `npm run build` | **PASS — Next.js 16.4.6 (webpack), ১৮টি static page।** Build output `ƒ Proxy (Middleware)` হিসেবে নতুন proxy স্বীকার করেছে। |
| `git diff --check` | **PASS — whitespace error নেই; শুধু LF→CRLF conversion warning।** |
| Analyzer smoke test | **PASS — valid Python-এ nested loop depth 2 ও `O(n^2)`; invalid syntax line 1 রিপোর্ট করেছে।** |

- `frontend/middleware.ts` ইচ্ছাকৃতভাবে মুছে দেওয়া হয়েছে। Installed Next.js 16 documentation অনুযায়ী `proxy.ts`-এ `export function proxy(...)` সঠিক convention, এবং production build এটিকে Proxy (Middleware) হিসেবে শনাক্ত করেছে। তাই middleware ফিরিয়ে আনা হয়নি।
- কোনো genuine failure পাওয়া যায়নি; source, test বা migration file সংশোধন করা হয়নি।
- Analyzer module এখনো কোনো API route বা dedicated test-এ যুক্ত নয় এবং analyzer UI এখনো preset; এটি test failure নয়, বাকি feature work।
- এখনো live verification বাকি: Supabase auth/database, Judge0 execution, LLM ও embedding provider, migration `00100`, `00500`, `00600`, এবং browser-level Mentor/auth flows।
- নিচের ১৮ নভেম্বর checkpoint-এর ১১৯-টেস্ট ফল ঐতিহাসিক; বর্তমান worktree-এর ফল ওপরের টেবিলে।

## Autonomous completion checkpoint · ১৮ নভেম্বর ২০২৬

ব্যবহারকারীর নতুন পূর্ণাঙ্গ নির্দেশনা অনুযায়ী Phase A–O-এর স্বাধীন নিরাপদ কাজ চালু আছে। Commit/push-এর আগে আলাদা অনুমোদন প্রয়োজন। Production migration, paid service এবং production deployment-ও অনুমোদনের অপেক্ষায় থাকবে।

- **PASS** বর্তমান baseline আবার চালিয়ে ১১৯টি backend test পাস এবং ৩টি isolated Supabase test স্কিপ হয়েছে। Frontend configuration tests ৩টি পাস, lint পাস। নতুন production build চলছে।
- **BLOCKED** frontend public key, backend service-role key এবং LLM key এখনও খালি। Loopback Judge0 `/about` এখনও অনুপলব্ধ। Docker এবং Supabase executable PATH-এ পাওয়া যায়নি।
- বর্তমান কাজের পরের ধাপ Mentor-এর বিদ্যমান owner-scoped conversation APIs-কে UI-তে যুক্ত করা, saved messages ও curriculum sources দেখানো এবং retry/session behavior পরীক্ষা। এরপর assessment, Learning DNA, adaptive plans, analyzer, teacher management ও release verification-এর অসম্পূর্ণ কাজ চলবে।
- `docs/FINAL_VERIFICATION_REPORT.md` সম্পূর্ণ feature matrix হিসেবে তৈরি করা বাকি। বর্তমান পর্যায়ে commit/push approval চাওয়া হয়নি।

### Mentor ও RAG সংযোগের অগ্রগতি

- **PASS** Mentor UI saved conversation list, পুরোনো thread খোলা, নতুন conversation, persistent conversation ID, ব্যর্থ প্রশ্ন retry এবং curriculum source links-এর সঙ্গে যুক্ত হয়েছে। একই সময় একাধিক Send বন্ধ আছে। সফল response এলে প্রশ্ন ও উত্তর chat-এ যুক্ত হয়।
- **PASS** backend retry-তে saved answer ফিরিয়ে দেয় এবং একই request ID-তে অন্য প্রশ্ন এলে `409` দেয়। Supabase network error এখন `503` হয়। অন্য ব্যবহারকারীর conversation `404` থাকে।
- **PASS** নতুন Mentor/RAG tests ১৬টি পাস। প্রথম পরিবর্তনের পরে platform-সহ ৪১টি পরীক্ষা পাস। Frontend lint, TypeScript ও production build পাস। এই পরীক্ষায় provider ও database fixture ব্যবহার হয়েছে।
- **BLOCKED** বাস্তব LLM answer, real embeddings, SQL migration execution এবং authenticated browser history verification। Provider keys ও test database দরকার।
- পরিবর্তিত ফাইল `frontend/src/app/mentor/page.tsx`, `backend/app/api/v1/endpoints/platform.py`, `backend/tests/test_mentor_conversations.py`, `backend/tests/test_curriculum.py`, `.env.example`।
- পরের কাজ shared Mentor rate limit, SQL retry/legacy-message compatibility, then assessment ও adaptive-learning implementation। Mentor browser component regression tests এবং long-thread pagination বাকি।

**Phase 0 সম্পন্ন · ১৮ নভেম্বর ২০২৬**

এই ট্র্যাকারটি লোকাল কোড, টেস্ট, GitHub CI ও আগের প্রজেক্ট নথির ওপর ভিত্তি করে তৈরি। **কোডে আছে** মানে ফিচারটির বাস্তবায়ন পাওয়া গেছে। **যাচাই হয়েছে** মানে যে পরিবেশে পরীক্ষা হয়েছে তার ফল জানা আছে। বাস্তব Supabase, Judge0 ও LLM দিয়ে শুরু থেকে শেষ পর্যন্ত পরীক্ষা আলাদাভাবে বাকি আছে।

## Git ও কাজের সীমা

- লোকাল শাখা `feature/verified-platform-milestones`, বর্তমান commit `50532c6` (admin problem authoring)। GitHub-এর একই শাখা `01c8e48`-এ আছে। লোকাল শাখা ১ commit এগিয়ে। GitHub-এর `main` ছিল `f4ebe00`। [GitHub repository](https://github.com/shahi1437/CodeMentor_Think_First)
- অডিট শুরুর আগে ২৮টি tracked file পরিবর্তিত ছিল, `frontend/middleware.ts` মুছে রাখা ছিল এবং ৬টি নতুন file Git-এ যোগ করা হয়নি। Staged পরিবর্তন ছিল ০। নতুন `frontend/src/proxy.ts`, auth callback, JWKS tests, curriculum module এবং mentor migration আগের লোকাল কাজের অংশ।
- Phase 0-এর একমাত্র Git worktree সংযোজন এই ট্র্যাকার। অ্যাপের কোড, `.env` ও migration বদলানো হয়নি। কোনো commit, push, merge, deploy বা production database write করা হয়নি।

## লগইন, Problem Hub ও Coding Workspace

| প্রবাহ | বর্তমান ফল | পরের যাচাই |
| --- | --- | --- |
| Supabase login | `/auth/login` লোকাল সার্ভারে `200`। Headless Chrome-এ ফর্ম ও `Supabase is not configured` বার্তা দেখা গেছে। `frontend/.env.local`-এ publishable ও anon key দুটিই খালি। | সঠিক public key দিয়ে সাইন-ইন ও email confirmation পরীক্ষা। সেশনের পর FastAPI `/auth/me` থেকে অ্যাকাউন্টের সংরক্ষিত role নিশ্চিত করতে হবে। |
| Problem Hub | `/problems` লোকালে `307` দিয়ে `authError=configuration` সহ লগইনে ফেরত যায়। সেশন ছাড়া FastAPI catalog `401` দেয়। কৃত্রিম student পরিচয় দিয়ে শুধু auth ধাপটি পাশ করালে বর্তমান database কনফিগে catalog `503` দেয়। | আসল student session দিয়ে প্রকাশিত catalog ও filters পরীক্ষা। catalog সত্যিই ফাঁকা হলে empty state মিলিয়ে দেখা। |
| Coding Workspace | `/workspace/coding/[id]` একইভাবে লগইনে ফেরত যায়। কৃত্রিম student পরিচয়ে problem details ও public samples `503` দিয়েছে। একই পরীক্ষায় Run database quota যাচাই করতে গিয়ে `503` দিয়েছে। Judge0 URL-ও খালি। | আসল প্রকাশিত problem ID দিয়ে Monaco, sample, history, Run এবং Submit পরীক্ষা। hidden test data ছাত্রের response-এ অনুপস্থিত কি না যাচাই। |

আগের নির্দিষ্ট error screenshot বা browser log পাওয়া যায়নি। ওপরের ফল বর্তমান লোকাল অবস্থায় দেখা গেছে। ভুল ID বা অপ্রকাশিত problem-এর ফল এবং আসল catalog-এ কয়টি problem আছে, সেগুলো live session দিয়ে যাচাই করা বাকি। [Login](../frontend/src/app/auth/login/page.tsx) · [Route protection](../frontend/src/proxy.ts) · [Problem Hub](../frontend/src/app/problems/page.tsx) · [Coding Workspace](../frontend/src/app/workspace/coding/%5Bid%5D/page.tsx) · [API](../backend/app/api/v1/endpoints/platform.py)

## পরিবেশের কনফিগারেশন

শুধু setting-এর নাম, উপস্থিতি এবং প্রয়োজনীয় মিল পরীক্ষা করা হয়েছে। কোনো credential value এখানে রাখা হয়নি।

| জায়গা | বর্তমান অবস্থা |
| --- | --- |
| Frontend · `frontend/.env.local` | `NEXT_PUBLIC_SUPABASE_URL` ও `NEXT_PUBLIC_BACKEND_URL` সেট আছে। Backend URL লোকাল FastAPI-এর ঠিকানায় যায়। `NEXT_PUBLIC_API_URL` অনুপস্থিত এবং ঐচ্ছিক। `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` অথবা `NEXT_PUBLIC_SUPABASE_ANON_KEY`-এর একটি দরকার। দুটিই খালি। |
| Backend · `backend/.env` | `SUPABASE_URL` আছে এবং frontend-এর Supabase origin-এর সঙ্গে মেলে। `SUPABASE_SERVICE_ROLE_KEY` খালি, তাই database client ও সংরক্ষিত role যাচাই চালু হচ্ছে না। `SUPABASE_JWT_SECRET` খালি। সেটি শুধু legacy HS256 সেশনের জন্য লাগে। ES256/RS256 সেশনে কোড Supabase-এর public signing keys ব্যবহার করে। প্রকল্পে আসলে কোন পদ্ধতি চালু আছে তা যাচাই করা বাকি। |
| Judge0 · `backend/.env` | `JUDGE0_API_URL` খালি। `JUDGE0_AUTH_TOKEN`-ও খালি। token কেবল Judge0 instance-এ authentication চালু থাকলে প্রয়োজন। |
| AI · `backend/.env` | `LLM_API_URL` ও `LLM_MODEL` সেট আছে। `LLM_API_KEY` খালি। Curriculum search-এর `LLM_EMBEDDING_URL` অনুপস্থিত। `LLM_EMBEDDING_MODEL`-এর default আছে এবং embedding key-এর জন্য chat key fallback আছে। `.env.example`-এ embedding settings নেই। |
| Root · `.env.local` | ফাইলটিতে কয়েকটি backend-only setting-এর non-empty entry আছে, যেগুলোর বৈধতা যাচাই করা হয়নি। বর্তমান startup path-এ এই ফাইল থেকে FastAPI বা `frontend/`-এর Next.js সেটিং পড়ে না। কার্যকর ফাইল দুটিসহ বাস্তব `.env`-গুলো Git ignore করে। কেবল `.env.example` tracked। |

`/health` লোকালে `200` দিয়েছে। এটি FastAPI চালু হওয়ার প্রমাণ। Email confirmation redirect allowlist, project signing mode, বাস্তব test accounts এবং external-provider connectivity অডিটে নিশ্চিত করা যায়নি। লোকাল `localhost` ও `127.0.0.1`-এর জন্য CORS defaults আছে। [Setup](../README.md) · [Config template](../.env.example) · [Backend settings](../backend/app/core/config.py)

## কোডের ভিত্তি ও ফিচারের অবস্থা

- **Frontend ও API ভিত্তি কোডে আছে।** Next.js App Router, React, TypeScript, Tailwind এবং Monaco দিয়ে পেজ ও editor তৈরি। FastAPI-তে typed request/response, bearer authentication, database-backed role checks ও আলাদা auth, platform এবং admin problem routes আছে। Student, Teacher ও Admin portal-এর access server যাচাই করে। সাইন-ইন ও signup সফল হওয়ার live পরীক্ষা বাকি।
- **Problem Hub ও দুই workspace কোডে আছে।** Catalog filters, public samples, coding submission history এবং debugging hint tiers আসল backend API ব্যবহার করে। Hidden test cases grading-এর জন্য server-এ নেওয়া হয়। Verified revision থাকলে তবেই buggy starter student response-এ আসে। Catalog-এর baseline schema fallback unit test-এ আছে। বাস্তব catalog ও দুই workspace-এর সফল flow যাচাই বাকি।
- **Judge0 ও admin authoring আংশিক যাচাই হয়েছে।** Python, JavaScript ও C++ execution wrapper, resource limits, server-side grading এবং database-backed shared quota আছে। Admin draft create/edit, publish/unpublish/archive এবং reference solution ও buggy variant যাচাইয়ের flow commit `50532c6`-এ আছে। Admin flow পরীক্ষায় service fixture ছিল। Live Judge0 ও সংশ্লিষ্ট database migration-এর পরীক্ষা বাকি।
- **Database foundation কোডে আছে।** Supabase Auth/profile, problem/test case, submission, learning, daily plan, course/enrollment, mentor ও vector tables-এর schema আছে। ৫টি baseline ও নতুন ৫টি migration মিলে লোকালে ১০টি। নতুনগুলোর বিষয় course-scoped RLS (`00100`), client grants (`00200`), quota (`00300`), authoring (`00400`) ও mentor/curriculum (`00500`)। পুরোনো production audit-এ baseline ৫টির schema ও migration history যাচাই হয়েছিল এবং teacher read scope ও student direct submission write নিয়ে সমস্যা ধরা পড়েছিল। বর্তমান production role policy ও নতুন migration history এই Phase 0-তে পুনরায় যাচাই করা হয়নি। [আগের Supabase audit](SUPABASE_MIGRATION_RECONCILIATION.md)
- **AI Mentor আংশিক বাস্তবায়িত।** LLM chat, Socratic/conceptual mode ও Learning DNA context কোডে আছে। লোকাল পরিবর্তনে conversation persistence, owner-scoped API, admin curriculum ingestion ও pgvector retrieval আছে। এর SQL migration এখনো লোকাল untracked file। Mentor UI conversation ID ব্যবহার করে thread চালানো, saved thread আবার খোলা ও curriculum sources দেখানোর সঙ্গে যুক্ত হয়নি। Embedding provider, বাস্তব licensed curriculum এবং retrieval পরীক্ষা বাকি। পরিকল্পিত সাধারণ LLM tool-calling loop পাওয়া যায়নি।
- **ML ও Learning DNA।** Scikit-learn ও keyword-ভিত্তিক classifier আছে এবং ছোট in-code sample সেটে চলে। বাস্তব dataset, held-out evaluation ও debugging flow-তে নির্ভরযোগ্য classifier integration বাকি। Learning DNA, student dashboard, daily-task completion এবং submission history সংরক্ষিত student data থেকে পড়ার জন্য যুক্ত। Adaptive challenge selection ও personalized plan creation পাওয়া যায়নি।
- **Teacher, Admin ও demo pages।** Teacher নিজের course ও active enrollment count দেখতে পারে। Admin dashboard database counts পড়ে। Course-to-problem assignment link, student-level teacher analytics ও alerts, এবং course management UI বাকি। Visual Code Analyzer ও Diagnostic Assessment-এ চিহ্নিত demo/preset content আছে। বাস্তব code analysis ও সংরক্ষিত placement results-এর flow বাকি।

## পরীক্ষা ও CI

| যাচাই | Phase 0 ফল |
| --- | --- |
| `python -m pytest backend/tests supabase/tests -q -ra -p no:cacheprovider` | **১০৫ পাস, ৩ স্কিপ, ২ deprecation warning।** Backend suite-এ JWT/RBAC, database access, grading privacy, hints, Judge0 wrapper, quota, admin authoring ও Mentor request tests আছে। Disposable Supabase stack না থাকায় role-isolation, grading privacy এবং atomic quota-এর ৩টি database integration test লোকালে স্কিপ হয়েছে। |
| `npm run lint`, TypeScript `--noEmit`, `npm run build` | সব পাস। বর্তমান frontend env দিয়েও build পাস। স্বতন্ত্র frontend unit/component/E2E suite বা CI job পাওয়া যায়নি। এই অডিটে লোকাল Next.js ও headless Chrome দিয়ে login notice এবং route redirects পরীক্ষা হয়েছে। |
| Migration versions ও `git diff --check` | ১০টি numeric version আলাদা। বিদ্যমান Git diff-এর whitespace check পাস। Migration filename check দিয়ে SQL execution যাচাই হয় না। |
| GitHub Actions | Remote branch-এর `01c8e48`-এ backend, frontend, migrations এবং disposable Supabase role-isolation job সব পাস। লোকাল `50532c6` এবং uncommitted পরিবর্তন ওই run-এর পরে এসেছে। Workflow checks চালায়। কোনো deploy job নেই। [GitHub Actions run](https://github.com/shahi1437/CodeMentor_Think_First/actions/runs/44221197351) |

লোকাল টেস্টে backend virtual environment-এর Python 3.14 ও Node 26 ব্যবহার হয়েছে। CI ব্যবহার করে Python 3.11 ও Node 22। Real Supabase sign-in, live Judge0 verdict ও live LLM answer কোনওটিই এই টেস্টের ফল হিসেবে ধরা হয়নি। [CI workflow](../.github/workflows/ci.yml) · [Supabase tests](../supabase/tests/test_role_isolation.py)

## Phase অনুযায়ী ট্র্যাকার

Phase 1–10-এর বিষয়গুলো আগের `IMPLEMENTATION_STATUS.md`-এর নম্বর অনুসরণ করে। পরের কাজের চূড়ান্ত scope ব্যবহারকারীর পরবর্তী নির্দেশনা থেকে আসবে।

| Phase | বর্তমান অবস্থা | সম্পূর্ণ বলতে যে প্রমাণ দরকার |
| --- | --- | --- |
| 0 · Project audit | **সম্পন্ন** | Git ও কোড পর্যালোচনা, config audit, লোকাল tests ও route checks, hosted CI এবং এই ট্র্যাকার। |
| 1 · Backend auth foundation | **কোডে আছে, লোকাল টেস্ট পাস** | আসল token যাচাই এবং student/teacher/admin profile access পরীক্ষা। |
| 2 · Frontend Supabase auth | **আংশিক যাচাই** | সঠিক public key, signup confirmation, login/redirect/sign-out এবং protected page browser flow। |
| 3 · Database ও APIs | **আংশিক যাচাই** | isolated stack-এ বর্তমান ১০টি migration প্রয়োগ ও account access পরীক্ষা। Production-এর ইতিহাস/নীতি যাচাই আলাদা অনুমোদনের অধীন। |
| 4 · Monaco ও Judge0 execution | **আংশিক যাচাই** | live Run/Submit, shared quota এবং service failure-এর যথাযথ status। |
| 5 · Problem Hub, workspaces ও authoring | **আংশিক যাচাই** | অনুমোদিত problem seed, admin publish verification, samples/history এবং verified debugging variant-এর পূর্ণ flow। |
| 6 · ML classifier | **প্রাথমিক বাস্তবায়ন** | অনুমোদিত বাস্তব dataset, পুনরায় চালানো যায় এমন training/evaluation এবং debugging integration। |
| 7 · AI Mentor ও RAG | **আংশিক বাস্তবায়ন** | নতুন SQL, thread UI ও source display, licensed curriculum এবং live chat/embedding/retrieval tests। |
| 8 · Learning DNA | **মূল ফিচার কোডে আছে** | বাস্তব student data দিয়ে summary যাচাই, mastery-চালিত challenge ও plan generation। |
| 9 · Dashboards ও analytics | **আংশিক বাস্তবায়ন** | course/problem assignment, scope-checked teacher analytics এবং alert flows। |
| 10 · Release readiness | **যাচাই বাকি** | বর্তমান পরিবর্তনে CI ও external-service smoke tests, configuration review এবং প্রয়োজনীয় release approval। |

## ডকুমেন্টেশন মিলিয়ে দেখা

- `README.md`, `IMPLEMENTATION_STATUS.md`, `IMPLEMENTATION_CHECKLIST.md`, `EXECUTION_STATE.md` ও `AI_HANDOFF.md`-তে পুরোনো branch, ৮০টি টেস্ট, read-only admin authoring, shared quota বা RAG-এর আগের অবস্থা উল্লেখ আছে। লোকাল কোড ও hosted CI-এর নতুন তথ্য এই ট্র্যাকারে নথিভুক্ত। Git ইতিহাসে PR #8 merge রয়েছে। [Implementation status](IMPLEMENTATION_STATUS.md) · [Checklist](IMPLEMENTATION_CHECKLIST.md) · [Execution state](EXECUTION_STATE.md) · [Handoff](AI_HANDOFF.md)
- `PAGE_MAP.md` ও `DESIGN_SYSTEM.md` পেজ, UI states ও ফিচারের পরিকল্পনা বর্ণনা করে। `DECISIONS_LOG.md` test privacy, role verification এবং Judge0 ফলের নীতি ধরে রেখেছে। [Page map](PAGE_MAP.md) · [Design system](DESIGN_SYSTEM.md) · [Decisions](DECISIONS_LOG.md)

## Phase 1 · Runtime fixes · ১৮ নভেম্বর ২০২৬

**অবস্থা — BLOCKED।** নিরাপদ কোড পরিবর্তন ও লোকাল পরীক্ষা সম্পন্ন। আসল Supabase account এবং Judge0 দিয়ে সফল flow যাচাই বাকি। এই বিভাগ Phase 0-এর কনফিগারেশন ও পরীক্ষার ফলের পরের অবস্থা দেখায়।

| যাচাই | ফল ও প্রমাণ |
| --- | --- |
| লোকাল কনফিগারেশন | **PASS।** `frontend/.env.local`-এর Supabase URL `backend/.env`-এর URL-এর সঙ্গে মেলে। সক্রিয় frontend backend URL লোকাল FastAPI port `8000`-এ যায়। সক্রিয় `backend/.env`-এ root `.env.local`-এ আগে থেকে থাকা loopback Judge0 URL যোগ হয়েছে। অন্য `.env` entry বদলায়নি। Judge0-এর লোকাল `/about` উত্তর দেয়নি। |
| JWT ও role | **PASS।** প্রকল্পের public JWKS `200` দিয়েছে এবং ES256 key প্রকাশ করছে। ES256, RS256 ও legacy HS256 regression tests-এ signature, issuer, audience এবং persisted role যাচাই হয়েছে। Project URL না থাকলে HS256 verification বন্ধ থাকে। অনুপস্থিত service-role key ও role lookup failure-এর জন্য আলাদা বার্তা আছে। |
| Browser auth | **PASS** লোকাল Next.js-এ login এবং signup পেজ `200`, Chrome-এ login-এর missing configuration বার্তা দেখা গেছে। Problem Hub, Coding Workspace, Teacher এবং Admin route লগইনে `307` দিয়েছে। Confirmation code ছাড়া callback লগইনে ফেরত গেছে। **BLOCKED** আসল login, signup, confirmation, logout এবং reload-এর পরে session persistence। |
| Problem Hub ও Coding Workspace | **PASS** test fixture-এ missing database config `503`, connection failure `503` এবং সফল empty catalog `200 []` আলাদা হয়েছে। লোকাল HTTP-তে অতিথির catalog, details, samples, admin এবং Run request `401`। বিদ্যমান filter, Monaco ও submission history রাখা হয়েছে। **BLOCKED** আসল role/profile query, প্রকাশিত problem ID, samples ও ইতিহাস দিয়ে পূর্ণ flow। |
| Run | **PASS** Judge0 URL অনুপস্থিত থাকলে API স্পষ্ট `unconfigured` ফল দেয় এবং quota খরচ করে না। URL সেট থাকলে quota যাচাই এখনও বাধ্যতামূলক। **BLOCKED** sandbox চালু করে `/about`, quota RPC ও live Run/Submit verdict যাচাই। |
| লোকাল পরীক্ষা | **PASS** `pytest backend/tests supabase/tests`-এ ১১৯ পাস, ৩ স্কিপ, ২ deprecation warning। Disposable Supabase নেই বলে ৩টি SQL/role test লোকালে **NOT TESTED**। `npm test`-এ ৩ পাস, lint, `tsc --noEmit` ও production build পাস। Uvicorn `/health` `200`। দুই লোকাল frontend origin-এর CORS `200`, অন্য origin-এর preflight `400`। |
| Git ও CI | **PASS** whitespace check। শাখা remote-tracking branch থেকে ১ commit এগিয়ে। বর্তমান পরিবর্তনের hosted CI **NOT TESTED**। কোনো commit, push, merge, deploy বা production database migration করা হয়নি। |

### ম্যানুয়াল কনফিগারেশন বাকি

1. বিদ্যমান Supabase project-এর **Settings → API Keys** থেকে `frontend/.env.local`-এ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` বসান। Legacy public key ব্যবহার করলে `NEXT_PUBLIC_SUPABASE_ANON_KEY` বসান। Backend private key এই ফাইলে রাখবেন না। [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
2. একই project-এর `service_role` key কেবল `backend/.env`-এর `SUPABASE_SERVICE_ROLE_KEY`-তে বসান। ES256 সেশনে `SUPABASE_JWT_SECRET` খালি রাখা যায়। পুরোনো HS256 সেশন ব্যবহার করলে তবেই সেই setting-এ legacy JWT secret লাগবে। [Supabase signing keys](https://supabase.com/docs/guides/auth/signing-keys)
3. Email confirmation চালু থাকলে **Authentication → URL Configuration**-এ যে origin দিয়ে signup শুরু করবেন তার `/auth/callback` যোগ করুন। লোকাল app restart করুন। আসল sign-in যাচাইয়ের জন্য অনুমোদিত test account, আর workspace যাচাইয়ের জন্য প্রকাশিত test problem দরকার।
4. লোকাল Judge0 CE চালু করুন, অথবা অনুমোদিত instance-এর URL `backend/.env`-এর `JUDGE0_API_URL`-এ দিন। Instance token চাইলে সেখানেই `JUDGE0_AUTH_TOKEN` বসান। Quota RPC-এর উপস্থিতি test database-এ যাচাই করা বাকি।

### Phase 1-এ পরিবর্তিত ফাইল

- Backend · `app/core/{auth,config,database,role_store,judge0,execution_quota}.py`, `app/api/v1/endpoints/platform.py` এবং সক্রিয়, Git-ignored `backend/.env`।
- Frontend · `src/lib/backend-url.ts`, `src/lib/backend.ts`, `src/lib/supabase/config.ts`, `src/app/auth/register/page.tsx`, `src/components/layout/Navbar.tsx`, `src/app/workspace/coding/[id]/page.tsx` ও `package.json`।
- Tests ও নথি · `backend/tests/{conftest,test_auth,test_unit_auth,test_jwks_auth,test_platform_services,test_execution_quota}.py`, `frontend/tests/runtime-config.test.mjs`, `.github/workflows/ci.yml`, `README.md` এবং এই ট্র্যাকার।

## Auth role-routing fix · ১৯ নভেম্বর ২০২৬

**অবস্থা — লোকালে যাচাইকৃত।** Role-based login ও navigation-এর আসল কারণ ঠিক করা হয়েছে; কোনো production migration, deploy বা বিদ্যমান account-এর role পরিবর্তন করা হয়নি।

### মূল কারণ ও সমাধান

- **কারণ:** access matrix-এ teacher ও admin-কে student portal-এ ঢোকার অনুমতি দেওয়া ছিল না, অথচ backend `require_student` তিন role-কেই অনুমতি দেয়। ফলে admin/teacher-এর `/problems`-এর মতো student page খুললে proxy তাঁদের নিজের portal-এ ফেরত পাঠাত, যা "student page admin-এ redirect" হিসেবে দেখা যাচ্ছিল। এর সঙ্গে login পেজের ভ্রান্ত Student/Teacher/Admin বাটন এবং পুরোনো session-এর অবশিষ্ট cookie বিভ্রান্তি বাড়াচ্ছিল।
- **সমাধান:** নতুন `src/lib/auth-access.ts`-এ একক matrix — student → student only; teacher → student + teacher; admin → student + teacher + admin। Proxy, login redirect এবং navigation সবাই একই matrix ব্যবহার করে। Role সর্বদা FastAPI `/auth/me` (persisted Supabase profile) থেকে আসে; UI বাটন বা JWT metadata থেকে নয়।
- Login page থেকে role-selection বাটন সরানো হয়েছে (শুধু email/password) এবং `redirectTo` শুধু same-origin অনুমোদিত path গ্রহণ করে (open redirect প্রতিরোধ)।
- Navbar ও Footer-এ Teacher/Admin link কেবল verified role অনুযায়ী দেখানো হয়; sign-out এখন `scope: 'local'` সহ সম্পূর্ণ reload করে, তাই stale session ভূমিকা রাখতে পারে না।

### যাচাই

| যাচাই | ফল |
| --- | --- |
| Student | login → `/dashboard`, ROLE student, refresh-এ অপরিবর্তিত; `/admin` ও `/teacher` → `/dashboard`; nav/footer-এ Teacher/Admin link নেই। |
| Teacher | login → `/teacher`, ROLE teacher; `/problems` খোলে; `/admin` → `/teacher`; শুধু Teacher link দেখা যায়। |
| Admin | `/admin`, `/teacher`, `/dashboard` ও `/problems` সবই খোলে; সব portal link দেখা যায়। |
| Account switching | Admin sign out → login page, cookie শূন্য → disposable student password login → `/dashboard`, refresh-এর পরেও কোনো Admin state নেই। |
| Redirect safety | `//evil.example`, `https://evil.example`, `/\evil.example` ও `javascript:` payload ফিরে আসে role-এর default dashboard-এ; permitted deep link অপরিবর্তিত থাকে (loop নেই)। |
| Regression tests | frontend `npm test` — 25 pass (এর মধ্যে auth matrix/portal: 14 cases, 18 behavioral scenarios); `lint` ও `tsc --noEmit` clean; backend `pytest` — 150 pass; `git diff --check` clean। |

### পরিবর্তিত ফাইল

- `frontend/src/lib/auth-access.ts` (নতুন), `frontend/src/lib/auth.ts`, `frontend/src/app/auth/login/page.tsx`, `frontend/src/components/layout/{Navbar,Footer}.tsx`, `frontend/tests/auth-access.test.mjs` (নতুন), `frontend/package.json`।
- Disposable test account (`student.e2e.20261119`, `teacher.e2e.20261119`) শুধু লোকাল helper দিয়ে ব্যবহৃত; কোনো credential print, log বা commit হয়নি। Admin account অপরিবর্তিত।
