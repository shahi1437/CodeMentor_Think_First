BEGIN;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT p.role
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT public.current_user_role() = 'admin'::public.user_role
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT public.current_user_role() IN ('teacher'::public.user_role, 'admin'::public.user_role)
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;

DROP POLICY IF EXISTS "Teachers and Admins can view all profiles" ON public.profiles;
CREATE POLICY "Teachers and Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_teacher());

DROP POLICY IF EXISTS "Users can update own profile non-role fields" ON public.profiles;
CREATE POLICY "Users can update own profile non-role fields" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = public.current_user_role()
    );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (
        public.is_admin()
        AND (id <> auth.uid() OR role = public.current_user_role())
    );

COMMIT;
