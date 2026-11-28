# Solaris backend and account access

Run `npm ci --legacy-peer-deps` on Node 24, copy `.env.example` to `.env`, start MongoDB and run `npm run dev:all`. The frontend proxies `/api` to the Express server on port 5000. Vercel forwards `/api` to the same application.

| Setting | Use |
| --- | --- |
| `MONGODB_URI` | Required on Vercel and in production. Local development defaults to `mongodb://127.0.0.1:27017/solaris_dheera`. An Atlas URL works as a server-only variable. |
| `TRUSTED_ORIGINS` | Comma-separated origins such as the HTTPS custom application domain. Use scheme and host without a trailing slash. Local port 3000 is allowed in development. The Vercel deployment and project production origins are included when Vercel supplies them. |
| `PORT` | Standalone Express listener, default 5000. If changed, adjust the development proxy accordingly. |
| `GROQ_API_KEY` | Optional server-side key for the existing assistant. Without it, the assistant returns rule-based answers. |
| `NODE_ENV` | Use `production` for production Express deployments. The session cookie requires HTTPS on Vercel and in production. |
| `MONGODB_URI_TEST` | Existing database suite. Use a disposable MongoDB database named `solaris_dheera_test`. |
| `SOLARIS_TEST_MONGO_PORT` | Local port for the API suite, default 27017. The suite creates and removes its own database. |

Sessions use a randomly generated token in an HttpOnly, SameSite=Lax cookie. The server stores a digest of that token in MongoDB and expires it after seven days. Logout deletes the matching session. The API reads the current role from the account on every protected request. Writes require a custom request header and requests with an Origin must match an allowed origin. The app and API use the same origin in normal operation.

The login, registration, assistant and selected write limits are backed by atomic MongoDB counters. Login and registration have an email and application-wide cap. The assistant has account and application-wide caps. These fixed windows are shared across server instances.

## Permissions

| API | Access |
| --- | --- |
| `GET /api/health` | Public liveness and connection state |
| `POST /api/auth/register`, `POST /api/auth/login` | Public with origin and request-header checks. Registration always creates a customer. |
| `GET /api/auth/session`, `POST /api/auth/logout` | Current session. Logout is idempotent. |
| `GET/POST /api/assessments`, `GET /api/assessments/latest` | Any account, limited to records owned by that account |
| `GET /api/support/requests` | Customers see their own records. Employees and administrators can view owned tickets to provide support. |
| `POST /api/support/requests` | Any account can submit under its own account ID. |
| `PATCH /api/support/requests/:ticketId/status` | Employees and administrators, for owned tickets |
| `GET /api/community`, `PATCH /api/community/members/:id/status` | Employees and administrators managing the configured roster |
| `POST /api/community/reset` | Retired. The route returns 410 for authorized staff. |
| `POST /api/optimiser/solve`, `GET /api/optimiser/runs` | Employees and administrators managing the shared cohort |
| `GET /api/audit-logs` | Administrators |
| `POST /api/ai/assistant` | Signed-in accounts. Requests are rate-limited. |

Staff register normally, then a database operator verifies the account off-platform and updates that exact account's `role` to `employee` or `admin`. The operator should revoke the account's existing sessions as part of a privilege change. There is no browser or API action for role elevation. Audit entries use the authenticated account ID. Application restrictions on audit mutation do not prevent changes by a privileged database operator.

## Demonstration and older records

The public calculator runs locally. Saving requires sign-in. The installation, generation and savings pages illustrate the reference installation. Staff pages use their configured roster and show a loading or error state when persisted data is unavailable. For a local demonstration roster, point `MONGODB_URI` to a disposable database ending in `_demo` and run `npm run seed:demo` before starting the server. This command is disabled in production.

Browser-only accounts must register again with a new password. The frontend discards the previous browser credential store. Planning preferences remain local to the browser and are keyed by the account ID.

Existing assessments and support tickets without an owner are retained and omitted from the account workflows. To migrate them, first back up the collections and build a verified mapping of individual document IDs to account IDs. Rehearse on a copy, update only mapped ownerless documents, and retain the changed ID list for rollback. Rollback should remove the owner field only from records assigned by that migration. Never infer ownership from a name, an account number supplied in the app, or a newly registered email.

## Checks

Run `npm run lint`, `npm run test:all` and `npm run build`. The GitHub Actions workflow supplies disposable MongoDB. The Groq provider tests use mocked responses and do not verify a live provider account. The API and primary writes can succeed independently of audit writes if MongoDB fails between the two operations. Review that boundary before relying on audit records for transactional guarantees.
