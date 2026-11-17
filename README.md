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

## Database security notes

- The database uses Supabase Row Level Security (RLS).
- Students can only read their own data and public problem content.
- Teachers and admins can access controlled course and management records.
- Hidden test cases are never exposed to students through API-level queries.

## Validation

Run backend tests:

```bash
cd backend
venv\Scripts\python.exe -m pytest tests -q
```

The project intentionally uses safe fallbacks when live external credentials are missing and does not claim live service success without a verified configuration.
