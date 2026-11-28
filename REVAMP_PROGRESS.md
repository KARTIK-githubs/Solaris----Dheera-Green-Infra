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

Local checks on Node 24 and isolated MongoDB 7.0 passed 12 calculation and optimisation checks, 11 existing backend checks and 11 HTTP security and persistence checks. TypeScript checking and the production build passed. GitHub Actions and a Vercel preview are checked separately.

Verify the draft PR's CI and review the permission matrix before merge. Use a preview MongoDB database and Vercel preview before production. The Groq provider tests use mocks. Planning preferences are browser-local, installation telemetry is illustrative and email verification, password reset and business workflows remain outside this phase. Legacy records need a verified ownership mapping before assignment. No production migration or deployment settings are part of this PR.

To continue from another conversation, read this file and [setup and permissions](docs/phase-1.md) on the development branch. Review the latest checks and unresolved findings before starting Phase 2. Keep the internship and original team attribution in the README.
