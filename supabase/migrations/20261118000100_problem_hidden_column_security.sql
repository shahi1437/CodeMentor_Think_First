-- Keep row-level access to published problem data while denying clients access
-- to the legacy hidden_test_cases column stored on public.problems.
BEGIN;

REVOKE SELECT ON TABLE public.problems FROM anon, authenticated;
REVOKE SELECT ON TABLE public.problems FROM PUBLIC;
REVOKE SELECT (hidden_test_cases) ON TABLE public.problems FROM anon, authenticated;
REVOKE SELECT (hidden_test_cases) ON TABLE public.problems FROM PUBLIC;

GRANT SELECT (
    id,
    title,
    slug,
    difficulty,
    category,
    description,
    starter_code,
    is_published,
    created_at,
    updated_at
) ON TABLE public.problems TO anon, authenticated;

COMMIT;
