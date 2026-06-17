# CPR Training Management System - TODO List

## 🔧 **Technical Debt & Configuration**

### **Database Configuration**
- [ ] **Standardize database naming**: Rename `cpr_may18` to `cpr_training` for production consistency
- [ ] **Environment configuration**: Create proper `.env` files for different environments (dev, staging, prod)
- [x] **Analytics sample data generation** — code no longer exists; crash was already cleaned up
- [x] **Connection pooling optimization** — pool limits set (max 20, 30s idle, 10s conn timeout, queue limit 100, keepalive enabled)
- [x] **email_sent_at column** — column exists in DB; accounting.ts already uses it correctly
- [x] **Payments table structure** — payments table has invoice_id; payment tracking works correctly

### **Error Handling & Monitoring**
- [x] **Server health monitoring** — GET /api/v1/health pings DB, returns UP/DOWN
- [x] **Database connectivity alerts** — Sentry captures DB errors in production
- [x] **Error logging** — Winston logger + Morgan + Sentry active
- [ ] **Performance monitoring** — Sentry has basic APM; Prometheus not implemented

## 🚀 **Deployment & Infrastructure**

### **Production Readiness**
- [x] **SSL/TLS** — Apache handles HTTPS termination; HSTS enabled
- [x] **Environment variables** — all secrets in .htaccess SetEnv; not in code
- [ ] ~~Docker containerization~~ — not applicable (TMD Hosting / Passenger)
- [x] **CI/CD pipeline** — GitHub Actions CI runs tsc + vitest on push (backend + frontend jobs); deploy is manual FTPS
- [ ] ~~Load balancing~~ — not applicable on shared hosting
- [ ] **🔴 Hosting resource limits (HOSTING-1)**: TMD confirmed LVE cap: **100 processes, 2GB RAM, 2 CPU cores**. Running multiple Node.js apps simultaneously hits the process limit → 503 errors (seen 2026-03-15). Options:
  - **Option A**: Manage carefully — only run CPR app on this account; avoid opening extra Node.js processes during deploy.
  - **Option B (recommended at scale)**: Upgrade to TMD Managed VPS — no process limits, dedicated resources, full root access. Do this before onboarding multiple paying customers simultaneously.
- [x] **🔴 Database backup SLA (BACKUP-1)**: Daily `mysqldump` cron running at 2 AM via `/home/kaizenmo/backup-cpr.sh` — 7-day rotation confirmed. Backup log shows successful runs 2026-04-14 and 2026-04-15.
  - [ ] **BACKUP-2 (offsite)**: Both backups are on the same server — if TMD server fails, backups are lost. Add offsite copy: push `cpr_*.sql.gz` to an FTP/S3/B2 destination after each successful dump. Do before scaling.

