# CodeMentor AI

CodeMentor AI is a learning platform for coding practice, debugging skill development, adaptive mentoring, and classroom analytics.

## Project structure

- `backend/` — FastAPI API and RBAC/auth logic
- `frontend/` — Next.js app with Supabase auth and protected routes
- `supabase/migrations/` — PostgreSQL and RLS migration scripts
- `docs/` — implementation and status notes

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in your project values from Supabase.
3. Start the backend:
   - `cd backend`
   - `python -m venv venv`
   - `venv\Scripts\python.exe -m pip install -r requirements.txt`
   - `venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload`
4. Start the frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Supabase beginner setup

1. Create a new Supabase project.
2. Open Project Settings -> API.
3. Copy the project URL and anon key.
4. Copy the JWT secret from Project Settings -> API -> JWT Secret.
5. Paste those values into `.env` for the backend and frontend.
6. In the Supabase SQL editor, run the migration files in `supabase/migrations/` in order.
7. Sign up a user in the app; then promote the first admin account with a database update if needed.

Important:
- Never commit `.env` or service-role credentials to Git.
- Keep service-role access backend-only.
- Do not trust client-supplied roles; always validate them on the server.

## Configure the AI Mentor

The Mentor sends requests from the authenticated frontend to the FastAPI endpoint at
`/api/v1/platform/mentor`. The backend then calls an OpenAI-compatible chat-completions
provider; its API key is never sent to the browser.

In the backend `.env`, configure:

- `LLM_API_URL`: the provider's chat-completions URL (the example uses OpenAI).
- `LLM_API_KEY`: a private provider key. Keep it only in the backend environment.
- `LLM_MODEL`: a model name supported by that provider.

When following the local setup commands (which start FastAPI from `backend/`), put
these values in `backend/.env`; the root `.env.example` is a template you can copy
from. Do not put `LLM_API_KEY` in `frontend/.env.local` or in any `NEXT_PUBLIC_*`
variable.

Restart FastAPI after setting these values. If provider configuration is missing, the
Mentor returns an explicit service-unavailable error; provider errors are also shown
to the user rather than replaced with simulated answers. When a persisted
`learning_dna_profiles` row exists for the signed-in user, its mastery and activity
summary is supplied to the provider as context. Without that row, no fabricated
Learning DNA values are used.

## Database security notes

- The database uses Supabase Row Level Security (RLS).
- Students can only read their own data and public problem content.
- Teachers and admins can access controlled course and management records.
- Backend problem and submission-history APIs exclude hidden test data, including legacy submission outputs.
- Apply `20261118_problem_hidden_column_security.sql` before allowing browser clients to query `problems` directly; live migration verification is still required.

## Validation

Run backend tests:

```bash
cd backend
venv\Scripts\python.exe -m pytest tests -q
```

External services are not represented as successful when configuration is missing. In particular, the AI Mentor requires backend LLM configuration and a successful provider response; configure real credentials to verify the live integration.
