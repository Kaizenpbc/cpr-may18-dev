# Stable Environment Setup Guide

## Problem Solved

Your environment was unstable due to **multiple database initialization systems** running simultaneously, causing schema conflicts and connection issues.

## Root Causes Identified

1. **Multiple initialization systems**: Backend had automatic schema creation running on every startup
2. **Migration conflicts**: Knex migrations and manual schema creation were competing
3. **Environment mismatch**: Code expected `cpr_may18` but connected to `cpr_jun21`
4. **Stale connections**: Database connection pools with cached metadata

## Stable Environment Setup

### 1. Database Configuration Fixed

- ✅ **Disabled automatic schema creation** on startup
- ✅ **Standardized database name** to `cpr_jun21`
- ✅ **Removed schema conflicts** between systems

### 2. New Stable Commands

```bash
# Check database status
npm run db:status

# Initialize database (only when needed)
npm run db:init

# Reset database to stable state
npm run db:reset

# Start backend in stable mode
npm run stable:start

# Start full development in stable mode
npm run stable:dev
```

### 3. Environment Variables

Create `.env` file in backend directory:

```env
DB_USER=postgres
DB_PASSWORD=gtacpr
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=cpr_jun21
```

### 4. Stable Startup Process

1. **Check database status**:
   ```bash
   npm run db:status
   ```

2. **If database needs initialization**:
   ```bash
   npm run db:init
   ```

3. **Start backend in stable mode**:
   ```bash
   npm run stable:start
   ```

4. **Start frontend** (in separate terminal):
   ```bash
   cd frontend && npm run dev
   ```

## Why This Creates Stability

### Before (Unstable)
- ❌ Automatic schema creation on every startup
- ❌ Multiple competing initialization systems
- ❌ Stale database connections
- ❌ Environment mismatches

### After (Stable)
- ✅ Manual database initialization only when needed
- ✅ Single source of truth for schema
- ✅ Fresh connections on startup
- ✅ Consistent environment configuration

## Database Schema Management

### Current Stable Schema
- **Database**: `cpr_jun21`
- **Tables**: `users`, `organizations`, `class_types`, `classes`, `course_requests`, etc.
- **Key columns**: `instructor_id`, `class_type_id` exist and are properly configured

### Schema Changes (When Needed)
1. **Development**: Use Knex migrations
2. **Production**: Manual schema updates with proper testing
3. **Never**: Automatic schema changes on startup

## Troubleshooting

### If you get "column does not exist" errors:
1. Run `npm run db:status` to check database state
2. Run `npm run db:reset` to verify schema
3. If issues persist, run `npm run db:init`

### If backend crashes on startup:
1. Check database connection: `npm run db:status`
2. Kill all processes: `npm run cleanup`
3. Start in stable mode: `npm run stable:start`

### If frontend can't connect:
1. Verify backend is running: `netstat -an | findstr :3001`
2. Check backend logs for database errors
3. Restart backend: `npm run stable:start`

## Production Readiness

This stable environment setup provides:
- ✅ **Predictable startup** - No automatic schema changes
- ✅ **Consistent behavior** - Same database state every time
- ✅ **Easy troubleshooting** - Clear status commands
- ✅ **Manual control** - Schema changes only when intended

## Next Steps

1. **Test the stable environment**:
   ```bash
   npm run db:status
   npm run stable:start
   ```

2. **Verify functionality**:
   - Backend starts without errors
   - Frontend connects successfully
   - Database queries work properly

3. **Document any issues** for further refinement

This setup eliminates the schema instability that was causing your connection issues and crashes. 