### **Security Enhancements**
- [ ] **🟡 Switch to dedicated noreply mailbox (EMAIL-2)**: Currently using `michaela@kpbc.ca` as SMTP sender (temporary). Create a dedicated `noreply@kpbc.ca` mailbox in cPanel, update `.htaccess` `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` to use it, and restart Passenger.
- [ ] **🟡 Confirm email delivery (EMAIL-1)** *(deferred)*: SMTP updated to `mail.kpbc.ca:587` using `michaela@kpbc.ca` (deployed 2026-03-18). API returns `RESET_SENT` but delivery to `kpbcma@gmail.com` unconfirmed. **Next step**: check inbox/spam for the test reset email; if not received, investigate TMD mail logs via cPanel → Email → Track Delivery, or try an alternate recipient. May need SPF/DKIM records checked for `kpbc.ca`.
- [x] **🟡 Re-enable rate limiting (RATELIMIT-1)**: All three limiters confirmed active — `authLimiter` on login/forgot-password/recover/reset (20 req/15min); `registerLimiter` on /auth/register; `apiLimiter` on all /api/v1 routes.
- [x] **🟡 Fix billing lifecycle inconsistency (BUG-2)**: `PUT /accounting/invoices/:id/approval` auto-sets `posted_to_org=TRUE`, but `PUT /accounting/invoices/:id/post-to-org` requires `posted_to_org=FALSE` to run. These two paths are mutually exclusive. The PDF/email is only sent via post-to-org — approval silently skips it. Accountant must manually call `POST /accounting/invoices/:id/email` after approving. Fix: approval should NOT set `posted_to_org=TRUE`; that should remain the post-to-org endpoint's responsibility.
- [x] **🟡 Fix vendor dashboard non-standard response (BUG-3)**: `GET /vendor/dashboard` returns a raw object `{pendingInvoices, totalInvoices, ...}` instead of the standard `{success: true, data: {...}}` wrapper used by every other endpoint. Frontend may handle this inconsistently.
- [x] **🟡 Fix sysadmin POST /vendors ignoring contactEmail (BUG-4)**: `POST /sysadmin/vendors` only maps `email` or `contact_email` from request body — camelCase `contactEmail` is silently ignored. Created vendors have null contact_email, breaking vendor portal profile/dashboard lookup (which queries `WHERE contact_email = $1`).
- [x] **Input validation** — inputSanitizer with Zod schemas
- [x] **Security headers** — Helmet with full CSP, HSTS, X-Frame-Options
- [x] **Audit logging** — auditLogger.ts active
- [x] **Password policies** — validation on reset/change
- [x] **Session management** — httpOnly cookies, token blacklist, login lockout after 10 attempts
- [x] **🔴 Fix sysadmin/courses POST 500 (BUG-1)**: `null value in column "duration_minutes" of relation "class_types"` — sysadmin course creation crashes. Investigate `class_types` insert in `sysadmin.ts` / `sysadmin-entities.ts`; ensure `duration_minutes` is required in the request body or has a DB default.
- [x] **🔴 Terms of Service page (LEGAL-1)**: Privacy policy exists at `/privacy` but no ToS/Service Agreement. Required before taking money. Add `/terms` page and link it alongside the privacy policy on the login screen.
- [x] **🔴 Org data isolation audit (SECURITY-2)**: Audited all 67 routes across 4 files. Fixed 9 issues: 8 unauthenticated/unscoped course-admin routes in `course-requests.ts` (added `authenticateToken` + `requireRole`), 1 fetch-before-check in `org-billing.ts` (moved org scope into WHERE clause).
- [x] **🔴 Multi-tenant isolation pentest (SECURITY-3)**: Black-box pentest completed (2026-06-15) against production. Tested: IDOR via query params and path params, cross-role escalation (org→sysadmin/admin/accounting, instructor→admin), mutation attacks, SQL injection, XSS, JWT forgery, no-auth access, CORS. All blocked — org scoping enforced via `request.userOrgId` in WHERE clauses, role middleware blocks unauthorized access.
- [ ] **🔴 Customer MSA / contract (LEGAL-2)**: No signed agreement exists for paying customers. Required before taking money. Must cover: scope of service, data ownership, liability limits, acceptable use, payment terms, and termination. Draft a B2B Master Service Agreement or SaaS subscription terms.
- [ ] **🔴 PIPEDA breach notification SOP (LEGAL-3)**: PIPEDA requires notifying the Privacy Commissioner and affected individuals of a data breach within a reasonable time (de facto 72 hours). No procedure exists. Define: detection → assessment → notification steps, who is responsible, and what records must be kept. Document before first paying customer.
- [x] **🟡 Staging environment (OPS-2)**: Staging live at https://stagecprapp.kpbc.ca — Fastify 5 port with hourly auto-deploy from GitHub (`deploy-staging.sh` at `:18`). Frontend built locally, uploaded via cPanel API. Force-deploy possible via one-time cron or FTPS `restart.txt` touch.
- [ ] **🟡 Customer onboarding flow (ONBOARD-1)**: Currently sysadmin manually creates orgs and users — no self-signup or invite flow. Fine for early customers; document the manual process and decide if/when to build self-serve onboarding.
- [x] **🟡 Uptime monitoring (OPS-1)**: UptimeRobot monitor active on `https://cpr.kpbc.ca/api/v1/health` — alerts kpbcma@gmail.com every 5 minutes.
- [x] **Revisit npm audit vulnerabilities**: Ran `npm audit fix` — picomatch high-severity ReDoS fixed. Remaining: 6 low + 5 moderate (all dev tooling: `esbuild`/`vite`/`@google-cloud/storage`) — require breaking-change upgrades. Revisit when upgrading Vite or Google Cloud Storage.

## 📊 **Features & Enhancements**

