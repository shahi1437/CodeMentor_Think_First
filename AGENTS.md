# AGENTS.md - CodeMentor AI Project Guidelines & Rules

Welcome to **CodeMentor AI** — an AI-powered debugging intelligence and adaptive programming learning platform.

This document serves as the single source of truth for all AI agents and engineers contributing to this repository. Every agent, developer, and contributor must follow these rules strictly.

---

## 1. Project Purpose & Architecture Overview

CodeMentor AI provides:
- **Roles**: Student, Teacher, and Administrator.
- **Modes**: Normal Coding Mode and Debugging Mode (interactive bug diagnosis).
- **Core Capabilities**:
  - Unified problem bank with strict test-case privacy.
  - Safe, sandboxed code execution via **Judge0 CE**.
  - In-house **Scikit-learn** Machine Learning error classifier.
  - **RAG-based AI Mentor** using PostgreSQL + `pgvector` knowledge retrieval.
  - Controlled LLM agent tools running securely on the backend.
  - **Learning DNA** tracking error patterns and student mastery.
  - Adaptive challenges and real-time teacher analytics.

Architecture Paradigm: **Modular Monolith**
- Clear separation between frontend (`frontend/`), backend domains (`backend/`), and shared documentation (`docs/`).
- Clean internal domain boundaries within the backend before considering microservice extraction.

---

## 2. Approved Technology Stack

| Layer | Approved Technology |
|---|---|
| **Frontend Framework** | Next.js (App Router), TypeScript |
| **Styling & UI Components** | Tailwind CSS, shadcn/ui |
| **Code Editor** | Monaco Editor |
| **Backend Framework** | Python, FastAPI |
| **Database & Auth** | Supabase (PostgreSQL, Supabase Auth) |
| **Code Execution Sandbox** | Judge0 CE |
| **Machine Learning** | Scikit-learn (custom error classification) |
| **RAG & Vector Search** | PostgreSQL with `pgvector` |
| **AI Intelligence** | LLM API with tightly controlled backend tools |
| **Version Control** | Git |

---

## 3. The 20 Permanent Rules

1. **Follow Approved Architecture & Existing Code**: Always respect the approved tech stack and established conventions. Never introduce unauthorized frameworks or paradigms.
2. **Frontend Standard**: Next.js with TypeScript, Tailwind CSS, and shadcn/ui components.
3. **Editor Component**: Use Monaco Editor exclusively for all in-browser code editing.
4. **Backend Standard**: FastAPI with Python using typed schemas (Pydantic) and clean modular routing.
5. **Database & Auth**: Supabase PostgreSQL and Supabase Auth.
6. **Code Execution Sandbox**: Judge0 CE.
7. **In-House ML**: Scikit-learn for proprietary classification models.
8. **RAG Storage**: PostgreSQL with `pgvector` for context grounding and semantic search.
9. **Controlled AI Tools**: LLM access must always run through validated backend tools with strictly defined schemas and guardrails.
10. **Modular Monolith**: Maintain cleanly separated modules with clear interfaces inside the monolithic repository.
11. **Security - Secrets & Test Cases**:
    - **NEVER** expose API keys, credentials, or environment secrets to client bundles or Git.
    - **NEVER** reveal hidden grading test cases to students or client-side responses.
12. **Execution Safety**: **NEVER** execute untrusted student code directly on the main backend server. All executions must run via Judge0 CE sandboxes.
13. **Content Integrity**: **NEVER** publish, copy, or scrape unlicensed external problem content into the problem bank.
14. **Validation**: **NEVER** show unvalidated debugging problem variants to students. All generated buggy snippets must be pre-verified by the test harness.
15. **Honesty & Verification**: **NEVER** fake or mock AI responses or code execution results in production or student-facing flows.
16. **Automated Testing Required**: Every important feature and API endpoint must include automated tests (e.g., `pytest` for backend, unit/component tests for frontend).
17. **Four UI States Mandate**: Every user-facing feature and component must handle all four primary states:
    - **Loading** (skeleton / spinner)
    - **Error** (clear user-friendly recovery message)
    - **Empty** (helpful zero-data prompt)
    - **Success** (rendered content)
18. **Scope Protection**: Do not modify or rewrite unrelated files outside the specific task scope.
19. **Beginner-Friendly Communication**: Always explain code changes, commands, and architectural concepts in accessible, beginner-friendly language.
20. **Milestone Verification**: Work in small, incremental milestones and verify each step with tests or health checks before proceeding to the next.

---

## 4. Standard Task Workflow

For every task, all agents and contributors must execute the following workflow:

1. **Inspect Existing Files First**: Understand the current state of the repository before writing code.
2. **Explain the Implementation Plan**: Provide a concise, clear breakdown of how the task will be achieved.
3. **List Expected File Changes**: Enumerate files to be created, modified, or deleted.
4. **Wait for Approval on Major Changes**: Confirm design decisions or architectural additions with the user before applying them.
5. **Implement Only Requested Scope**: Keep changes focused; avoid feature creep or premature optimizations.
6. **Run Relevant Tests & Checks**: Execute tests, linters, or smoke tests to confirm stability.
7. **Report Completed Work & Remaining Items**: Conclude with a clear summary of what was accomplished and what remains.

---

## 5. Security & Safety Checklist

- [ ] `.env` and sensitive credentials are in `.gitignore`.
- [ ] No hardcoded secrets exist in source code or commits.
- [ ] Student code execution requests route solely to isolated sandbox workers.
- [ ] Test cases are split into public (sample) and hidden (grading) suites.
- [ ] Backend endpoints enforce proper role-based access control (Student, Teacher, Admin).
