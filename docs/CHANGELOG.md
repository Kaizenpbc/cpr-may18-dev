# Changelog

All notable changes to the CPR Training System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — Week 3 Cookie Security, Password Policy & Cleanup — 2026-03-06

### Security
- **Refresh token cookie `SameSite` fixed**: Changed from `SameSite=None` to `SameSite=Strict`
  on all three `res.cookie('refreshToken', ...)` calls (login, session refresh, JWT fallback
  refresh). The old value was required for the former Netlify→Render cross-origin setup;
  frontend and backend are now same-origin on `cpr.kpbc.ca`.
- **Password strength validation added**: New `validatePasswordStrength()` helper enforces
  minimum 8 characters + at least one digit or special character. Applied at
  `POST /auth/change-password` and `POST /auth/reset-password`. Returns `400 WEAK_PASSWORD`
  on failure.

### Repo Cleanup
- Added `neon-schema.sql` and `patch-init-db.py` to version control (useful deployment artifacts).
- Committed `frontend/package.json` MUI icons bump (5.15.6 → 5.18.0).
- Committed deletion of `instructor_manual_basic.html`.
- Added `.claude/settings.local.json` and `frontend/package-lock.json` to `.gitignore`.

### Notes
- Rate limiter (`express-rate-limit`) uses in-memory store — counts reset on Passenger restart.
  Acceptable for single-process deployment. See `docs/DEPLOYMENT_GUIDE.md`.
- `email_sent_at` column on `invoices` table still pending — requires ALTER TABLE in Neon console.

---

## [Unreleased] — Week 2 Security & Code Hygiene — 2026-03-05

### Fixed
- **TypeScript errors**: Added `locationId?: number | null` and `locationName?: string | null`
  to `TokenPayload` in `backend/src/types/index.ts` and `backend/src/utils/jwtUtils.ts`.
  Backend now compiles with zero errors — `--noEmitOnError false` workaround removed.

### Security
- **apiSecurity.ts cleanup**:
  - Removed dead Netlify origin (`gta-cpr-course-admin.netlify.app`) from `allowedOrigins`
  - Removed private IP ranges from `blockedIpRanges` (useless on a public server; caused friction with proxies)
  - Replaced broad `blockedUserAgents` list (`curl`, `wget`, `bot`, etc.) with targeted
    scanner-only list (`masscan`, `nikto`, `sqlmap`, `nmap`, `zgrab`, `dirbuster`, `nuclei`)

### Dev Workflow
- **Husky pre-commit hook**: Removed deprecated v9 shim lines (`#!/usr/bin/env sh` +
  `. "$(dirname -- "$0")/_/husky.sh"`) that would fail in husky v10.

### Infrastructure
- **backend/.env**: Updated `DATABASE_URL` from stale Render instance to Neon (matches production).

---

## [Unreleased] — Week 1 Security Fixes — 2026-03-05

### Security
- **Sanitized tracked credential files**: replaced real secret values in
  `configs/production.env`, `monitoring.env`, and `backend/ - Copy.env` with
  `YOUR_*_HERE` placeholders; all three files are now untracked via `.gitignore`.
- **Hardened JWT startup validation**: `initializeEnvironmentConfig()` now calls
  `process.exit(1)` in production when `JWT_SECRET` or `REFRESH_TOKEN_SECRET` are
  missing, too short, or still set to default placeholder values.
- **Added REFRESH_TOKEN_SECRET production check** alongside the existing
  `JWT_SECRET` check in `validateConfiguration()`.
- **Rotated JWT secrets**: all four JWT secrets (`JWT_SECRET`, `REFRESH_TOKEN_SECRET`,
  `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET`) replaced with fresh
  64-char hex values in `backend/.env` and on the production server `.htaccess`.

### Added
- `.env.example` — root-level template documenting all required env vars.
- `backend/.env.example` — backend-specific template with comments and generation hints.
- `docs/DEPLOYMENT_GUIDE.md` — new "Environment Variables Setup" section with rotation
  instructions, required production vars, and Gmail App Password guidance.

### Changed
- `.gitignore` updated to prevent future tracking of `configs/*.env`,
  `monitoring.env`, and `backend/ - Copy.env`.