### **Analytics & Reporting**
- [ ] **Real-time dashboards**: Add live data updates using WebSockets
- [ ] **Export functionality**: Add PDF/Excel export for reports
- [ ] **Custom date ranges**: Allow custom date range selection in analytics
- [ ] **Comparative analytics**: Add year-over-year comparison features
- [ ] **Predictive analytics**: Implement demand forecasting

### **User Experience**
- [ ] **Mobile responsiveness**: Optimize for mobile devices
- [ ] **Offline support**: Add offline capabilities with service workers
- [ ] **Push notifications**: Implement browser push notifications
- [ ] **Dark mode**: Add dark theme option
- [ ] **Accessibility**: Ensure WCAG 2.1 AA compliance
- [ ] **Multi-language support**: Add internationalization (i18n)

### **Business Features**
- [ ] **🟡 OCR receipt scanning (OCR-1)**: Google Cloud Vision integration existed in Express production but was not ported to Fastify. Re-implement if customers use receipt/document scanning. Requires `@google-cloud/vision` + service account key.
- [ ] **🟡 WebSocket real-time updates (WS-1)**: socket.io existed in Express production but was not ported to Fastify. Re-implement with `@fastify/websocket` if real-time dashboard updates are needed. Low priority — polling works for current user count.
- [x] **🟡 Sentry error monitoring (SENTRY-1)**: Ported to Fastify — dynamic import with graceful fallback. `@sentry/node` v10, DSN in production .htaccess. Captures unhandled 500 errors with request context.
- [ ] **Email notifications**: Automated email alerts for course status changes
- [ ] **SMS notifications**: Text message alerts for urgent updates
- [ ] **Calendar integration**: Sync with Google Calendar/Outlook
- [ ] **Document management**: File upload and storage for certificates
- [ ] **Payment integration**: Add online payment processing
- [ ] **Recurring courses**: Support for recurring training schedules

### **Commercialization**
- [ ] **🔴 SaaS pricing & billing model (BIZ-1)**: How do you charge customers? Options: manual invoicing, Stripe subscriptions, per-org flat fee. Decision affects whether app needs a subscription management UI. Decide before first paying customer.
- [ ] **🔴 Offboarding / cancellation policy (BIZ-2)**: If a customer stops paying, what happens to their data? PIPEDA requires a clear answer. Define: notice period, data export window, deletion timeline. Document in ToS and implement in sysadmin tools.
- [ ] **🟡 Demo / trial environment (BIZ-3)**: No way for prospects to try the app before buying. Options: shared demo org with sample data, or a sandboxed trial account flow. Needed once you start selling actively.
- [ ] **🟡 Support channel (BIZ-4)**: No defined support process. At minimum: a support email address, expected response time, and a process for you to investigate issues. Document before first paying customer.
- [ ] **🟡 Data export for customers (BIZ-5)**: Customers cannot export their own data (courses, rosters, invoices) as CSV or PDF. Required for PIPEDA data portability and expected by B2B customers. Add export endpoints and UI per portal.
- [ ] **🟡 Per-org branding / white-label (BIZ-6)**: All orgs see "CPR Training Portal." B2B customers may expect their name/logo. Decide if white-labeling is part of the offering; if yes, add org logo upload and name override.
- [ ] **🟢 Audit log visibility for admins (BIZ-7)**: Audit trail exists internally but no UI to view it. Paying customers (especially larger orgs) may want to see who did what. Add a read-only audit log view in the admin portal.

