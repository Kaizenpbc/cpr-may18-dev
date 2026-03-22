# CPR Training Management System - Architecture Document

| Document Info | |
|---------------|---|
| **Version** | 2.0 |
| **Last Updated** | March 2026 |
| **Type** | Technical Architecture |

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Browser  │  │ Browser  │  │ Browser  │  │ Browser  │   ...      │
│  │(Org User)│  │(Instruct)│  │(Account) │  │ (Vendor) │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
└───────┼─────────────┼─────────────┼─────────────┼───────────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │ HTTPS (cpr.kpbc.ca)
                             v
┌─────────────────────────────────────────────────────────────────────┐
│              TMD HOSTING — Apache + CloudLinux Passenger            │
│                                                                     │
│  ┌──────────────────────────┐  ┌────────────────────────────────┐   │
│  │   React SPA (static)     │  │   Node.js/Express Backend      │   │
│  │   /public/ (Apache)      │  │   ESM, port 3001 (Passenger)   │   │
│  └──────────────────────────┘  └───────────────┬────────────────┘   │
└──────────────────────────────────────────────────┼───────────────────┘
                                                   │
                         ┌─────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              v                     v
   ┌─────────────────┐    ┌──────────────────────┐
   │  Neon PostgreSQL│    │  External: SMTP       │
   │  (cloud DB)     │    │  (Gmail / Nodemailer) │
   └─────────────────┘    └──────────────────────┘
```

**Note:** Redis is disabled. A no-op stub is in place (`backend/src/config/redis.ts`).
Socket.io is mounted but used only for real-time notifications — it uses HTTP long-polling
as primary transport for compatibility with Apache/Passenger.

### 1.2 Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | React 18, TypeScript, Vite, Material-UI | Built locally, deployed as static files |
| **Backend** | Node.js 20, Express, TypeScript (ESM) | Compiled with `tsc`, served via Passenger |
| **Database** | Neon PostgreSQL | Cloud-hosted, `pg` driver, connection pool |
| **Cache** | Redis (disabled) | Stub in place; sessions fall back to DB |
| **Real-time** | Socket.io | Polling + WebSocket; Apache-compatible |
| **Email** | Nodemailer (SMTP) | Gmail SMTP; requires SMTP_PASS in `.htaccess` |
| **Error monitoring** | Sentry (`@sentry/node`) | Active in production via SENTRY_DSN |
| **OCR** | Google Cloud Vision | Present in code; not configured in production |
| **File storage** | Local `uploads/` directory | No cloud storage in production |

---

## 2. Project Structure

```
cpr-jun21-dev/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts         # PostgreSQL pool (DATABASE_URL or DB_* vars)
│   │   │   ├── redis.ts            # No-op stub — Redis disabled
│   │   │   ├── sentry.ts           # Sentry init (dynamic import, graceful no-op)
│   │   │   ├── environmentConfig.ts# Env var validation & typed config
│   │   │   ├── encryptionConfig.ts # Field-level encryption helpers
│   │   │   └── sslConfig.ts        # SSL/TLS configuration
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts   # JWT verification, requireRole()
│   │   │   ├── rateLimiter.ts      # apiLimiter (100/15min), authLimiter (10/hr)
│   │   │   ├── inputSanitizer.ts   # Input validation (Zod schemas)
│   │   │   └── auditLogger.ts      # Audit trail logging
│   │   ├── routes/v1/
│   │   │   ├── index.ts            # Router assembly (~934 lines)
│   │   │   ├── auth.ts             # Login, logout, refresh, password reset
│   │   │   ├── instructor.ts       # Instructor portal routes
│   │   │   ├── organization.ts     # Organization portal routes
│   │   │   ├── course-requests.ts  # Course request management
│   │   │   ├── accounting.ts       # Accounting & invoices
│   │   │   ├── org-billing.ts      # Org-side billing
│   │   │   ├── vendor.ts           # Vendor portal routes
│   │   │   ├── vendor-invoice-admin.ts  # Admin vendor invoice management
│   │   │   ├── hr-dashboard.ts     # HR portal routes
│   │   │   ├── payRates.ts         # Instructor pay rates
│   │   │   ├── timesheet.ts        # Timesheet management
│   │   │   ├── payroll.ts          # Payroll processing
│   │   │   ├── sysadmin.ts         # Sysadmin operations
│   │   │   ├── sysadmin-entities.ts# Sysadmin entity management
│   │   │   ├── health.ts           # Health check
│   │   │   ├── notifications.ts    # Notification system
│   │   │   └── emailTemplates.ts   # Email template management
│   │   ├── services/
│   │   │   ├── emailService.ts     # Nodemailer wrapper
│   │   │   ├── pdfService.ts       # Invoice PDF generation
│   │   │   ├── ocrService.ts       # Google Cloud Vision (not prod-configured)
│   │   │   ├── cacheService.ts     # In-process cache (Redis fallback)
│   │   │   └── sessionManager.ts   # JWT session tracking
│   │   ├── utils/
│   │   │   ├── apiResponse.ts      # ApiResponseBuilder — standardised responses
│   │   │   ├── errorHandler.ts     # AppError, asyncHandler, error codes
│   │   │   ├── devLog.ts           # console.log suppressed in production
│   │   │   ├── jwtUtils.ts         # Token generation and verification
│   │   │   ├── tokenBlacklist.ts   # In-memory revoked token list
│   │   │   └── logger.ts           # Winston logger
│   │   ├── tests/
│   │   │   └── routes/
│   │   │       └── auth.test.ts    # Auth integration tests (51 tests)
│   │   └── index.ts                # Entry point — Sentry, middleware, routes, server
│   ├── dist/                       # Compiled output (deployed to server)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/portals/     # Role-based portal UIs (one per role)
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx     # Auth state, token management
│   │   │   └── ThemeContext.tsx    # MUI theme (CustomThemeProvider)
│   │   ├── services/api.ts         # Axios instance with interceptors
│   │   └── App.tsx                 # Router + context providers
│   └── package.json
│
├── docs/                           # Documentation
├── .github/                        # CI/CD workflows
└── package.json                    # Root workspace (npm workspaces)
```

---

## 3. Backend Architecture

### 3.1 Middleware Stack (in order)

```
HTTP Request
     │
     ▼
