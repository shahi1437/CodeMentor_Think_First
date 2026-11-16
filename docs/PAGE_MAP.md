# CodeMentor AI — Page Map & Navigation Blueprint

This document defines the routing, layout structure, page hierarchy, and navigation flow for the CodeMentor AI frontend application.

---

## 1. Route Hierarchy & Roles

CodeMentor AI supports three distinct role views (Student, Teacher, Admin) with consistent navigation and shared design tokens.

### A. Public & Authentication Routes
| Route | Page Name | Primary Purpose | Key Components |
|---|---|---|---|
| `/` | **Landing Page** | Platform value proposition, feature showcase, dual-mode preview, interactive demo teaser, social proof, call-to-actions. | Hero with code animation, Feature grid, Normal vs Debugging comparison slider, Testimonials, CTA banner, Footer. |
| `/auth/login` | **Login** | Role-aware demo login (Student, Teacher, Admin quick-switch buttons + standard credentials form). | Email/password form, 1-click role demo profiles, OAuth buttons (mock/demo), Remember me, Password reset modal. |
| `/auth/register` | **Registration** | Student registration with skill self-assessment prompt and learning goal selection. | Multi-step signup form (Credentials $\rightarrow$ Primary Language $\rightarrow$ Experience Level). |

---

### B. Core Student Experience
| Route | Page Name | Primary Purpose | Key Components |
|---|---|---|---|
| `/dashboard` | **Student Dashboard** | High-level learning overview, daily streak, recent progress, Learning DNA summary, quick resume. | Streak tracker, Daily challenge card, Learning DNA radar snippet, Recommended problems, Recent activity feed. |
| `/assessment` | **Diagnostic Assessment** | Initial placement quiz & diagnostic test evaluating syntax, logic, debugging, and complexity skills. | Timed question runner, Multiple-choice + code snippet analyzer, Real-time score meter, Final skill breakdown modal. |
| `/problems` | **Problem Hub** | Central repository of programming & debugging challenges with multi-attribute filtering. | Search bar, Tag filters (Arrays, Strings, Dynamic Programming, Debugging), Difficulty badges, Acceptance rates, Sort controls. |
| `/workspace/coding/[id]` | **Normal Coding Workspace** | Traditional problem solving environment with Monaco code editor, test cases, and execution console. | Problem description, Monaco Editor (Python/JS/C++), Sample test cases runner, Run/Submit actions, Execution console with 4 UI states. |
| `/workspace/debugging/[id]` | **Debugging Lab** | Bug diagnosis mode with pre-seeded buggy code, runtime stack trace, test failure diagnosis, and fix verification. | Bug scenario brief, Faulty code editor with bug line annotations, Execution trace viewer, Hypothesis submission, Fix validator. |
| `/analyzer` | **Visual Code Analyzer** | Static analysis, AST/Complexity visualization, code smell detector, and execution timeline simulator. | Code input pane, Complexity gauges (Time $O(n)$, Space $O(1)$), AST visualization tree, Clean code checklist. |
| `/mentor` | **AI Mentor** | Socratic debugging chat assistant providing hints, guided questions, and conceptual explanations without spoiling answers. | Chat thread, Socratic mode toggle, Hint tier selector (Nudge $\rightarrow$ Clue $\rightarrow$ Concept), Contextual code attachment. |
| `/learning-dna` | **Learning DNA** | Personalized fingerprint of recurring error patterns, debugging tendencies, and conceptual strengths/weaknesses. | Error distribution chart, Syntax vs Logic vs Runtime breakdown, Skill mastery bars, Growth recommendations. |
| `/daily-plan` | **Adaptive Daily Plan** | AI-generated personalized study schedule tailored to weak concepts and upcoming milestones. | Calendar/Timeline view, Task cards with time estimates, Daily goal progress bar, "Generate New Plan" simulation. |
| `/history` | **Learning History** | Complete audit log of past submissions, debugging attempts, mentor conversations, and test results. | Filterable submission table, Code diff viewer, Performance metrics, Status badges (Accepted, Bug Found, Runtime Error). |

---

### C. Teacher & Academic Management
| Route | Page Name | Primary Purpose | Key Components |
|---|---|---|---|
| `/teacher` | **Teacher Dashboard** | Cohort health, student debugging struggle alerts, assignment progress, and class-wide error patterns. | Class selector, Real-time struggle radar (students stuck > 15 mins), Assignment completion bars, Top recurring class errors. |

---

### D. Administrator & Problem Authoring
| Route | Page Name | Primary Purpose | Key Components |
|---|---|---|---|
| `/admin` | **Admin Dashboard** | System health metrics, user management, sandbox capacity monitoring, and content audit statistics. | Active users counter, Sandbox queue monitor, Problem bank statistics, Flagged solution review queue. |
| `/admin/problems` | **Admin Problem Bank** | Problem management list with search, status filters, and action dropdowns. | Problem data table, Draft vs Published toggle, Test case count, Difficulty tags, Edit / Delete triggers. |
| `/admin/problems/new` | **Admin Problem Studio** | Visual problem authoring tool for creating both Normal and Debugging problem variants with test suites. | Multi-tab form (Metadata, Description, Starter Code, Hidden Test Cases Suite, Buggy Code Variants with Verified Fixes). |

---

## 2. Global Navigation Architecture

### App Shell Structure
- **Global Header (Top Navbar)**:
  - Brand Logo + "CodeMentor AI" mark
  - Main Navigation Links (`Problems`, `Workspace`, `AI Mentor`, `Learning DNA`, `Teacher`, `Admin`)
  - Role Switcher Dropdown (Student / Teacher / Admin preview switch for seamless evaluation)
  - Quick Search shortcut (`Ctrl+K` or search button)
  - Notifications Bell with alert count
  - User Profile dropdown with Avatar, Streak badge, and settings link
- **Responsive Mobile Navigation**:
  - Slide-out mobile drawer with full navigation hierarchy and role switcher
- **Sub-navigation / Sidebars**:
  - Contextual sidebar on Dashboard, Workspace, Teacher, and Admin sections.
