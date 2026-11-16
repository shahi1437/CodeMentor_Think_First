# CodeMentor AI — Design System & Component Guidelines

## 1. Visual Theme: Premium EdTech SaaS

CodeMentor AI employs a sleek, focused dark navy aesthetic optimized for long coding and debugging sessions. It combines deep slate tones with energetic indigo and teal accents.

---

## 2. Color Palette & Design Tokens

### Backgrounds & Surfaces
- **App Canvas (Deep Navy)**: `#070B14` (Hex) / `bg-slate-950`
- **Surface Elevation 1 (Card/Container)**: `#0F172A` / `bg-slate-900/90`
- **Surface Elevation 2 (Hover/Active/Panel)**: `#172033` / `bg-slate-800/80`
- **Border Default**: `#1E293B` / `border-slate-800`
- **Border Subdued / Glow**: `#334155` / `border-slate-700`

### Brand Accents
- **Primary Indigo (Logic & Intelligence)**:
  - Default: `#6366F1` (`indigo-500`)
  - Hover: `#4F46E5` (`indigo-600`)
  - Subdued / Tint: `rgba(99, 102, 241, 0.12)` (`bg-indigo-500/10`)
- **Secondary Teal (Diagnostics & Mastery)**:
  - Default: `#14B8A6` (`teal-500`)
  - Hover: `#0D9488` (`teal-600`)
  - Subdued / Tint: `rgba(20, 184, 166, 0.12)` (`bg-teal-500/10`)

### Status & Feedback
- **Success / Accepted**: `#10B981` (`emerald-500`) / `bg-emerald-500/10`
- **Error / Bug Detected / Wrong Answer**: `#F43F5E` (`rose-500`) / `bg-rose-500/10`
- **Warning / Suboptimal / Hint**: `#F59E0B` (`amber-500`) / `bg-amber-500/10`
- **Info / Debug Trace**: `#06B6D4` (`cyan-500`) / `bg-cyan-500/10`

---

## 3. Typography Scale

- **Headings**: Clean sans-serif (`font-sans`), high contrast (`text-slate-100`).
  - Hero Display: `text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight`
  - Page Titles: `text-2xl sm:text-3xl font-bold tracking-tight text-white`
  - Section Headings: `text-lg sm:text-xl font-semibold text-slate-100`
  - Subheads: `text-sm font-medium text-slate-400`
- **Code & Syntax**: JetBrains Mono / Fira Code / Monaco font family (`font-mono`).
- **Body**: `text-sm text-slate-300 leading-relaxed`.

---

## 4. Mandatory Four UI States

Every feature, list, and interactive panel must explicitly account for four visual states:

1. **Loading State**:
   - Skeleton shimmer cards (`animate-pulse bg-slate-800/60 rounded-lg`).
   - Circular spinners with brand indigo/teal glow.
2. **Empty State**:
   - Relevant Lucide icon with a soft circular backdrop.
   - Clear explanatory message ("No submissions yet", "No errors detected in this run").
   - Actionable recovery or primary action button ("Solve a challenge", "Run diagnostic").
3. **Error State**:
   - Rose alert container (`border-rose-500/30 bg-rose-500/10 text-rose-300`).
   - Human-readable error message with retry button.
4. **Success State**:
   - Clean, high-contrast rendered content with emerald confirmation indicators.

---

## 5. Distinct Mode Styling

To prevent student confusion between standard coding and bug diagnosis:
- **Normal Coding Mode**:
  - Identified by Indigo badge: `[ Normal Coding Mode ]`
  - Focus: Problem description, sample test cases, editor, output console.
- **Debugging Lab Mode**:
  - Identified by Rose/Amber diagnostic badge: `[ Debugging Lab: Bug Diagnosis ]`
  - Focus: Bug symptom brief, highlighted faulty lines, call stack trace, hypothesis prompt, test suite regression validator.

---

## 6. Simulation & Sandbox Disclaimer Pattern

Per Rule 15 of AGENTS.md ("Never fake AI or code execution results"):
Every frontend simulation feature (demo AI Mentor responses, client-side code execution preview) must feature a clear visual banner:
> ℹ️ **Demo Simulation**: Running in standalone client mode. Real-time Judge0 CE sandboxes and backend LLM agent tools will be connected in Phase 2.