Sentry request handler       ← must be first
     │
     ▼
Helmet (security headers)
     │
     ▼
CORS
     │
     ▼
express.json / cookieParser
     │
     ▼
Morgan (HTTP request logging)
     │
     ▼
Rate limiters (apiLimiter / authLimiter per-route)
     │
     ▼
Routes
     │
     ▼
Sentry error handler         ← before global error handler
     │
     ▼
Global error handler (AppError → JSON)
```

### 3.2 Rate Limiting

| Limiter | Window | Limit | Applied to |
|---------|--------|-------|-----------|
| `apiLimiter` | 15 min | 100 (prod) / 1000 (dev) | All `/api/v1/*` routes |
| `authLimiter` | 1 hour | 10 (prod) / 100 (dev) | `/auth/login`, `/auth/forgot-password`, `/auth/recover-password`, `/auth/reset-password` |
| `registrationLimiter` | 24 hours | 3 | Registration endpoints |

### 3.3 API Routes

All routes are under `/api/v1/`:

```
/api/v1/
├── auth/                 # Login, logout, token refresh, password reset
├── instructor/           # Instructor portal
├── organization/         # Organization portal
├── course-requests/      # Course request lifecycle (admin + org views)
├── accounting/           # Invoices, payments, financial reports
├── org-billing/          # Org-facing billing views
├── vendor/               # Vendor portal
├── admin/vendor-invoices # Vendor invoice admin
├── hr/                   # Timesheets, pay rates, payroll
├── sysadmin/             # System administration
├── health/               # Health check (DB ping)
├── notifications/        # In-app notifications
└── email-templates/      # Email template management
```

### 3.4 Error Handling

All routes use `asyncHandler()` to catch async errors. Errors are thrown as `AppError`:

```typescript
throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Course not found');
```

Standard response shape:

```json
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "total": 42 } }

// Error
{ "success": false, "error": { "code": "RESOURCE_NOT_FOUND", "message": "Course not found" } }
```

Error codes live in `backend/src/utils/errorHandler.ts`.

---

## 4. Frontend Architecture

### 4.1 Provider Hierarchy

```
main.tsx
└── QueryClientProvider          (React Query — single instance)
    └── CustomThemeProvider      (MUI theme)
        └── AuthContext.Provider
            └── App.tsx
                └── Router
                    ├── LoginPage
                    └── RoleBasedRouter
                        ├── InstructorPortal
                        ├── OrganizationPortal
                        ├── AccountingPortal
                        ├── VendorPortal
                        ├── HRPortal
                        ├── CourseAdminPortal
                        ├── SuperAdminPortal
                        └── SystemAdminPortal
```

### 4.2 State Management

| State | Solution | Notes |
|-------|----------|-------|
| **Auth / user** | React Context (`AuthContext`) | Token + user profile; no localStorage for tokens |
| **Theme** | React Context (`ThemeContext`) | MUI CustomThemeProvider |
| **Server data** | React Query | Caching, refetch, pagination |
| **Form state** | React Hook Form | |
| **Notifications** | React Context | Toast messages |
| **Component state** | `useState` | Local UI state |

### 4.3 API Service Layer

`frontend/src/services/api.ts` — Axios instance:

- **Request interceptor**: attaches JWT access token from AuthContext (memory, not localStorage)
- **Response interceptor**: on 401 → calls `/auth/refresh` using httpOnly cookie, retries original request
- Refresh token is an **httpOnly, SameSite=Strict cookie** set by the server — never accessible to JS

---

## 5. Database Architecture

### 5.1 Connection

- Driver: `pg` (node-postgres)
- Config: `DATABASE_URL` env var (Neon connection string with SSL)
- Pool limits: max 10 connections, 30s idle timeout, 5s connection timeout
- Retry: `@lifeomic/attempt` — 3 attempts, exponential backoff

### 5.2 Key Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Companies using the system |
| `users` | All users — `role`, `organization_id`, `failed_login_attempts`, `locked_until` |
| `class_types` | Course type definitions |
| `course_requests` | Course request lifecycle |
| `invoices` | Organization billing |
| `vendor_invoices` | Vendor invoice management |
| `timesheets` | Instructor timesheet submissions |
| `payroll_payments` | Payment records |
| `email_templates` | Configurable email templates |
| `course_pricing` | Per-org pricing overrides |

### 5.3 ERD (simplified)

```
ORGANIZATIONS ──< USERS
      │
      └──< COURSE_REQUESTS >── USERS (instructor)
                 │
                 └──< INVOICES >── PAYMENTS

VENDORS ──< VENDOR_INVOICES

USERS (instructor) ──< TIMESHEETS
                   ──< PAYROLL_PAYMENTS
```

### 5.4 Multi-tenancy

All data is scoped by `organization_id`. Every query in organization-facing routes filters by `req.user.organizationId`. Super-admin and sysadmin roles may access cross-org data explicitly.

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
POST /auth/login
  → validate credentials
  → check account lockout (locked_until > NOW)
  → bcrypt verify password
  → on failure: increment failed_login_attempts; lock after 10 failures for 15 min
  → on success: reset failed_login_attempts
  → generate access token (JWT, 15 min) + refresh token (JWT, 7 days)
  → return access token in response body
  → set refresh token as httpOnly SameSite=Strict cookie
```

### 6.2 JWT Tokens

```javascript
// Access Token — 15 min, returned in response body
{
  "id": 123, "userId": "123", "username": "jane",
  "role": "accountant", "organizationId": 5,
  "iat": ..., "exp": ...
}

// Refresh Token — 7 days, httpOnly cookie only
{
  "userId": 123, "iat": ..., "exp": ...
}
```

### 6.3 Authorization Matrix

| Route prefix | orguser | instructor | courseadmin | accountant | hr | vendor | admin | sysadmin |
|---|---|---|---|---|---|---|---|---|
| `/organization/*` | ✓ | | | | | | ✓ | ✓ |
| `/instructor/*` | | ✓ | | | | | ✓ | ✓ |
| `/accounting/*` | | | | ✓ | | | ✓ | ✓ |
| `/admin/*` | | | ✓ | | | | ✓ | ✓ |
| `/hr/*` | | | | | ✓ | | ✓ | ✓ |
| `/vendor/*` | | | | | | ✓ | ✓ | ✓ |
| `/sysadmin/*` | | | | | | | | ✓ |

### 6.4 Security Headers (Helmet)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Cross-Origin-Embedder-Policy: require-corp
```

---

## 7. External Services

### 7.1 Email (Nodemailer / SMTP)

- **Current state**: email delivery not yet working in production (see EMAIL-1 in TODO.md)
- `emailService.ts` supports three transport modes (selected at startup):
  1. Authenticated SMTP — when `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS` all set
  2. Unauthenticated SMTP — when `SMTP_HOST` set but no credentials (e.g. localhost:25)
  3. Mock transporter — logs to console only (fallback when no SMTP config)
- **Next step**: configure `.htaccess` with `mail.kpbc.ca:587` + `noreply@kpbc.ca` credentials (mailbox exists)
- Used for: password reset, course confirmations, invoice notifications, overdue reminders

### 7.2 Sentry Error Monitoring

- Package: `@sentry/node` v8
- Init: dynamic `import()` in try/catch — app boots even if package missing
- Config: `SENTRY_DSN` in `.htaccess`
- Captures: uncaught exceptions, unhandled rejections, Express errors via `expressErrorHandler()`

### 7.3 OCR (Google Cloud Vision)

- Present in `backend/src/services/ocrService.ts`
- Not configured in production (no `GOOGLE_APPLICATION_CREDENTIALS` in `.htaccess`)
- Used for: extracting data from uploaded vendor invoice PDFs

---

## 8. Caching

Redis is **disabled**. The `cacheService.ts` uses an in-process Map-based cache as fallback:

- TTL-based eviction
- Not shared across Passenger worker processes
- Suitable for low-traffic single-worker deployment

When Redis is eventually enabled, set `REDIS_ENABLED=true` and provide `REDIS_URL`.

---

## 9. Real-time (Socket.io)

Socket.io is mounted at `/socket.io/` with transport order `['polling', 'websocket']` for compatibility with Apache reverse proxy. Used for:

- `notification:new` — push new notifications to connected clients
- `invoice:status` — invoice status changes
- `course:update` — course status changes

Connections authenticate via JWT passed in the handshake.

---

## 10. Deployment

### 10.1 Production Environment

```
TMD Hosting (cpr.kpbc.ca / 69.72.136.201)
├── Apache + CloudLinux Passenger
│   ├── .htaccess — Passenger config + all env vars (SetEnv)
│   └── server.js — ESM dynamic import() entry point
├── /public/                    ← React SPA static files (served by Apache)
└── /backend/dist/              ← Compiled Node.js backend (run by Passenger)

Neon PostgreSQL (cloud, GTACPR project)
```

### 10.2 Environment Variables (all set via `.htaccess` SetEnv)

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
JWT_SECRET=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
REFRESH_TOKEN_SECRET=...
JWT_RESET_SECRET=...
FRONTEND_URL=https://cpr.kpbc.ca
REDIS_ENABLED=false
BCRYPT_SALT_ROUNDS=12
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
SMTP_HOST=localhost        # pending EMAIL-1: change to mail.kpbc.ca
SMTP_PORT=25               # pending EMAIL-1: change to 587
SMTP_FROM=noreply@kpbc.ca  # mailbox created; add SMTP_USER + SMTP_PASS to activate
SENTRY_DSN=https://...@sentry.io/...
```

### 10.3 Deploy Process

```bash
# 1. Build backend
cd backend && npx tsc

# 2. Build frontend
cd frontend && VITE_API_URL=https://cpr.kpbc.ca/api/v1 npm run build

# 3. Upload backend dist files
curl --ftp-ssl --insecure -u "kaizenmo:<password>" \
  -T backend/dist/routes/v1/foo.js \
  ftp://69.72.136.201/cpr.kpbc.ca/backend/dist/routes/v1/foo.js

# 4. Upload frontend assets
curl --ftp-ssl --insecure -u "kaizenmo:<password>" \
  -T frontend/dist/index.html \
  ftp://69.72.136.201/cpr.kpbc.ca/public/index.html

# 5. Restart Passenger
curl -u "kaizenmo:<password>" -X POST \
  "https://69.72.136.201:2083/execute/Fileman/save_file_content" \
  --data-urlencode "dir=/home/kaizenmo/cpr.kpbc.ca/tmp" \
  --data-urlencode "file=restart.txt" \
  --data-urlencode "content=restart"
```

**WAF/AV note:** cPanel's WAF blocks large JS POST bodies and ClamAV blocks gzip-compressed JS. Always use FTPS (`curl --ftp-ssl`) to upload compiled `.js` files, not the cPanel file manager API.

**LVE process limits:** TMD shared hosting enforces a cap of 100 processes, 2GB RAM, 2 CPU cores per account. Passenger is configured with `PassengerMaxPoolSize 1` and `PassengerMinInstances 1` to pin to a single worker — Node.js's event loop handles concurrency within that process. Never run `npm install` or build tools on the server; always compile locally and FTPS-upload.

---

## 11. Monitoring & Observability

### 11.1 Health Check

Single endpoint: `GET /api/v1/health`

- Pings the database with `SELECT NOW()`
- Returns `{"status":"UP"}` (200) or `{"status":"DOWN","error":"..."}` (500)

### 11.2 Sentry

Active in production. Captures:
- Express route errors (via `expressErrorHandler`)
- `uncaughtException` and `unhandledRejection` process events
- Manual `captureException(err, context?)` calls

### 11.3 Logging

- **Winston** (`backend/src/utils/logger.ts`): structured file + console logging
- **Morgan**: HTTP request logging
- **devLog()** (`backend/src/utils/devLog.ts`): debug logs suppressed in `NODE_ENV=production`
- **Audit logger** (`backend/src/middleware/auditLogger.ts`): security event trail

---

## 12. Development Workflow

### 12.1 Local Setup

```bash
git clone <repo>
cd cpr-jun21-dev
npm install
# Create backend/.env with DATABASE_URL and JWT_SECRET etc.
npm run dev        # starts backend (port 3001) + frontend (port 5173)
```

### 12.2 Key Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start both servers |
| `npm run dev:backend` | Backend only |
| `npm run dev:frontend` | Frontend only |
| `npm run test` | Jest (51 tests across 4 suites) |
| `npm run lint` | ESLint |
| `npm run db:init` | Initialize DB schema |
| `npm run security:audit` | npm audit across all workspaces |
| `cd backend && npx tsc` | Compile backend |
| `cd frontend && npm run build` | Build frontend for production |

---

## 13. Related Documents

- [System Overview](./SYSTEM_OVERVIEW.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [User Guide](./USER_GUIDE.md)
- [Onboarding Guide](./ONBOARDING_GUIDE.md)
- [Invoice Approval Workflow](./invoice-approval-workflow.md)
