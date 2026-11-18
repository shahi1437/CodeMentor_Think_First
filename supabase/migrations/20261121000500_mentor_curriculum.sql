BEGIN;

ALTER TABLE public.mentor_conversations
    ADD COLUMN revision bigint NOT NULL DEFAULT 0,
    ADD COLUMN mode text NOT NULL DEFAULT 'socratic' CHECK (mode IN ('socratic', 'conceptual'));

ALTER TABLE public.mentor_messages
    ADD COLUMN turn_id uuid,
    ADD COLUMN message_kind text NOT NULL DEFAULT 'user' CHECK (message_kind IN ('user', 'assistant')),
    ADD COLUMN sources jsonb NOT NULL DEFAULT '[]',
    ADD CONSTRAINT mentor_message_once UNIQUE (conversation_id, turn_id, message_kind);

CREATE INDEX mentor_conversations_owner_recent ON public.mentor_conversations(user_id, updated_at DESC);
CREATE INDEX mentor_messages_conversation_recent ON public.mentor_messages(conversation_id, created_at DESC);

REVOKE INSERT, UPDATE, DELETE ON public.mentor_conversations, public.mentor_messages, public.knowledge_chunks
    FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.append_mentor_turn(
    p_conversation_id uuid, p_user_id uuid, p_role public.user_role, p_revision bigint,
    p_turn_id uuid, p_topic text, p_mode text, p_question text, p_answer text, p_sources jsonb
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_revision = 0 THEN
        INSERT INTO public.mentor_conversations (id, user_id, topic, mode)
        VALUES (p_conversation_id, p_user_id, p_topic, p_mode)
        ON CONFLICT (id) DO NOTHING;
    END IF;
    UPDATE public.mentor_conversations
    SET revision = revision + 1, mode = p_mode
    WHERE id = p_conversation_id AND user_id = p_user_id AND revision = p_revision AND status = 'open';
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.mentor_messages (
        conversation_id, sender_id, sender_role, turn_id, message_kind, message, sources
    ) VALUES
        (p_conversation_id, p_user_id, p_role, p_turn_id, 'user', p_question, '[]'),
        (p_conversation_id, p_user_id, p_role, p_turn_id, 'assistant', p_answer, p_sources);
    RETURN TRUE;
END;
$$;

CREATE FUNCTION public.retrieve_curriculum(p_embedding vector, p_model text)
RETURNS TABLE (id uuid, title text, content text, source_url text, license text)
LANGUAGE sql STABLE
SET search_path = pg_catalog, public, extensions
AS $$
    SELECT chunk.id, chunk.title, left(chunk.content, 6000),
           chunk.metadata->>'source_url', chunk.metadata->>'license'
    FROM public.knowledge_chunks AS chunk
    WHERE chunk.is_public AND chunk.source_type = 'curriculum'
        AND chunk.embedding IS NOT NULL
        AND chunk.metadata->>'embedding_model' = p_model
        AND nullif(chunk.metadata->>'license', '') IS NOT NULL
        AND (chunk.embedding <=> p_embedding) < 0.7
    ORDER BY chunk.embedding <=> p_embedding
    LIMIT 5
$$;

REVOKE ALL ON FUNCTION public.append_mentor_turn(uuid, uuid, public.user_role, bigint, uuid, text, text, text, text, jsonb),
    public.retrieve_curriculum(vector, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_mentor_turn(uuid, uuid, public.user_role, bigint, uuid, text, text, text, text, jsonb),
    public.retrieve_curriculum(vector, text) TO service_role;

COMMIT;