### **Student Data & LMS**
- [x] **Students master table** — `students` table with email-based dedup, org FK, marketing consent flag. Write-through on org roster upload and instructor add. Backfill migration links existing `course_students` to master records. `StudentRepository` with findOrCreate, bulk ops, search, course history. 9 unit tests.
- [x] **Student Directory (sysadmin)** — `StudentManagement.tsx` in sysadmin portal: debounced search by name/email, sortable table (name, email, phone, org, course count, last course date, marketing consent), course history detail dialog, inline edit (name/phone/notes), consent toggle. Backend: 4 endpoints (`GET/PUT /sysadmin/students`, `GET/PUT /sysadmin/students/:id`). Deployed to staging + production.
- [x] **Certification expiry tracking** — `class_types.certification_validity_months` (per course type), `course_students.certificate_number/issued_at/expires_at` with index. Migrations v8-v10 (schema + backfill). Instructor attendance auto-populates cert dates. API: `GET /sysadmin/certifications/expiring?days=N`, `/expired`, `/stats`. `CertificationTracking.tsx` in sysadmin portal: stats cards (active/expiring 30d/90d/expired), expiring/expired toggle, time window filter, color-coded chips. Student course history shows cert status column. Course CRUD includes validity months. Deployed to staging + production.
- [ ] **Certification renewal reminder emails** — Use cert expiry data + `sendCertificateEmail()` to auto-send renewal reminders. Requires cron or scheduled job + reminder dedup via `email_reminders` table. Revenue driver for orgs.
- [ ] **LMS integration** — Capture online course evaluations from home-grown LMS into `student_evaluations` table (score, pass/fail, attempts, time spent). Link to `students` master record. Phase 2 after LMS architecture is decided.
- [ ] **Student marketing emails** — Use `students.marketing_consent` + certification expiry data to send renewal reminders. Requires PIPEDA consent opt-in flow.
- [ ] **WSIB reporting** — Cross-course training history per student for WSIB compliance. Data model complete; needs reporting UI/export.

### **Billing & Invoicing**
- [x] **Configurable per-organization invoice numbers** — `InvoiceNumberService` with atomic `SELECT FOR UPDATE` allocation, format tokens ({PREFIX}, {YYYY}, {YY}, {MM}, {DD}, {N+}), reset policies (none/yearly/monthly), admin CRUD endpoints (GET/PUT/DELETE `/accounting/invoice-sequences`), preview endpoint, migration v3 (`invoice_number_sequences` table), 14 unit tests. Fallback to `INV-YYYY-NNNNNNNN` when no org sequence configured.

## 🧪 **Testing & Quality Assurance**

### **Automated Testing**
- [ ] **Unit tests**: Achieve 80%+ code coverage (currently: 87 backend + 5 frontend = 92 vitest tests covering AuthService, BillingService, HRService, billing lifecycle, InvoiceNumberService, StudentRepository)
- [x] **Integration tests** — 51 tests across 4 suites (auth, lockout, reset, recovery)
- [x] **End-to-end tests** — Playwright suite on staging (2026-06-15): auth.spec.ts + portal.spec.ts cover login, role redirect, dashboard load, navigation, logout for all 8 roles. **36 passed, 0 skipped, 0 failed.** Run: `npx playwright test --project=chromium`.
- [ ] **Performance tests**: Load testing for concurrent users
- [ ] **🟡 Penetration test (SEC-PENTEST-1)**: Before scaling to 5+ customers, engage a freelance pentester or run Burp Suite against the production API. Focus areas: auth bypass, IDOR across org boundaries, rate limit bypass, injection, session fixation. Document findings and fixes.
- [ ] **Security tests**: Automated vulnerability scanning

### **Code Quality**
- [ ] **Code review process**: Establish peer review requirements
- [x] **Linting rules** — ESLint configured with pre-commit hook
- [x] **Type safety** — TypeScript strict mode enabled frontend + backend
- [x] **Documentation** — inline code docs partial; OpenAPI/Swagger auto-generated at `/api/v1/docs`
- [x] **API documentation**: OpenAPI 3.0.3 via `@fastify/swagger` + `@fastify/swagger-ui` — 22 tags, 181 paths, JWT bearer auth scheme, auto-tagged by route prefix
- [x] **🟡 Document PIPEDA endpoints in API docs (API-PRIVACY-1)**: `GET /auth/my-data` documented in `docs/API_DOCUMENTATION.md`; `DELETE /auth/my-data` was removed (5-year retention).
- [x] **🟡 Fix login error message not showing (BUG-5)**: Fixed in `frontend/src/services/api.ts` interceptor — login 401s now reject the promise without calling `forceLogout()`, allowing Login.tsx catch block to call `setError()` and render the alert.
- [x] **🟡 Frontend: "Download My Data" button (UI-DOWNLOAD-1)**: Added to Security Settings card in `InstructorProfile.tsx` — calls `GET /auth/my-data` and downloads the response as `my-data.json`.
- [ ] **🟡 Email: Confirm delivery working (EMAIL-1)**: SMTP set to `mail.kpbc.ca:587` via `michaela@kpbc.ca`. Confirm actual email delivery by triggering a password reset and checking the inbox at kpbcma@gmail.com.
- [ ] **🟡 Email: Switch to dedicated noreply mailbox (EMAIL-2)**: Create `noreply@kpbc.ca` in cPanel, update `.htaccess` `SMTP_USER/SMTP_PASS/SMTP_FROM`, restart Passenger.

