# Code QA Review - January 23, 2026

## Summary
- **Total Issues Found:** 180+
- **Backend Issues:** 27 categorized
- **Frontend Issues:** 40+ categorized

---

## CRITICAL ISSUES (Fix Immediately)

### Backend Security
- [x] **Weak token blacklist hash** - Uses bitwise XOR instead of crypto hash
  - File: `backend/src/utils/tokenBlacklist.ts:83-92`
  - Risk: Token reuse, multiple tokens could produce same hash
  - **FIXED:** Now uses crypto.createHash('sha256')

- [x] **Hardcoded JWT fallback secrets** - Predictable fallback values
  - File: `backend/src/utils/jwtUtils.ts:6-9`
  - File: `backend/src/middleware/authMiddleware.ts:34-35`
  - Risk: Token forgery if env vars not set
  - **FIXED:** Now throws fatal error in production if env vars not set

- [x] **Password reset uses same secret as access token**
  - File: `backend/src/routes/v1/auth.ts:175-179`
  - Risk: Token confusion attacks
  - **FIXED:** Now uses separate JWT_RESET_SECRET

- [x] **Missing authorization on invoice download** - Any authenticated user can download
  - File: `backend/src/routes/v1/vendor.ts:635-679`
  - Risk: Vendors could download other vendors' invoices
  - **FIXED:** Added role-based authorization (staff can access all, vendors only their own)

- [x] **User-Agent security checks easily bypassed**
  - File: `backend/src/middleware/apiSecurity.ts:142-190`
  - Risk: Attackers can spoof headers
  - **NOTE:** This is an inherent limitation, not a bug. UA checks are defense-in-depth against unsophisticated bots. Primary security relies on auth, CSRF, rate limiting.

### Frontend Security
- [x] **XSS via dangerouslySetInnerHTML** in email templates
  - File: `frontend/src/components/portals/courseAdmin/EmailTemplateManager.tsx`
  - Risk: Script injection
  - **ALREADY MITIGATED:** DOMPurify.sanitize() is used to sanitize HTML before rendering

- [x] **Token storage mismatch** - sessionStorage vs localStorage mixed
  - File: `frontend/src/services/tokenService.ts:93-94`
  - Risk: Auth bypass, token persistence issues
  - **FIXED:** Now uses sessionStorage for both token and expiry

- [x] **Development reset token exposed in UI**
  - File: `frontend/src/pages/Login.tsx:121-125`
  - Risk: Token exposure
  - **FIXED:** Added frontend isDev check before displaying token

---

## HIGH PRIORITY ISSUES

### Backend
- [x] **60+ console.log statements expose sensitive data**
  - Files: `auth.ts`, `vendor.ts`, `organization.ts`, `instructor.ts`
  - Risk: Sensitive data leakage in logs
  - **FIXED:** Created devLog utility, replaced 150+ console.log statements in route files

- [x] **N+1 query patterns** - Subqueries in SELECT for each row
  - File: `backend/src/routes/v1/instructor.ts:267-268, 312-313, 356-357`
  - Impact: 100-1000x slower with large datasets
  - **FIXED:** Replaced scalar subqueries with LEFT JOIN aggregations using COUNT(*) FILTER

- [ ] **173 instances of `any` type** bypass TypeScript
  - Files: Multiple middleware, routes, utilities
  - Risk: Runtime errors from type mismatches

- [ ] **Missing null/undefined checks** - Using `!` assertion without validation
  - File: `backend/src/routes/v1/vendor.ts:58, 96, 151, 220, 231, 340`
  - Risk: Runtime crashes

- [x] **Incomplete error handling in async routes**
  - File: `backend/src/routes/v1/instructor.ts:49-138, 141-168`
  - Risk: No error propagation to middleware
  - **FIXED:** Wrapped routes with asyncHandler, replaced manual 500 responses with AppError throws

- [x] **Test endpoints exposed in production**
  - File: `backend/src/routes/v1/instructor.ts:14-46`
  - Endpoints: `/test`, `/test-classes`
  - **FIXED:** Removed test endpoints

