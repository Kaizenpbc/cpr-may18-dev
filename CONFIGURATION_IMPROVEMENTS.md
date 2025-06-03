# Configuration Improvements Guide

## 🎯 Current Status
Your system already has **good environment-based configuration** for core database and JWT settings, but there are still some **hard-coded values** that should be moved to environment variables for production readiness.

## ❌ **Hard-Coded Issues Found:**

### 1. **Default User Passwords** (HIGH PRIORITY)
**File:** `backend/src/config/database.ts`
**Lines:** 84, 136, 146, 157

```javascript
// ❌ CURRENT (Hard-coded)
const adminPassword = 'test123';
const instructorPassword = 'test123';
const orgPassword = 'test123';
const accountantPassword = 'test123';

// ✅ SHOULD BE (Environment-based)
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'test123';
const instructorPassword = process.env.DEFAULT_INSTRUCTOR_PASSWORD || 'test123';
const orgPassword = process.env.DEFAULT_ORG_PASSWORD || 'test123';
const accountantPassword = process.env.DEFAULT_ACCOUNTANT_PASSWORD || 'test123';
```

### 2. **Security Configuration** (HIGH PRIORITY)
**File:** `src/utils/passwordUtils.ts`

```javascript
// ❌ CURRENT (Hard-coded)
const SALT_ROUNDS = 10;

// ✅ SHOULD BE (Environment-based)
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
```

### 3. **JWT Token Expiry** (MEDIUM PRIORITY)
**File:** `src/utils/jwtUtils.ts`

```javascript
// ❌ CURRENT (Hard-coded)
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// ✅ SHOULD BE (Environment-based)
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
```

### 4. **Test Configuration** (LOW PRIORITY)
**Files:** `test-*.js` files

```javascript
// ❌ CURRENT (Hard-coded)
const BASE_URL = 'http://localhost:3001';

// ✅ SHOULD BE (Environment-based)
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
```

## ✅ **Recommended Environment Variables**

Create a `.env` file in your backend directory with these variables:

```bash
# Core Database (Already Working ✅)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cpr_may18
DB_USER=postgres
DB_PASSWORD=gtacpr

# Server Configuration (Already Working ✅)
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# JWT Configuration (Already Working ✅)
JWT_SECRET=your-super-secure-jwt-secret-key-here
REFRESH_TOKEN_SECRET=your-super-secure-refresh-secret-key-here

# Security Configuration (NEEDS TO BE ADDED)
BCRYPT_SALT_ROUNDS=12
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Default User Passwords (NEEDS TO BE ADDED)
DEFAULT_ADMIN_PASSWORD=SecureAdminPass123!
DEFAULT_INSTRUCTOR_PASSWORD=SecureInstructorPass123!
DEFAULT_ORG_PASSWORD=SecureOrgPass123!
DEFAULT_ACCOUNTANT_PASSWORD=SecureAccountantPass123!

# Redis Configuration (Already Working ✅)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Settings (OPTIONAL)
APP_NAME=CPR Training Management System
SUPPORT_EMAIL=support@cpr-training.com
MAX_FILE_SIZE=10485760
```

## 🔧 **Implementation Priority:**

### **HIGH PRIORITY** (Fix Before Production)
1. **Default passwords** - Security risk
2. **BCRYPT_SALT_ROUNDS** - Security configuration
3. **JWT secrets** - Make sure they're strong in production

### **MEDIUM PRIORITY** (Next Sprint)
1. **Token expiry times** - Flexibility for different environments
2. **Rate limiting configuration** - Security tuning
3. **File upload limits** - Application limits

### **LOW PRIORITY** (Future Enhancement)
1. **Test configuration** - Development convenience
2. **Logging configuration** - Operational flexibility
3. **Email settings** - When email features are added

## 🚀 **Quick Fix Commands:**

### 1. **Fix Default Passwords:**
Add to your `.env` file:
```bash
echo "DEFAULT_ADMIN_PASSWORD=SecureAdminPass123!" >> backend/.env
echo "DEFAULT_INSTRUCTOR_PASSWORD=SecureInstructorPass123!" >> backend/.env
echo "DEFAULT_ORG_PASSWORD=SecureOrgPass123!" >> backend/.env
echo "DEFAULT_ACCOUNTANT_PASSWORD=SecureAccountantPass123!" >> backend/.env
```

### 2. **Update database.ts:**
```javascript
// Replace hard-coded passwords with:
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'test123';
const instructorPassword = process.env.DEFAULT_INSTRUCTOR_PASSWORD || 'test123';
const orgPassword = process.env.DEFAULT_ORG_PASSWORD || 'test123';
const accountantPassword = process.env.DEFAULT_ACCOUNTANT_PASSWORD || 'test123';
```

### 3. **Add BCRYPT configuration:**
```bash
echo "BCRYPT_SALT_ROUNDS=12" >> backend/.env
```

## 📋 **Production Readiness Checklist:**

- [ ] **Strong JWT secrets** (32+ random characters)
- [ ] **Secure default passwords** (12+ characters, mixed case, numbers, symbols)
- [ ] **Proper BCRYPT rounds** (12+ for production)
- [ ] **Environment-specific configs** (dev/staging/prod)
- [ ] **No hard-coded secrets** in code
- [ ] **Validation for required env vars** at startup

## 🛡️ **Security Best Practices:**

1. **Never commit `.env` files** to version control
2. **Use different secrets** for each environment
3. **Rotate secrets regularly** in production
4. **Validate environment variables** at application startup
5. **Use strong, random passwords** for default accounts

## ✅ **Your Current Status:**
- **Database config:** ✅ Environment-based
- **JWT config:** ✅ Environment-based  
- **Server config:** ✅ Environment-based
- **Default passwords:** ❌ Hard-coded (needs fix)
- **Security settings:** ❌ Hard-coded (needs fix)

**Overall:** 60% environment-based, 40% still hard-coded 