## 📋 **Operational Tasks**

### **Maintenance**
- [ ] **Dependency updates**: Regular security updates for npm packages
- [ ] **Database maintenance**: Regular VACUUM and ANALYZE operations
- [ ] **Log rotation**: Implement log file rotation and archival
- [ ] **Performance tuning**: Database query optimization
- [ ] **Capacity planning**: Monitor and plan for scaling needs

### **Incident Response**
- [ ] **🟡 Incident response process (OPS-2)**: No documented process for outages. Define: who gets alerted (OPS-1 uptime monitor), how to diagnose (check Sentry, health endpoint, Passenger logs via cPanel), how to restart (touch tmp/restart.txt), escalation path if unresolvable. Document in DEPLOYMENT_GUIDE.md.
- [ ] **🟡 Offboarding runbook**: When a customer churns, document the step-by-step: disable org users, export their data, anonymise PII per PIPEDA retention schedule, notify them. Ties to BIZ-2.

### **Compliance & Governance**
- [x] **PIPEDA compliance (PRIVACY-1)**:
  - [x] Privacy policy page at /privacy (live)
  - [x] Retention schedule documented (7yr course/payment, 2yr after account closure)
  - [x] Right-to-deletion: DELETE /sysadmin/users/:id/personal-data (anonymises PII)
  - [ ] Consent checkbox on signup form (if self-signup is ever added)
  - [ ] Cookie consent banner (if analytics/tracking added)
- [ ] **Data retention enforcement** — policy is documented; automated purge of old records not yet implemented
- [ ] **GDPR compliance** — covered by PIPEDA policy for now; revisit if EU customers
- [ ] **Backup testing**: Regular backup restoration testing
- [ ] **Disaster recovery**: Document and test DR procedures
- [ ] **Change management**: Formal change approval process

## 🎯 **Priority Levels**

### **🔴 Must do before first paying customer**
1. ~~**EMAIL-1**~~ ✅ Email delivery working via Resend (noreply@kpbc.ca)
2. ~~**BACKUP-1**~~ ✅ Daily mysqldump cron running, 7-day rotation confirmed — **BACKUP-2** (offsite copy) deferred
3. ~~**BUG-1**~~ ✅ Fixed sysadmin/courses POST 500
4. ~~**LEGAL-1**~~ ✅ Terms of Service page live at `/terms`
5. ~~**SECURITY-2**~~ ✅ Org data isolation audit complete — 9 issues fixed
6. ~~**SECURITY-3**~~ ✅ Multi-tenant pentest passed — IDOR, role escalation, SQLi, XSS, JWT forgery all blocked
7. **BIZ-1** — Decide SaaS pricing & billing model *(deferred — options: flat monthly fee, per-student, per-course, or manual invoicing for early customers)*
7. **BIZ-2** — Define offboarding / cancellation policy *(deferred — ToS already covers 30-day notice, 30-day data export window, then anonymization; formalize as internal process when first customer churns)*

### **🟡 Medium Priority**
- ~~**EMAIL-1**~~ ✅ Email delivery confirmed via Resend API on staging (noreply@kpbc.ca, domain verified)
- ~~**EMAIL-2**~~ ✅ Staging uses dedicated noreply@kpbc.ca via Resend (production still uses michaela@kpbc.ca SMTP — switch when migrating)
- **UI-DOWNLOAD-1** — Build "Download My Data" button in user account settings (backend `GET /auth/my-data` exists)
- **RATELIMIT-1** — Verify/tune rate limiters before scaling; authLimiter IS active on login (20/15min)
- **HOSTING-1** — Plan VPS upgrade before multiple concurrent paying customers
- **ONBOARD-1** — Customer onboarding flow (self-serve or documented manual process)
- **API-PRIVACY-1** — Update API docs: document GET /auth/my-data, remove DELETE /auth/my-data entry
- **BACKUP-2** — Offsite copy of MySQL backups (both copies currently on same TMD server)
- Mobile responsiveness
- **OPS-1** — Uptime monitoring (UptimeRobot on `/api/v1/health`) ✅ already active — verify monitor still running
- Data retention enforcement (auto-purge old records)
- ~~End-to-end (Playwright) tests~~ ✅ 36/36 passing on staging (2026-06-15)
- ~~Custom invoice number sequences per org~~ ✅ InvoiceNumberService deployed
- ~~Certification expiry tracking~~ ✅ Migrations v8-v10, auto-populate on attendance, sysadmin dashboard + stats