### Frontend
- [x] **100+ console.log statements in api.ts**
  - File: `frontend/src/services/api.ts`
  - Risk: Auth tokens logged to browser console
  - **FIXED:** Replaced with devLog() utility that only logs in development

- [x] **Race condition in token refresh**
  - File: `frontend/src/services/api.ts:62-88, 135-161`
  - Risk: Queue processing race conditions
  - **FIXED:** Added shared refreshPromise, atomic queue swap, proper async/await handling

- [x] **Placeholder services return mock data**
  - File: `frontend/src/services/userService.ts`
  - Issue: All methods are stubs, not real implementations
  - **FIXED:** Implemented actual API calls to /sysadmin/users endpoints

- [x] **Direct axios usage bypassing API wrapper**
  - File: `frontend/src/pages/Profile.tsx:12, 40, 57`
  - Risk: Missing auth tokens, inconsistent error handling
  - **FIXED:** Changed to use api wrapper from services/api

- [x] **Missing useEffect dependencies**
  - File: `frontend/src/components/PrivateRoute.tsx:21-34, 37-74`
  - Risk: Memory leaks, stale closures
  - **FIXED:** Added isMountedRef for async cleanup, replaced console.log with devLog

- [x] **Unhandled promise rejections in token queue**
  - File: `frontend/src/services/api.ts:140, 166-173`
  - Risk: Application crashes
  - **FIXED:** Properly wrap all promise chains in try/catch with explicit error handling

---

## MEDIUM PRIORITY ISSUES

### Backend
- [ ] **Missing CSRF protection** on all POST/PUT/DELETE endpoints

- [ ] **Unimplemented TODO comments**
  - `auth.ts:662` - "TODO: Implement actual email sending"
  - `scheduledJobs.ts:78` - "TODO: Here you can add email notification logic"
  - `sessionManager.ts:394` - "TODO: Log security event for audit trail"
  - `index.ts:7591` - "TODO: Send email notification to vendor"

- [ ] **SQL sanitization over-aggressive** - Removes valid words like "AND", "OR"
  - File: `backend/src/middleware/inputSanitizer.ts:35-40`
  - Issue: "Johnson AND Associates" becomes "Johnson Associates"

- [ ] **Inconsistent error response formats**
  - Mix of `{ error }`, `ApiResponseBuilder`, `AppError` patterns

- [ ] **Memory leak in request tracking** - fingerprints Set grows indefinitely
  - File: `backend/src/middleware/apiSecurity.ts:78-82`

- [x] **Username enumeration possible** - Different messages for user not found vs invalid password
  - File: `backend/src/routes/v1/auth.ts:52-61, 71-80`
  - **FIXED:** Now returns same "Invalid credentials" message for both cases

- [ ] **Magic numbers without constants**
  - `apiSecurity.ts:195` - rate limit window
  - `auth.ts:105` - cookie max age
  - `tokenBlacklist.ts:87-91` - bit operations

### Frontend
- [ ] **Missing request timeout** - Fetch has no timeout parameter
  - File: `frontend/src/contexts/NetworkContext.tsx:266`

- [ ] **No request deduplication** - Multiple rapid calls not deduplicated
  - File: `frontend/src/services/api.ts`

- [ ] **Mixed error handling patterns** - try-catch, toast, error boundaries inconsistent

- [ ] **Memory leak in toast intervals**
  - File: `frontend/src/components/common/ToastContainer.tsx:35-51`

- [ ] **staleTime: 0 defeats caching**
  - File: `frontend/src/services/instructorService.ts:60-62`

- [ ] **window.location.href instead of React Router**
  - Files: `PrivateRoute.tsx`, `api.ts`
  - Issue: Hard page reload, state loss

- [ ] **No input validation on forgot password**
  - File: `frontend/src/pages/Login.tsx:103-106`

- [ ] **localStorage without namespace prefix**
  - File: `frontend/src/contexts/NetworkContext.tsx:441, 462`
  - Key: 'networkQueue' could collide with other apps

---

## LOW PRIORITY / CODE QUALITY

### Backend
- [ ] **Dead code and unused imports**
  - File: `backend/src/routes/v1/vendor.ts:7, 12`

- [ ] **Inconsistent naming conventions** - Mix of snake_case and camelCase

