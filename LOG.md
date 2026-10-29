# Technical Disclosure Log — Solaris

**Project:** Solaris — Delhi-first solar adoption planning platform  
**Hackathon:** Prompt-ae-thon  
**Prepared by:** Doraemon
**Last Updated:** 2026-10-23

---

## 1. Agent Skills and Capabilities

We used the **ui-ux-pro-max** skill as our primary design tool. It's a local skill installed at `C:\Users\Aryan Das\.config\opencode\skills\ui-ux-pro-max` with a searchable database of 84 styles, 192 color palettes, 74 font pairings, 192 product types, 98 UX guidelines, 104 icons, 16 GSAP presets, and 25 chart types across 22 tech stacks. We ran the design system generator giving us a Glassmorphism + Community/Forum Landing pattern with a green energy palette (#006b57 primary, #9af4d8 secondary, #f6bd4f accent) and Plus Jakarta Sans / Inter typography.

---

## 2. GitHub Repositories / External Codebases

We didn't use any templates, boilerplates, or starter kits. The project was scaffolded manually and built from scratch. Libraries used:

- React 19.0.1 and React DOM 19.0.1 (MIT)
- Vite 8.3.0 (MIT)
- Tailwind CSS 4.3.3 (MIT) with @tailwindcss/vite
- lucide-react 0.546.0 (ISC)
- motion 12.23.24 (MIT, Framer Motion)
- Express 4.21.2 (MIT)
- @google/genai 2.4.0 (Apache-2.0)
- dotenv 17.2.3 (BSD-2-Clause)
- TypeScript 7.0.2 (Apache-2.0)

All installed via npm with `--legacy-peer-deps` due to a Vite/esbuild peer conflict.

---

## 3. MCP Servers and Integrations

None used. No Model Context Protocol servers or external MCP integrations were configured.

---

## 4. APIs and External Services

- **Google Generative AI** (via @google/genai SDK)
- **Google Fonts**
- **Material Symbols**
- **Placeholder images**

No paid APIs, proprietary data services, or third-party SaaS integrations are required for core functionality. All calculations run locally in the browser.

---

## 5. Technology Stack

Language: TypeScript 7.0.2 (strict mode, ES2022 target) with JavaScript ESM modules

Frontend: React 19.0.1 with hooks and concurrent features. Build tool: Vite 8.3.0 with React plugin and Tailwind plugin

Styling: Tailwind CSS 4.3.3 using the new v4 @theme directive in index.css for design tokens

Routing: Custom hash-based router in AppContext

State: Single React Context provider (AppContext)

Persistence: localStorage only.

Auth: Custom localStorage auth

Animation: motion (Framer Motion) available but used sparingly; CSS transitions preferred. Custom @keyframes landing-rise and landing-float in index.css with prefers-reduced-motion media query

Charts/visuals: Hand-coded inline SVG and CSS

Icons: Material Symbols Outlined (primary, via Google Fonts) + lucide-react (fallback).

Package manager: npm 11.13.0

Config files: package.json, tsconfig.json, vite.config.ts, index.css, index.html

---

## 6. AI Tools and Models

- **nemotron-3-ultra-free** (NVIDIA, via opencode) — identifier `opencode/nemotron-3-ultra-free`. This was the primary coding agent for the entire session. All code generation, refactoring, debugging, design decisions, file edits, and terminal commands went through this model.

- **DeepSeek V4.1 Flash Free** — was used for a few initial prompts to test model performance, before settling on Nemotron-3 Ultra for the main session.

- **Google AI Studio (Gemini)** — used to create the initial prototype for the landing page and basic project structure.

- **ChatGPT** - to create the docs for this project including the PRD, TRD, SRS, DFD and implementation plan.

- **Stitch** - to create the wireframes for this project.

---

## 7. Model Harnesses and Development Platforms

- **opencode** — AI coding agent CLI, the main development interface. Ran in the project directory with nemotron-3-ultra-free. All file reads/writes/edits, terminal commands, skill loading, and task orchestration done through opencode.

- **Git** — version control. Used git status, git diff --stat, git log to track changes. No commits made during session (explicitly avoided per instructions).

No other AI coding assistants (GitHub Copilot, Cursor, Claude Code, etc.) were used.

---

## 8. Product and Software Requirements Documents

- **PrabhaWatt_PRD.txt** (in repo at docs/) — Product Requirements Document defining MVP scope: P0 features (Assessment, Regulations, Community, Optimiser, Credit Allocation, Monitoring, Reports, Admin).

- **PrabhaWatt_TRD (1).txt** (in repo at docs/) - Technical Requirements Document defining the technical requirements for the project.

- **PrabhaWatt_SRS (1).txt** (in repo at docs/) - Software Requirements Specification defining the software requirements for the project.

- **PrabhaWatt_DFD.txt** (in repo at docs/) - Data Flow Diagram defining the data flow for the project.

- **PrabhaWatt_Implementation_Plan (1).txt** (in repo at docs/) - Implementation Plan defining the implementation plan for the project.

---

## 9. Additional Development Resources

- **localStorage** — all persistence: auth accounts, session, user profile, community data, audit logs, optimiser params. No database.
- **CSS Custom Properties** — design tokens via Tailwind @theme used throughout components via arbitrary values.
- **CSS Animations** — @keyframes landing-rise, @keyframes landing-float in index.css controlled by prefers-reduced-motion media query.
- **bun.lock** — present in repo but Bun not installed; npm used exclusively.

---

## Authorship Classification

**Built from scratch (with AI assistance):** All 13 page components, 7 common components, AppContext state management, custom hash router, authStorage utilities, solarCalculations and optimiserEngine logic, Tailwind design tokens, CSS animations, index.html setup, this LOG.md.

**Adapted from external sources:** Design system generated by ui-ux-pro-max skill (prompted by me, output synthesized into code); Material Symbols icon set (Google Fonts); PRD content (provided in repo).

**Used as development assistance only:** opencode agent (nemotron-3-ultra-free) for code generation/refactoring; ui-ux-pro-max skill for design rules.

---

## Verification

- All 13 pages lint and build (npm run lint / npm run build pass)
- No hardcoded secrets or API keys in codebase
- localStorage keys documented
- Accessibility: contrast >= 4.5:1, focus rings, ARIA roles, reduced motion, touch targets >= 44x44px, viewport zoom enabled
- No emoji used as structural icons (all Material Symbols)
- Onboarding flow integrated with signup, persisted to localStorage
- Sidebar collapsible overlay, pages center-aligned
- Design tokens consistent across all pages
