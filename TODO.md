# CPR Training Management System - TODO List

## 🔧 **Technical Debt & Configuration**

### **Database Configuration**
- [ ] **Standardize database naming**: Rename `cpr_may18` to `cpr_training` for production consistency
- [ ] **Environment configuration**: Create proper `.env` files for different environments (dev, staging, prod)
- [x] **Analytics sample data generation** — code no longer exists; crash was already cleaned up
- [x] **Connection pooling optimization** — pool limits set (max 10, 30s idle, 5s conn timeout)
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
- [ ] **CI/CD pipeline** — GitHub Actions runs tests on push; deploy is manual FTPS
- [ ] ~~Load balancing~~ — not applicable on shared hosting
- [ ] **🔴 Hosting resource limits (HOSTING-1)**: TMD confirmed LVE cap: **100 processes, 2GB RAM, 2 CPU cores**. Running multiple Node.js apps simultaneously hits the process limit → 503 errors (seen 2026-03-15). Options:
  - **Option A**: Manage carefully — only run CPR app on this account; avoid opening extra Node.js processes during deploy.
  - **Option B (recommended at scale)**: Upgrade to TMD Managed VPS — no process limits, dedicated resources, full root access. Do this before onboarding multiple paying customers simultaneously.
- [ ] **🔴 Database backup SLA (BACKUP-1)**: Currently on Neon free tier — no guaranteed backup retention or point-in-time restore SLA.
  - **Option A (recommended)**: Upgrade Neon project to a paid plan — gives PITR, branching, and guaranteed backups.
  - **Option B**: Add a `pg_dump` cron job: schedule nightly dump → compress → upload to external storage (e.g. Cloudflare R2 or Backblaze B2). Requires a server that can reach Neon (e.g. GitHub Actions on a schedule).
  - Do this **before** first paying customer.
- [ ] **Database backups** — see BACKUP-1 above; action required before first paying customer

### **Security Enhancements**
- [ ] **🟡 Switch to dedicated noreply mailbox (EMAIL-2)**: Currently using `michaela@kpbc.ca` as SMTP sender (temporary). Create a dedicated `noreply@kpbc.ca` mailbox in cPanel, update `.htaccess` `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` to use it, and restart Passenger.
- [ ] **🟡 Confirm email delivery (EMAIL-1)** *(deferred)*: SMTP updated to `mail.kpbc.ca:587` using `michaela@kpbc.ca` (deployed 2026-03-18). API returns `RESET_SENT` but delivery to `kpbcma@gmail.com` unconfirmed. **Next step**: check inbox/spam for the test reset email; if not received, investigate TMD mail logs via cPanel → Email → Track Delivery, or try an alternate recipient. May need SPF/DKIM records checked for `kpbc.ca`.
- [ ] **🟡 Re-enable rate limiting (RATELIMIT-1)** *(deferred — SOP item, not blocking launch)*: All rate limiters are commented out in `backend/src/index.ts` lines 321–326. Uncomment `apiLimiter`, `authLimiter`, and `registerLimiter` before scaling / public exposure. Test locally first to confirm limits don't block legitimate usage patterns.
- [x] **Input validation** — inputSanitizer with Zod schemas
- [x] **Security headers** — Helmet with full CSP, HSTS, X-Frame-Options
- [x] **Audit logging** — auditLogger.ts active
- [x] **Password policies** — validation on reset/change
- [x] **Session management** — httpOnly cookies, token blacklist, login lockout after 10 attempts
- [x] **🔴 Fix sysadmin/courses POST 500 (BUG-1)**: `null value in column "duration_minutes" of relation "class_types"` — sysadmin course creation crashes. Investigate `class_types` insert in `sysadmin.ts` / `sysadmin-entities.ts`; ensure `duration_minutes` is required in the request body or has a DB default.
- [x] **🔴 Terms of Service page (LEGAL-1)**: Privacy policy exists at `/privacy` but no ToS/Service Agreement. Required before taking money. Add `/terms` page and link it alongside the privacy policy on the login screen.
- [x] **🔴 Org data isolation audit (SECURITY-2)**: Audited all 67 routes across 4 files. Fixed 9 issues: 8 unauthenticated/unscoped course-admin routes in `course-requests.ts` (added `authenticateToken` + `requireRole`), 1 fetch-before-check in `org-billing.ts` (moved org scope into WHERE clause).
- [ ] **🟡 Customer onboarding flow (ONBOARD-1)**: Currently sysadmin manually creates orgs and users — no self-signup or invite flow. Fine for early customers; document the manual process and decide if/when to build self-serve onboarding.
- [ ] **🟡 Uptime monitoring (OPS-1)**: Nothing alerts if the site goes down. Set up a free UptimeRobot monitor on `https://cpr.kpbc.ca/api/v1/health` — alerts by email if it goes down. Takes 5 minutes.
- [ ] **Revisit npm audit vulnerabilities**: Pre-commit audit shows 6 low + 5 moderate vulns
  (all dev tooling — `esbuild`/`vite`/`@google-cloud/storage`). All require breaking-change upgrades
  (`npm audit fix --force`). Revisit when upgrading Vite or Google Cloud Storage.
  Run `npm audit` for current status.

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