- [ ] **Pagination not validated against NaN**
  - File: `backend/src/routes/v1/organization.ts:82-84`

- [ ] **Logging reveals application structure** - Table names, queries exposed

- [ ] **Database connection without timeout protection**
  - File: `backend/src/config/database.ts`

### Frontend
- [ ] **API service too large** - 1,228 lines in single file
  - File: `frontend/src/services/api.ts`

- [ ] **Missing loading states on form submit**
  - File: `frontend/src/pages/Profile.tsx:54-64`

- [ ] **No error boundary around portal containers**

- [ ] **Missing JSDoc comments** on complex functions

- [ ] **Unused imports** in api.ts

---

## PERFORMANCE ISSUES

### Backend
- [ ] **Blocking file I/O on request path**
  - File: `backend/src/routes/v1/database.ts:34`

- [ ] **Duplicate database calls** for archived courses count
  - File: `backend/src/routes/v1/organization.ts:100-106`

- [ ] **Suboptimal JOIN patterns** - Could use window functions
  - File: `backend/src/routes/v1/instructor.ts:989-992`

### Frontend
- [ ] **Missing React.memo on expensive components**
  - File: `frontend/src/components/portals/courseAdmin/InstructorDashboard.tsx`

- [ ] **Promise.allSettled calls all endpoints even if unnecessary**
  - File: `frontend/src/services/api.ts:227-234`

- [ ] **localStorage access without error handling**
  - File: `frontend/src/contexts/NetworkContext.tsx:441-446, 462`

---

## COMPLETED FIXES

### Session 1 - January 23, 2026

**Critical Fixes:**
1. **Weak token blacklist hash** - Replaced bitwise XOR with SHA-256 (`crypto.createHash('sha256')`)
2. **Hardcoded JWT fallback secrets** - Now throws fatal error in production if env vars not set
3. **Password reset uses same secret** - Now uses separate `JWT_RESET_SECRET`
4. **Missing invoice download authorization** - Added role-based authorization
5. **Token storage mismatch** - Fixed to use sessionStorage consistently
6. **Development reset token exposed** - Added frontend isDev check

**High Priority Fixes:**
7. **Test endpoints exposed** - Removed `/test` and `/test-classes` routes
8. **100+ console.log in api.ts** - Replaced with `devLog()` utility (dev-only)
9. **Console.log in tokenService** - Replaced with `devLog()` utility
10. **Placeholder userService** - Implemented actual API calls
11. **Username enumeration** - Now returns same error message for both user not found and invalid password
12. **Direct axios usage** - Profile.tsx now uses api wrapper with proper auth handling
13. **N+1 query patterns** - Replaced scalar subqueries with LEFT JOIN aggregations in instructor.ts
14. **Token refresh race condition** - Added shared refreshPromise and atomic queue processing
15. **Unhandled promise rejections** - Proper try/catch wrapping in token queue handlers
16. **PrivateRoute memory leak** - Added isMountedRef for async cleanup, replaced console.log with devLog
17. **Incomplete async error handling** - Wrapped instructor.ts routes with asyncHandler for consistent error propagation

**Build Error Fixes (required for type checking):**
13. **encryptionConfig.ts** - Added missing `getActiveKey()` method to EncryptionService class
14. **invoiceTemplates.ts** - Fixed RegExp to string conversion using `pattern.source`
15. **timesheet.ts** - Added proper type imports (Request, Response, NextFunction) and `.js` extensions

---

## Pre-Existing Build Issues (102 TypeScript errors)

### Backend
- Multiple route files missing `.js` import extensions (payRates.ts, timesheet.ts, etc.)
- `req.user` accessed without undefined checks across many route handlers
- Configuration type mismatches in encryptionConfig.ts, sslConfig.ts, environmentConfig.ts
- Missing methods on NotificationService class
- `base32` encoding issues in mfaConfig.ts

### Frontend
- Test files have outdated imports (@testing-library/react)
- PaymentRequest interface missing properties (base_amount, hourly_rate, etc.)
- Module resolution issues in test files

---

## Notes
- Review conducted: January 23, 2026
- Priority: Critical > High > Medium > Low
- Start with security fixes, then performance, then code quality
