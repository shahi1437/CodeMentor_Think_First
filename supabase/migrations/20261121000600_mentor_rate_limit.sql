BEGIN;

ALTER TABLE public.execution_rate_windows DROP CONSTRAINT execution_rate_windows_action_check;
ALTER TABLE public.execution_rate_windows ADD CONSTRAINT execution_rate_windows_action_check
    CHECK (action IN ('run', 'submit', 'mentor'));

CREATE OR REPLACE FUNCTION public.consume_execution_quota(
    p_user_id uuid, p_action text, p_limit integer, p_window_seconds integer
) RETURNS integer
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    window_length interval;
    current_window timestamptz;
    allowed_at timestamptz;
BEGIN
    IF p_action IS NULL OR p_action NOT IN ('run', 'submit', 'mentor')
        OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10000
        OR p_window_seconds IS NULL OR p_window_seconds NOT BETWEEN 1 AND 3600 THEN
        RAISE EXCEPTION 'Invalid rate limit configuration';
    END IF;

    window_length := make_interval(secs => p_window_seconds);
    current_window := date_bin(window_length, statement_timestamp(), '1970-01-01 UTC'::timestamptz);
    INSERT INTO public.execution_rate_windows AS quota (user_id, action, started_at, request_count)
    VALUES (p_user_id, p_action, current_window, 1)
    ON CONFLICT (user_id, action) DO UPDATE
        SET started_at = EXCLUDED.started_at,
            request_count = CASE WHEN quota.started_at < EXCLUDED.started_at THEN 1
                                ELSE quota.request_count + 1 END
        WHERE quota.started_at < EXCLUDED.started_at
            OR (quota.started_at = EXCLUDED.started_at AND quota.request_count < p_limit)
    RETURNING started_at INTO allowed_at;
    IF allowed_at IS NOT NULL THEN
        RETURN 0;
    END IF;
    SELECT started_at INTO allowed_at
    FROM public.execution_rate_windows WHERE user_id = p_user_id AND action = p_action;
    RETURN GREATEST(1, ceil(extract(epoch FROM allowed_at + window_length - clock_timestamp()))::integer);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_execution_quota(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_execution_quota(uuid, text, integer, integer) TO service_role;

COMMIT;
