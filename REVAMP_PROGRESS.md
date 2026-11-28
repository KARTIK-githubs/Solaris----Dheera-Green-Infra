# Solaris revamp progress

| Phase | Scope |
| --- | --- |
| 1 | Backend integration, accounts, data access and API security |
| 2 | Solar modelling and external solar data |
| 3 | AI, bill OCR and automation |
| 4 | Business workflows, document storage and notifications |
| 5 | Frontend and usability |
| 6 | Deployment, end-to-end checks and portfolio presentation |

## Phase 1

Development branch is `revamp/solaris-foundation`, based on `main` at `fa13cd5`. The Express and Vercel entry points share the application. MongoDB stores accounts, session digests, ownership and shared request counters. Browser sign-in uses cookies and the shared API client. Assessment and support records are scoped by account. Staff manage the shared community roster and optimisation history. Administrators can read the server audit ledger. The public calculator uses the existing deterministic engine. See [setup and permissions](docs/phase-1.md) for configuration, role provisioning, migration and local verification.

The server changes are in `server/auth`, `server/index.ts`, `server/config`, `server/models`, `server/routes` and the Vercel adapter. Browser integration is in `src/context/AppContext.tsx`, `src/services/apiClient.ts` and the corresponding pages. CI and tests are in `.github/workflows/verify.yml` and `server/tests`.

## Verification and continuation

The pre-merge pass reviewed the complete PR diff and retained contributor credits and the calculation engines. Browser-only passwords, public administrative access, the database-wide cohort reset and local-only roster mutations were intentionally retired. The protected staff roster remains available with an explicitly seeded demo database.

The review distinguished account inputs from model estimates, standardized database outages, made the assistant role session-derived, tightened cross-tab session handling and added a Vercel preview database-name safeguard. See [Vercel preview configuration](docs/phase-1.md#vercel-preview).

Local checks used isolated MongoDB 7.0. All 37 automated checks passed (12 calculation and optimisation cases, 11 backend checks and 14 HTTP checks), along with TypeScript and the production build. Chromium verified public calculator access, registration, session restoration, saved assessments, support tickets and stale-tab account isolation. GitHub Actions repeats these suites, TypeScript checking and the production build. Groq tests use mocked provider responses.

Vercel reports deployment build status on the PR. Preview settings and the hosted database cannot be inferred from a green deployment check. Before merging, configure the branch-scoped preview database and run the protected preview smoke test. Email verification and password recovery remain required before real customer deployment. No production data was used in verification.

To continue from another conversation, read this file and [setup and permissions](docs/phase-1.md) on the development branch. Review the latest checks and unresolved findings before starting Phase 2. Keep the internship and original team attribution in the README.