### **🟠 Enterprise Grade (9/10) — Remaining from Code Review**
- [x] **T-1/T-2**: Unit tests — 39 backend tests (AuthService 11, BillingService 16, HRService 12) + 5 frontend tests. Vitest with ESM mocking, DB pool mocks. Also caught and fixed HRService "rejectd" typo bug.
- [x] **T-3**: Integration tests — 25 billing lifecycle tests: createInvoice (calculation, format, guards), postToOrg (archive, guards), fixCalculations, pricing CRUD, negative payment rejection, full flows (create→approve→post→pay, reject→resubmit, partial payments).
- [x] **D-1**: CI/CD pipeline — `.github/workflows/ci.yml` with backend + frontend jobs (checkout → npm ci → tsc --noEmit → vitest run). Frontend job also runs vite build. `ROLLBACK.md` documents rollback procedure.
- [ ] **R-1**: Monitoring/alerting infrastructure — metrics (p99 latency, error rates, DB pool utilization), dashboards, PagerDuty/alerting beyond UptimeRobot
- [ ] **R-2**: Backup strategy verification — offsite backups (S3/B2), automated restore testing, documented RTO/RPO

### **🟢 Low Priority / Future**
- Multi-language support
- Predictive analytics
- ~~OpenAPI/Swagger docs~~ ✅ Live at `/api/v1/docs`
- Calendar integration (Google/Outlook)

---

## 🔄 **Fastify 5 Staging Port**

### **Status**: CUTOVER COMPLETE (2026-06-15) — Fastify 5 now running on production (cpr.kpbc.ca)
- Staging remains live at https://stagecprapp.kpbc.ca for testing
- **Repo**: https://github.com/Kaizenpbc/cpr-fastify (public)
- **Auto-deploy**: Hourly cron at `:18` pulls master, builds backend via tsc, deploys
- **Frontend**: Built locally (server OOM on vite/esbuild), uploaded via cPanel Fileman API

### **QA Results (2026-06-14)**
- **76+ GET endpoints tested** — all pass across admin, sysadmin, instructor, accountant, organization, HR, courseadmin, vendor portals
- **23 POST/PUT/DELETE mutations tested** — all pass (auth, CRUD, scheduling, billing, notifications, profile changes)
- **Edge cases tested** — invalid input (validation errors), expired tokens (401), wrong roles (403), CORS headers, CSP headers
- **6 bug-fix commits** pushed during QA:
  1. Removed `deleted_at` references from users/organizations tables (use `status` column instead)
  2. Fixed duplicate `status` field in Organization interface
  3. Removed `rejected_by` column references from vendor-admin queries
  4. Disambiguated `amount` column in org dashboard query
  5. Disabled soft-delete on `profile_changes`/`course_students` tables
  6. Added `requireAuth` to change-password, fixed courseadmin column names
- **DB migrations run**: Created `organization_pricing` table; added missing columns to `vendor_invoices`, `instructor_pay_rates`, `pay_rate_history`, `notifications`, `notification_preferences`

### **Ported Features (2026-06-14 — 2026-06-15)**
- [x] **Email sending** — `EmailService` with Resend API (`noreply@kpbc.ca`), 12 template methods, PDF attachment support, reminder dedup via `email_reminders` table, test-send endpoint, domain verified (DKIM + SPF + MX)
- [x] **PDF generation** — `PDFService` with pdfkit: invoice PDF, payment receipt, certificate (landscape A4 with border). Endpoints in `org-billing.ts` and `billing.ts` for org/accounting download + HTML preview
- [x] **File uploads** — `@fastify/multipart` registered (10MB limit). Vendor invoice submit (`POST /vendor/invoices`) accepts multipart with optional PDF file, saves to `uploads/vendor-invoices/`. Student CSV upload was already ported (frontend parses CSV, sends JSON)
- [x] **Vendor invoice PDF download** — `GET /vendor/invoices/:id/download` generates PDF from DB data, with vendor/staff authorization check

