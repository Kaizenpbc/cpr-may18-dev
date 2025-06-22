# Test Environment Synchronization Guide

## 🔄 **Overview**

Keeping your test environment up to date is essential for effective testing. This guide covers different synchronization strategies based on your needs.

## 📋 **Synchronization Strategies**

### **Strategy 1: Full Database Reset (Recommended for Major Changes)**

**When to use:**
- After major schema changes
- When you want a completely fresh test environment
- Before running comprehensive tests

**Command:**
```bash
# Windows
sync-test-db.bat

# Manual steps
psql -U postgres -c "DROP DATABASE IF EXISTS cpr_jun21_test;"
psql -U postgres -c "CREATE DATABASE cpr_jun21_test;"
pg_dump -h localhost -U postgres -d cpr_jun21 --schema-only | psql -h localhost -U postgres -d cpr_jun21_test
cd backend && npm run seed:test-data
```

**Pros:**
- ✅ Guarantees complete synchronization
- ✅ Removes any test data inconsistencies
- ✅ Simple and reliable

**Cons:**
- ❌ Loses all test data
- ❌ Takes longer to complete

### **Strategy 2: Migration-Based Sync (Recommended for Regular Updates)**

**When to use:**
- After adding new migrations
- For incremental updates
- When you want to preserve some test data

**Command:**
```bash
cd backend
npm run sync:test
```

**What it does:**
- Runs pending migrations on test database
- Applies new seeds
- Preserves existing test data

**Pros:**
- ✅ Fast and efficient
- ✅ Preserves test data
- ✅ Handles incremental changes

**Cons:**
- ❌ May not catch all schema differences
- ❌ Requires proper migration management

### **Strategy 3: Full Sync (Recommended for Development Workflow)**

**When to use:**
- After making database changes
- Before testing new features
- Regular maintenance

**Command:**
```bash
cd backend
npm run sync:test-full
```

**What it does:**
- Runs all migrations
- Seeds fresh test data
- Ensures test environment is current

## 🛠 **Available Sync Commands**

### **Backend Commands**
```bash
# Quick migration sync
npm run sync:test

# Full sync (migrations + fresh test data)
npm run sync:test-full

# Manual migration sync
npm run migrate:test

# Manual test data seeding
npm run seed:test-data

# Check migration status
npm run migrate:status
```

### **Database Commands**
```bash
# Full database reset
sync-test-db.bat

# Manual schema copy
pg_dump -h localhost -U postgres -d cpr_jun21 --schema-only | psql -h localhost -U postgres -d cpr_jun21_test

# Check database differences
pg_dump -h localhost -U postgres -d cpr_jun21 --schema-only > dev_schema.sql
pg_dump -h localhost -U postgres -d cpr_jun21_test --schema-only > test_schema.sql
diff dev_schema.sql test_schema.sql
```

## 📅 **Recommended Sync Schedule**

### **Daily Development**
```bash
# Start of day
npm run sync:test

# After making database changes
npm run sync:test-full
```

### **Weekly Maintenance**
```bash
# Full reset to ensure consistency
sync-test-db.bat
```

### **Before Major Testing**
```bash
# Complete fresh environment
sync-test-db.bat
npm run seed:test-data
```

## 🔍 **Verification Steps**

### **1. Check Migration Status**
```bash
cd backend
npm run migrate:status
```

**Expected Output:**
```
Batch 1: 20250619203051_001_initial_schema.cjs
Batch 2: 20250619204614_002_additional_tables.cjs
```

### **2. Verify Schema Synchronization**
```sql
-- Connect to test database
psql -h localhost -U postgres -d cpr_jun21_test

-- Check table count
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Compare with development
-- (Run same query on cpr_jun21 database)
```

### **3. Test Data Verification**
```sql
-- Check test users exist
SELECT username, email, role FROM users WHERE email LIKE '%@test.com';

-- Check test organization
SELECT name FROM organizations WHERE name = 'Test Organization';

-- Check test course types
SELECT name FROM course_types WHERE name LIKE 'CPR%';
```

## 🚨 **Troubleshooting Sync Issues**

### **Migration Conflicts**
```bash
# Check migration status
npm run migrate:status

# Rollback if needed
npm run migrate:rollback

# Reset and start fresh
sync-test-db.bat
```

### **Schema Mismatches**
```bash
# Compare schemas
pg_dump -h localhost -U postgres -d cpr_jun21 --schema-only > dev_schema.sql
pg_dump -h localhost -U postgres -d cpr_jun21_test --schema-only > test_schema.sql
diff dev_schema.sql test_schema.sql

# If differences found, do full reset
sync-test-db.bat
```

### **Test Data Issues**
```bash
# Reset test data only
cd backend
npm run seed:test-data

# Or full reset
sync-test-db.bat
```

## 🔄 **Automated Sync Workflow**

### **Git Hooks (Optional)**
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Sync test environment before commit
cd backend
npm run sync:test
```

### **Scheduled Sync (Optional)**
Create a scheduled task to run daily:
```bash
# Windows Task Scheduler
# Command: sync-test-db.bat
# Schedule: Daily at 9:00 AM
```

## 📊 **Sync Monitoring**

### **Track Sync History**
```bash
# Create sync log
echo "$(date): Test environment synced" >> sync.log

# Check last sync
tail -1 sync.log
```

### **Monitor Database Size**
```sql
-- Check test database size
SELECT pg_size_pretty(pg_database_size('cpr_jun21_test'));

-- Compare with development
SELECT pg_size_pretty(pg_database_size('cpr_jun21'));
```

## 🎯 **Best Practices**

### **1. Regular Sync Schedule**
- **Daily**: Run `npm run sync:test` at start of day
- **Weekly**: Run `sync-test-db.bat` for full reset
- **Before Testing**: Always sync before running tests

### **2. Migration Management**
- Always create migrations for schema changes
- Test migrations on test environment first
- Keep migration files in version control

### **3. Test Data Management**
- Use consistent test data across team
- Document test data requirements
- Keep test data realistic but safe

### **4. Verification**
- Always verify sync completed successfully
- Test basic functionality after sync
- Monitor for sync-related issues

## 📞 **Quick Reference**

| Task | Command | When to Use |
|------|---------|-------------|
| Quick Sync | `npm run sync:test` | Daily, after changes |
| Full Sync | `npm run sync:test-full` | Before testing |
| Complete Reset | `sync-test-db.bat` | Weekly, major changes |
| Check Status | `npm run migrate:status` | Troubleshooting |
| Verify Data | `npm run seed:test-data` | After sync issues |

---

**Remember**: A well-synchronized test environment is the foundation of reliable testing! 