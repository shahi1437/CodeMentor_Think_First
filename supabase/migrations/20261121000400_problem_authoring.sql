BEGIN;

ALTER TABLE public.problems
    ADD COLUMN revision bigint NOT NULL DEFAULT 1,
    ADD COLUMN verified_revision bigint,
    ADD COLUMN archived_at timestamptz,
    ADD COLUMN reference_solutions jsonb NOT NULL DEFAULT '{}',
    ADD COLUMN debugging_starter_code jsonb NOT NULL DEFAULT '{}',
    ADD CONSTRAINT archived_problem_unpublished CHECK (archived_at IS NULL OR NOT is_published);

DROP POLICY IF EXISTS "Teachers and admins manage problems" ON public.problems;
DROP POLICY IF EXISTS "Teachers and admins update problems" ON public.problems;
REVOKE INSERT, UPDATE, DELETE ON public.problems, public.problem_test_cases FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.save_problem_draft(
    p_problem_id uuid, p_revision bigint, p_author_id uuid, p_draft jsonb
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    draft record;
    saved_id uuid;
BEGIN
    SELECT * INTO draft FROM jsonb_to_record(p_draft) AS value(
        title text, description text, difficulty text, category text,
        problem_mode text, tags text[], supported_languages text[],
        starter_code jsonb, progressive_hints jsonb, reference_solutions jsonb,
        debugging_starter_code jsonb, test_cases jsonb
    );

    IF p_problem_id IS NULL THEN
        saved_id := gen_random_uuid();
        INSERT INTO public.problems (
            id, slug, title, description, difficulty, category, problem_mode, tags, supported_languages,
            starter_code, progressive_hints, reference_solutions, debugging_starter_code, created_by
        ) VALUES (
            saved_id, saved_id::text, draft.title, draft.description, draft.difficulty, draft.category,
            draft.problem_mode, draft.tags, draft.supported_languages,
            draft.starter_code, draft.progressive_hints, draft.reference_solutions,
            draft.debugging_starter_code, p_author_id
        ) RETURNING id INTO saved_id;
    ELSE
        UPDATE public.problems
        SET title = draft.title, description = draft.description, difficulty = draft.difficulty,
            category = draft.category, problem_mode = draft.problem_mode, tags = draft.tags,
            supported_languages = draft.supported_languages, starter_code = draft.starter_code,
            progressive_hints = draft.progressive_hints, reference_solutions = draft.reference_solutions,
            debugging_starter_code = draft.debugging_starter_code, revision = revision + 1,
            verified_revision = NULL
        WHERE id = p_problem_id AND revision = p_revision AND NOT is_published AND archived_at IS NULL
        RETURNING id INTO saved_id;
    END IF;

    IF saved_id IS NULL THEN
        RETURN NULL;
    END IF;
    DELETE FROM public.problem_test_cases WHERE problem_id = saved_id;
    INSERT INTO public.problem_test_cases (problem_id, name, input_text, expected_output, is_hidden)
    SELECT saved_id, name, input_text, expected_output, is_hidden
    FROM jsonb_to_recordset(draft.test_cases) AS item(
        name text, input_text text, expected_output text, is_hidden boolean
    );
    RETURN saved_id;
END;
$$;

CREATE FUNCTION public.change_problem_state(p_problem_id uuid, p_revision bigint, p_state text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_state NOT IN ('published', 'draft', 'archived') THEN
        RAISE EXCEPTION 'Invalid problem state';
    END IF;
    UPDATE public.problems
    SET is_published = p_state = 'published',
        archived_at = CASE WHEN p_state = 'archived' THEN statement_timestamp() ELSE NULL END,
        revision = revision + 1,
        verified_revision = CASE WHEN p_state = 'published' THEN revision + 1 ELSE NULL END
    WHERE id = p_problem_id AND revision = p_revision AND archived_at IS NULL
        AND (p_state <> 'published' OR NOT is_published);
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.save_problem_draft(uuid, bigint, uuid, jsonb),
    public.change_problem_state(uuid, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_problem_draft(uuid, bigint, uuid, jsonb),
    public.change_problem_state(uuid, bigint, text) TO service_role;

COMMIT;