### **All Features Ported** — staging is feature-complete vs production
- [x] **Playwright E2E tests** — 36 tests across all 8 portals (4 auth + 32 portal: login/redirect/dashboard/nav/logout per role). Rate-limit resilient with 429 retry, lazy-load tolerant (30s timeouts). Run: `npx playwright test --project=chromium`. Result: **36 passed, 0 skipped, 0 failed.**

## 📝 **Recent Changes**

### **2026-06-17**
- **CERTIFICATION EXPIRY TRACKING**: Migrations v8-v10: `class_types.certification_validity_months`, `course_students` cert fields (number, issued_at, expires_at + index), backfill for attended students. Instructor attendance auto-populates cert dates. 3 API endpoints (expiring, expired, stats). `CertificationTracking.tsx` sysadmin page: stats cards, expiring/expired views, time window filter. Student course history shows cert status column. CourseManagement form maps validity period to DB. Deployed to staging + production.

### **2026-06-16**
- **STUDENTS MASTER TABLE**: `students` table with email-based dedup, org FK, marketing consent. Write-through on roster upload (org + instructor paths). Backfill migration (v7) links existing course_students. `StudentRepository` with findOrCreate, bulk ops, search, course history. 9 unit tests.
- **STUDENT DIRECTORY**: Sysadmin portal Student Directory page — debounced search, course history view, inline edit, consent toggle. `StudentManagement.tsx` + 4 API endpoints + `sysAdminApi` methods. Deployed to staging + production.
- **AUTH FIX**: Fixed production/staging auth — all Bearer token requests returned 401. Root cause: `token_blacklist` table was created manually before migration system, missing `invalidated_at` column. `isTokenBlacklisted()` threw, caught by generic catch in `requireAuth`. Fix: migration v4 adds column + `requireAuth` separates JWT errors from blacklist DB errors (fail-open on DB error).
- **INVOICE NUMBERS**: Configurable per-org invoice number sequences — `InvoiceNumberService` with atomic allocation (`SELECT FOR UPDATE`), format tokens ({PREFIX}, {YYYY}, {YY}, {MM}, {DD}, {N+}), reset policies (none/yearly/monthly), admin CRUD + preview endpoints, migration v3, 14 unit tests. BillingService updated to use allocator.
- **API DOCS**: OpenAPI 3.0.3 Swagger UI at `/api/v1/docs` — `@fastify/swagger` + `@fastify/swagger-ui`, 22 tags, 181 paths, JWT bearer auth, auto-tagged by route prefix via `onRoute` hook.
- **T-3 BILLING TESTS**: 25 integration tests covering full revenue path (createInvoice, postToOrg, fixCalculations, pricing CRUD, partial payments, reject/resubmit flow). Total: 92 vitest tests (87 backend + 5 frontend).
- **ROUTE FIXES**: Fixed student upload/get API mismatch (frontend→backend path alignment). Consolidated dual course-creation and dual assign-instructor routes through CourseService (adds duplicate detection, conflict checking, transaction safety).
- **DEPLOY FIX**: Fixed both `deploy-production.sh` and `deploy-staging.sh` — added `git checkout -- .` before `git pull` to handle lockfile drift on server.

### **2026-06-15**
- **CODE REVIEW**: Enterprise-grade review completed — 86 findings (12 critical, 21 high, 29 medium, 24 low). Production readiness score: 4.5/10 → estimated 6-7/10 after Phase A-E fixes.
- **CODE REVIEW PHASES A-E COMPLETE**:
  - **Phase A (Security)**: AuthError 500→401, IDOR fixes, password_hash leak, billing role checks, SSE auth
  - **Phase B (Architecture)**: Double Bearer fix, API client consolidation, account lockout, token blacklist, HTTP access logging, deep health check
  - **Phase C (Testing)**: Vitest infrastructure + 44 unit tests (AuthService 11, BillingService 16, HRService 12, frontend 5). Fixed HRService "rejectd" bug. Fixed frontend crypto mock, stale test exclusions.
  - **Phase D (DevOps)**: GitHub Actions CI (`ci.yml`), versioned DB migrations (`schema_migrations` table), request correlation IDs (`x-request-id`), client-side error reporting (`POST /client-errors`), `ROLLBACK.md`
  - **Phase E (Frontend Polish)**: Deleted dead code (`ErrorBoundary.tsx` duplicate, `socketService.ts`, Socket.IO from RealtimeContext), lazy-loaded Monaco Editor, dev-only logging (AuthContext 35 console calls gated behind `import.meta.env.DEV`), DB pool increased (10→20), React Query defaults (staleTime 30s, gcTime 5min)