---

## [1.0.0] - 2025-07-19

### Added
- **Keyboard Shortcuts** for invoice management
  - `Ctrl+Enter`: Approve invoice (when status is pending/draft)
  - `Ctrl+D`: Download PDF
  - `Esc`: Close dialog
  - Added keyboard shortcuts help tooltip in dialog title

- **Enhanced Status Indicators** with icons and improved visual feedback
  - Added Material-UI icons to status chips
  - Consistent color coding across components
  - Visual status guide with icons for all status types
  - Improved user experience with instant status recognition

- **Auto-refresh functionality** for invoice lists
  - Automatic refresh every 30 seconds
  - Console logging for debugging
  - Memory leak prevention with proper cleanup
  - Optional feature requiring `onRefresh` prop

- **Quick Stats Dashboard** component
  - Pending Approvals count
  - Approved Today count
  - Posted Today count
  - Total Outstanding amount
  - Real-time statistics with last updated timestamp
  - Hover effects and tooltips
  - Responsive grid layout

### Changed
- **InvoiceDetailDialog.tsx**
  - Added keyboard event listeners with `useEffect`
  - Added keyboard shortcuts help tooltip in dialog title
  - Enhanced dialog title with shortcuts indicator
  - Improved user interface with better visual feedback

- **InvoiceHistoryTable.tsx**
  - Added Material-UI icon imports for status indicators
  - Enhanced status chips with icons and better color coding
  - Added auto-refresh functionality with configurable interval
  - Improved component props to support refresh functionality
  - Fixed duplicate import issues

- **TransactionHistoryView.tsx**
  - Integrated InvoiceStatsDashboard component
  - Added auto-refresh support to InvoiceHistoryTable
  - Enhanced user interface with stats dashboard above invoice table
  - Improved data flow and component communication

### Technical Improvements
- **Performance Optimizations**
  - Efficient event listener management
  - Minimal re-renders with proper dependencies
  - Cleanup functions prevent memory leaks
  - Conditional rendering based on data availability

- **Code Quality**
  - Proper TypeScript interfaces
  - Consistent patterns across components
  - Error handling and logging
  - Maintainable and documented code

- **User Experience**
  - Faster workflow for power users
  - Better visual feedback for all users
  - Real-time data synchronization
  - Improved accessibility with keyboard navigation

### Documentation
- **Technical Documentation**
  - Comprehensive implementation details
  - Maintenance and update guidelines
  - Testing guidelines
  - Troubleshooting guide

- **User Documentation**
  - User-friendly feature guide
  - Keyboard shortcuts reference
  - Status indicator guide
  - Best practices and tips

### Files Added
- `frontend/src/components/dashboard/InvoiceStatsDashboard.tsx`
- `docs/INVOICE_SYSTEM_IMPROVEMENTS.md`
- `docs/INVOICE_SYSTEM_USER_GUIDE.md`
- `docs/CHANGELOG.md`

### Files Modified
- `frontend/src/components/dialogs/InvoiceDetailDialog.tsx`
- `frontend/src/components/tables/InvoiceHistoryTable.tsx`
- `frontend/src/components/views/TransactionHistoryView.tsx`

### Dependencies
- No new dependencies added
- Uses existing Material-UI components and icons
- Leverages existing React patterns and hooks

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Breaking Changes
- None - all changes are backward compatible

### Migration Guide
- No migration required
- Features are automatically available
- Existing functionality remains unchanged

### Known Issues
- None reported

### Future Enhancements
- Batch operations for multiple invoices
- Advanced filtering options
- Export functionality
- Real-time notifications
- Mobile optimization improvements

---

## [Unreleased]

### Planned
- Batch invoice operations
- Advanced filtering and search
- Export to CSV/Excel
- Real-time WebSocket notifications
- Mobile-responsive improvements
- Additional keyboard shortcuts
- Customizable auto-refresh intervals

### Technical Debt
- Move status functions to shared utility
- Add comprehensive unit tests
- Implement React Query for data management
- Add proper TypeScript interfaces for all components

---

**Note**: This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format and [Semantic Versioning](https://semver.org/). 