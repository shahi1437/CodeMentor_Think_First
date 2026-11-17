BEGIN;

ALTER TABLE public.problems
    ADD COLUMN IF NOT EXISTS problem_mode TEXT NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS supported_languages TEXT[] NOT NULL DEFAULT ARRAY['python']::TEXT[],
    ADD COLUMN IF NOT EXISTS progressive_hints JSONB NOT NULL DEFAULT '[]'::JSONB;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.problems'::regclass
          AND conname = 'problems_problem_mode_check'
    ) THEN
        ALTER TABLE public.problems
            ADD CONSTRAINT problems_problem_mode_check
            CHECK (problem_mode IN ('normal', 'debugging', 'both'));
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.problem_hint_progress (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
    tier SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 4),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, problem_id, tier)
);

ALTER TABLE public.problem_hint_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.problem_hint_progress FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.problem_hint_progress TO service_role;

COMMIT;