- **SECURITY (Phase 1)**: Fixed AuthError 500→401, IDOR on calculate-balance/vendor invoices, password_hash leak, billing role checks, SSE auth
- **SECURITY (Phase 2)**: Added Zod validation to 11 unvalidated routes, removed PII from frontend console.log, externalized test credentials, removed hardcoded default password, fixed process.env bypasses, fixed staging error leakage, fixed instructor timesheet IDOR
- **ARCHITECTURE (Phase 3)**: Fixed double Bearer prefix, consolidated API clients, added account lockout (5 attempts/15min), token blacklist on password change, HTTP access logging, deep health check with DB verification
- **PRODUCTION (Phase 4)**: Revenue report 24→2 queries, batch student INSERT, DB pool hardening (connectTimeout/queueLimit), email API 15s timeout, structured logging in EmailService, shutdown timeout, token expiry format validation, fixed findByRole
- **PRODUCTION CUTOVER**: Replaced Express with Fastify 5 on `cpr.kpbc.ca`. All 8 roles verified. Auto-deploy cron switched from Express repo to `cpr-fastify` repo. Email switched from Gmail SMTP to Resend API (noreply@kpbc.ca). Express backup preserved in `dist-backup/`.
- **EMAIL**: Ported EmailService with Resend API — 12 templates, PDF attachments, domain verified (DKIM/SPF/MX for kpbc.ca)
- **PDF**: Ported PDFService with pdfkit — invoice, receipt, certificate generation + download/preview endpoints
- **UPLOADS**: Added vendor invoice file upload via `@fastify/multipart` — multipart form data with optional PDF, backward-compatible with JSON
- **DOWNLOAD**: Added vendor invoice PDF download endpoint with authorization checks
- **E2E TESTS**: Playwright suite complete — 36 tests (4 auth + 32 portal), **36 passed, 0 skipped, 0 failed**. Fixed lazy-load spinner timeouts, eliminated all skips by using portal-specific selectors for each role's nav/logout UI
- **DOCS**: Added Customer Onboarding guide (pricing model, offboarding policy, MSA outline, PIPEDA breach SOP)
- **TODO**: Added OCR-1, WS-1, SENTRY-1 for features not ported from Express
- **SECURITY**: SECURITY-3 multi-tenant pentest passed — IDOR, role escalation, SQLi, XSS, JWT forgery, CORS all blocked on production
- **SENTRY**: Added @sentry/node v10 to Fastify backend — dynamic import with graceful fallback if not installed
- **DOCS**: Added `docs/Production_Cutover.md` — full technical details of Express→Fastify cutover, rollback procedure, env vars, verification steps
- **DOCS**: Generated `docs/CPR_Technical_Design_Document.docx` — 13-section Word document for programmer handover (system overview, infrastructure, backend/frontend architecture, DB schema, services, ~145-endpoint API reference, security model, testing, operations)

### **2026-06-14**
- **QA**: Comprehensive API-level QA of Fastify staging — 76+ GET, 23 mutations, edge cases all passing
- **FIXED**: 6 bug-fix commits for schema mismatches, auth middleware, soft-delete flags
- **DB**: Migration script added missing tables/columns to staging DB
- **STAGING**: OPS-2 complete — staging environment fully operational with auto-deploy

### **2025-01-25**
- **FIXED**: Temporarily disabled analytics sample data generation to resolve backend startup crashes
- **ADDED**: Comprehensive TODO list with priority levels
- **STATUS**: Backend should now start successfully without sample data generation errors

---

**Note**: This TODO list represents the roadmap from a **commercial-grade application** to a **enterprise-production-ready system**. Your current application already meets commercial standards - these items are for continuous improvement and operational excellence.