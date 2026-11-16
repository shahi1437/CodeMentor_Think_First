-- ==============================================================================
-- CodeMentor AI — Supabase Database Schema & Row Level Security (RLS)
-- File: supabase/migrations/20261117_init_auth_schema.sql
-- Purpose: Real Auth, User Profiles, Role-Based Access Control (Student/Teacher/Admin)
-- ==============================================================================

-- 1. Create Role Enumeration
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'admin');

-- 2. Create Profiles Table (Linked 1:1 with auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role public.user_role NOT NULL DEFAULT 'student',
    preferred_language TEXT DEFAULT 'python',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for quick role lookups
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- 3. Helper Functions for Role Checking in RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT (public.current_user_role() = 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
    SELECT (public.current_user_role() IN ('teacher', 'admin'));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Profiles
-- Policy A: Authenticated users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Policy B: Teachers and Admins can view student profiles
CREATE POLICY "Teachers and Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_teacher());

-- Policy C: Users can update their own profile info (BUT NOT ROLE)
-- Security: The WITH CHECK ensures users cannot escalate their role.
CREATE POLICY "Users can update own profile non-role fields"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() AND
        role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

-- Policy D: Admins have full access to manage all profiles & grant roles
CREATE POLICY "Admins can update any profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. Automatic Profile Creation on Signup (Trigger)
-- Crucial Security Guard: Always defaults to 'student'. Ignores any client-supplied role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, preferred_language)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'student', -- Forced default. Never self-assigned!
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'python')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. SECURE FIRST ADMIN BOOTSTRAP (Execute manually in Supabase SQL Editor)
-- ==============================================================================
-- To promote your first account to Admin securely:
-- 1. Sign up your account normally (e.g. admin@codementor.ai) in the app.
-- 2. Run the following single command in the Supabase Dashboard SQL Editor:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'admin@codementor.ai';
-- ==============================================================================
