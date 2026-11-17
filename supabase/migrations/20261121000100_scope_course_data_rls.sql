BEGIN;

DROP POLICY IF EXISTS "Teachers and Admins can view all profiles"
    ON public.profiles;
CREATE POLICY "Teachers can view enrolled student profiles"
    ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_admin()
        OR (
            public.current_user_role() = 'teacher'::public.user_role
            AND EXISTS (
                SELECT 1
                FROM public.course_enrollments AS enrollment
                JOIN public.courses AS course
                    ON course.id = enrollment.course_id
                WHERE enrollment.student_id = profiles.id
                  AND enrollment.enrollment_status = 'active'
                  AND course.teacher_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Students can manage their own submissions"
    ON public.submissions;
DROP POLICY IF EXISTS "Teachers and admins can read submissions"
    ON public.submissions;
CREATE POLICY "Users can read own submissions"
    ON public.submissions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
CREATE POLICY "Admins can read all submissions"
    ON public.submissions
    FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Students can manage own enrollments"
    ON public.course_enrollments;
CREATE POLICY "Students can read own enrollments"
    ON public.course_enrollments
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers and admins can view mentor conversations"
    ON public.mentor_conversations;
CREATE POLICY "Admins can view all mentor conversations"
    ON public.mentor_conversations
    FOR SELECT TO authenticated
    USING (public.is_admin());
CREATE POLICY "Teachers can view enrolled course conversations"
    ON public.mentor_conversations
    FOR SELECT TO authenticated
    USING (
        public.current_user_role() = 'teacher'::public.user_role
        AND course_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.courses AS course
            JOIN public.course_enrollments AS enrollment
                ON enrollment.course_id = course.id
            WHERE course.id = mentor_conversations.course_id
              AND course.teacher_id = auth.uid()
              AND enrollment.student_id = mentor_conversations.user_id
              AND enrollment.enrollment_status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can manage own mentor messages"
    ON public.mentor_messages;
CREATE POLICY "Users can manage messages in own conversations"
    ON public.mentor_messages
    FOR ALL TO authenticated
    USING (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.mentor_conversations AS conversation
            WHERE conversation.id = mentor_messages.conversation_id
              AND conversation.user_id = auth.uid()
        )
    )
    WITH CHECK (
        sender_id = auth.uid()
        AND sender_role = public.current_user_role()
        AND EXISTS (
            SELECT 1
            FROM public.mentor_conversations AS conversation
            WHERE conversation.id = mentor_messages.conversation_id
              AND conversation.user_id = auth.uid()
        )
    );

COMMIT;