### **Billing & Invoicing**
- [ ] **Configurable per-organization invoice numbers**
  - **Goal**: Allow each organization to have its own invoice numbering scheme (e.g., `ORG1-00001`, `ORG2-0100`).
  - **Data model**: Create `invoice_number_sequences` table with fields: `organization_id` (FK, unique), `prefix`, `format_string`, `padding`, `next_number`, `step` (default 1), `reset_policy` (none|yearly|monthly), `last_reset_period`, timestamps.
  - **Uniqueness policy**: Decide and implement either global uniqueness on `invoices.invoice_number` or scoped uniqueness on `(organization_id, invoice_number)`. Default recommendation: scoped per-organization.
  - **Atomic allocation**: In invoice creation transaction, allocate and increment using single `UPDATE ... RETURNING` to avoid race conditions; format number using `format_string` tokens.
  - **Formatting tokens**: Support `{PREFIX}`, `{NN}`/`{NNNN}` (based on `padding`), and date tokens `{YYYY}`, `{YY}`, `{MM}`, `{DD}`. Example: `{PREFIX}-{YYYY}-{NNNN}`.
  - **Reset behavior**: When `reset_policy` applies and the period changes, reset `next_number` and update `last_reset_period` atomically.
  - **Fallback**: If an org has no sequence row, use a default system config row or current `INV-YYYY-XXXXXX` generator.
  - **Admin API/UI**: Endpoints and screen to view/update: `prefix`, `format_string`, `padding`, `next_number`, `step`, `reset_policy`; include a "preview next" function; audit changes.
  - **Audit (optional)**: `invoice_number_events` table to record allocations and manual adjustments.
  - **Testing**: Unit and integration tests for allocation under concurrency, formatting, resets, and uniqueness violations.
  - **Backfill**: Validate existing invoices do not violate the chosen uniqueness constraint; no renumbering unless explicitly required.
  - **Scope**: Vendor invoices remain user-supplied; no auto-generation change required.

## 🧪 **Testing & Quality Assurance**

### **Automated Testing**
- [ ] **Unit tests**: Achieve 80%+ code coverage
- [x] **Integration tests** — 51 tests across 4 suites (auth, lockout, reset, recovery)
- [ ] **End-to-end tests** — Playwright installed but no tests written yet
- [ ] **Performance tests**: Load testing for concurrent users
- [ ] **Security tests**: Automated vulnerability scanning

### **Code Quality**
- [ ] **Code review process**: Establish peer review requirements
- [x] **Linting rules** — ESLint configured with pre-commit hook
- [x] **Type safety** — TypeScript strict mode enabled frontend + backend
- [ ] **Documentation** — inline code docs partial; API docs not auto-generated
- [ ] **API documentation**: Generate OpenAPI/Swagger documentation

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
2. **BACKUP-1** — Database backup strategy (decision required: Neon paid PITR or pg_dump cron)
3. ~~**BUG-1**~~ ✅ Fixed sysadmin/courses POST 500
4. ~~**LEGAL-1**~~ ✅ Terms of Service page live at `/terms`
5. ~~**SECURITY-2**~~ ✅ Org data isolation audit complete — 9 issues fixed
6. **BIZ-1** — Decide SaaS pricing & billing model *(deferred — options: flat monthly fee, per-student, per-course, or manual invoicing for early customers)*
7. **BIZ-2** — Define offboarding / cancellation policy *(deferred — ToS already covers 30-day notice, 30-day data export window, then anonymization; formalize as internal process when first customer churns)*

### **🟡 Medium Priority**
- **RATELIMIT-1** — Re-enable rate limiting (`index.ts` lines 321–326 commented out) before scaling
- **HOSTING-1** — Plan VPS upgrade before multiple concurrent paying customers
- **ONBOARD-1** — Customer onboarding flow (self-serve or documented manual process)
- Mobile responsiveness
- **OPS-1** — Uptime monitoring (UptimeRobot on `/api/v1/health`)
- Data retention enforcement (auto-purge old records)
- End-to-end (Playwright) tests — cover login, course request, invoice
- Custom invoice number sequences per org

### **🟢 Low Priority / Future**
- Multi-language support
- Predictive analytics
- OpenAPI/Swagger docs
- Calendar integration (Google/Outlook)

---

## 📝 **Recent Changes**

### **2025-01-25**
- **FIXED**: Temporarily disabled analytics sample data generation to resolve backend startup crashes
- **ADDED**: Comprehensive TODO list with priority levels
- **STATUS**: Backend should now start successfully without sample data generation errors

---

**Note**: This TODO list represents the roadmap from a **commercial-grade application** to a **enterprise-production-ready system**. Your current application already meets commercial standards - these items are for continuous improvement and operational excellence. 