# CPR Training Management System - TODO List

## 🔧 **Technical Debt & Configuration**

### **Database Configuration**
- [ ] **Standardize database naming**: Rename `cpr_may18` to `cpr_training` for production consistency
- [ ] **Environment configuration**: Create proper `.env` files for different environments (dev, staging, prod)
- [ ] **🔴 HIGH PRIORITY: Fix analytics sample data generation**: Re-enable and fix the sample data generation code that was causing backend startup crashes (temporarily disabled in database.ts)
- [ ] **Connection pooling optimization**: Review and optimize PostgreSQL connection pool settings
- [ ] **Fix email_sent_at column in invoices table**: 
  - **Issue**: The `email_sent_at` column is missing from the database but referenced in queries
  - **Current workaround**: Returning NULL in the accounting invoices query
  - **Permanent fix**: Add column to database with proper migration
  - **SQL to run**: `ALTER TABLE invoices ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE;`
  - **Code to uncomment**: After adding column, uncomment the email timestamp update code in `/accounting/invoices/:id/email` endpoint (lines ~1960-1965 in routes/v1/index.ts)

- [ ] **Fix payments table structure mismatch**:
  - **Issue**: The payments table in the database has different columns than expected
  - **Current structure**: Has `user_id` and `session_id` columns
  - **Expected structure**: Should have `invoice_id` column referencing invoices table
  - **Current workaround**: Returning 0 for paid amounts and full invoice amount as balance due
  - **Permanent fix**: Either migrate the existing payments table or create a new invoice_payments table
  - **Impact**: Payment tracking and balance calculations are not working

### **Error Handling & Monitoring**
- [ ] **Server health monitoring**: Implement proper health check endpoints that don't hang
- [ ] **Database connectivity alerts**: Add monitoring for database connection failures
- [ ] **Error logging enhancement**: Implement structured logging with log levels
- [ ] **Performance monitoring**: Add APM (Application Performance Monitoring) integration

## 🚀 **Deployment & Infrastructure**

### **Production Readiness**
- [ ] **SSL/TLS configuration**: Set up HTTPS certificates for production
- [ ] **Environment variables**: Secure sensitive configuration (database passwords, JWT secrets)
- [ ] **Docker containerization**: Create Docker containers for easy deployment
- [ ] **CI/CD pipeline**: Set up automated testing and deployment pipeline
- [ ] **Load balancing**: Configure load balancer for high availability
- [ ] **Database backups**: Implement automated backup strategy

### **Security Enhancements**
- [ ] **Rate limiting**: Re-enable and configure rate limiting middleware
- [ ] **Input validation**: Add comprehensive input sanitization
- [ ] **Security headers**: Implement security headers (CORS, CSP, etc.)
- [ ] **Audit logging**: Enhance activity logging for security compliance
- [ ] **Password policies**: Implement strong password requirements
- [ ] **Session management**: Add session timeout and concurrent session limits

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
- [ ] **Integration tests**: Test API endpoints and database interactions
- [ ] **End-to-end tests**: Automate user workflow testing
- [ ] **Performance tests**: Load testing for concurrent users
- [ ] **Security tests**: Automated vulnerability scanning

### **Code Quality**
- [ ] **Code review process**: Establish peer review requirements
- [ ] **Linting rules**: Enforce consistent code style
- [ ] **Type safety**: Improve TypeScript strict mode compliance
- [ ] **Documentation**: Add inline code documentation
- [ ] **API documentation**: Generate OpenAPI/Swagger documentation

## 📋 **Operational Tasks**

### **Maintenance**
- [ ] **Dependency updates**: Regular security updates for npm packages
- [ ] **Database maintenance**: Regular VACUUM and ANALYZE operations
- [ ] **Log rotation**: Implement log file rotation and archival
- [ ] **Performance tuning**: Database query optimization
- [ ] **Capacity planning**: Monitor and plan for scaling needs

### **Compliance & Governance**
- [ ] **Data retention policies**: Implement data lifecycle management
- [ ] **GDPR compliance**: Add data privacy controls
- [ ] **Backup testing**: Regular backup restoration testing
- [ ] **Disaster recovery**: Document and test DR procedures
- [ ] **Change management**: Formal change approval process

## 🎯 **Priority Levels**

### **🔴 High Priority (Fix Soon)**
- **Analytics sample data generation fix** - Backend crashes during startup
- Database naming standardization
- SSL/TLS for production
- Environment configuration setup

### **🟡 Medium Priority (Next Sprint)**
- Docker containerization
- Automated testing setup
- Mobile responsiveness
- Email notifications

### **🟢 Low Priority (Future Releases)**
- Multi-language support
- Predictive analytics
- Advanced security features
- Performance optimizations

---

## 📝 **Recent Changes**

### **2025-01-25**
- **FIXED**: Temporarily disabled analytics sample data generation to resolve backend startup crashes
- **ADDED**: Comprehensive TODO list with priority levels
- **STATUS**: Backend should now start successfully without sample data generation errors

---

**Note**: This TODO list represents the roadmap from a **commercial-grade application** to a **enterprise-production-ready system**. Your current application already meets commercial standards - these items are for continuous improvement and operational excellence. 