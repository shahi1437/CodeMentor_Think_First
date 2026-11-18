BEGIN;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active
$$;

ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;
REVOKE EXECUTE ON FUNCTION public.current_user_role(), public.is_admin(), public.is_teacher()
    FROM anon;

-- Role and account status changes go through the admin-only backend.
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
REVOKE UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (role, is_active, id, email) ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (full_name, preferred_language) ON public.profiles TO authenticated;

-- Legacy submissions may contain grader output. Keep only the summary readable by clients.
REVOKE SELECT ON public.submissions FROM PUBLIC, anon, authenticated;
REVOKE SELECT (source_code, stdout, stderr, runtime_metadata) ON public.submissions
    FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, user_id, problem_id, status, score, language, created_at, updated_at)
    ON public.submissions TO authenticated;

DROP POLICY IF EXISTS "Teachers and admins can read hidden cases" ON public.problem_test_cases;
DROP POLICY IF EXISTS "Teachers and admins manage problem cases" ON public.problem_test_cases;
DROP POLICY IF EXISTS "Teachers and admins update problem cases" ON public.problem_test_cases;
CREATE POLICY "Admins can read grading cases" ON public.problem_test_cases
    FOR SELECT TO authenticated USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.problems,
    public.problem_test_cases, public.submissions, public.learning_dna_profiles,
    public.learning_dna_events, public.daily_plans, public.daily_plan_tasks, public.courses,
    public.course_enrollments, public.mentor_conversations, public.mentor_messages,
    public.knowledge_chunks, public.audit_logs TO service_role;
GRANT SELECT ON public.profiles, public.problem_test_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses, public.course_enrollments,
    public.mentor_conversations, public.mentor_messages TO authenticated;

DROP POLICY IF EXISTS "Students can view published courses" ON public.courses;
CREATE POLICY "Students can view published courses" ON public.courses
    FOR SELECT TO authenticated
    USING (is_published OR teacher_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Teachers and admins manage courses" ON public.courses;
CREATE POLICY "Teachers and admins manage courses" ON public.courses
    FOR ALL TO authenticated
    USING (public.is_admin() OR (public.current_user_role() = 'teacher' AND teacher_id = auth.uid()))
    WITH CHECK (public.is_admin() OR (public.current_user_role() = 'teacher' AND teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers and admins manage enrollments" ON public.course_enrollments;
CREATE POLICY "Teachers and admins manage enrollments" ON public.course_enrollments
    FOR ALL TO authenticated
    USING (
        public.is_admin() OR (public.current_user_role() = 'teacher' AND EXISTS (
            SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid()
        ))
    )
    WITH CHECK (
        public.is_admin() OR (public.current_user_role() = 'teacher' AND EXISTS (
            SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid()
        ))
    );

COMMIT;
