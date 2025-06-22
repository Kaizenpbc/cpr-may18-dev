# Test Environment Setup Guide

## Overview
The test environment provides a completely isolated testing setup that runs alongside your development environment without any interference.

## Architecture
- **Test Backend**: Port 3002 (vs Development: 3001)
- **Test Frontend**: Port 5174 (vs Development: 5173)
- **Test Database**: `cpr_jun21_test` (vs Development: `cpr_jun21`)
- **Test Redis**: Port 6380 (vs Development: 6379)

## Quick Start

### 1. Start Test Environment
```bash
# Windows
start-test-env.bat

# Manual start
cd backend && npm run dev:test
cd frontend && npm run dev:test
```

### 2. Seed Test Data
```bash
cd backend
npm run seed:test-data
```

### 3. Access Test Environment
- **Backend API**: http://localhost:3002
- **Frontend**: http://localhost:5174
- **Health Check**: http://localhost:3002/api/v1/health

## Test Credentials
After seeding test data, you can use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | test123 |
| Instructor | instructor@test.com | test123 |
| Student | student@test.com | test123 |

## Available Scripts

### Backend Scripts
```bash
npm run dev:test          # Start test backend server
npm run migrate:test      # Run migrations on test database
npm run seed:test         # Run seeds on test database
npm run seed:test-data    # Seed custom test data
npm run test              # Run Jest tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage
```

### Frontend Scripts
```bash
npm run dev:test          # Start test frontend server
npm run build:test        # Build for test environment
npm run test              # Run Vitest tests
npm run test:ui           # Run tests with UI
npm run test:coverage     # Run tests with coverage
```

## Database Management

### Reset Test Database
```bash
# Drop and recreate test database
psql -U postgres -c "DROP DATABASE IF EXISTS cpr_jun21_test;"
psql -U postgres -c "CREATE DATABASE cpr_jun21_test;"

# Copy schema from development
pg_dump -h localhost -U postgres -d cpr_jun21 --schema-only | psql -h localhost -U postgres -d cpr_jun21_test

# Seed test data
cd backend && npm run seed:test-data
```

### View Test Data
```bash
# Connect to test database
psql -h localhost -U postgres -d cpr_jun21_test

# List tables
\dt

# View test users
SELECT id, username, email, role FROM users;
```

## Environment Variables

### Backend (.env.test)
```env
NODE_ENV=test
PORT=3002
DB_NAME_TEST=cpr_jun21_test
JWT_SECRET=test_jwt_secret_key_for_testing_only
```

### Frontend (vite.config.test.ts)
```typescript
define: {
  'process.env.NODE_ENV': '"test"',
  'process.env.VITE_API_URL': '"http://localhost:3002"',
}
```

## Testing Workflow

### 1. Development Workflow
```bash
# Start development environment
start-dev.bat

# Make changes to code
# Test in development environment
# Commit changes
```

### 2. Test Environment Workflow
```bash
# Start test environment
start-test-env.bat

# Test new features in isolation
# Run automated tests
# Verify no impact on development data
```

### 3. Parallel Testing
Both environments can run simultaneously:
- Development: http://localhost:3001 (backend) + http://localhost:5173 (frontend)
- Test: http://localhost:3002 (backend) + http://localhost:5174 (frontend)

## Troubleshooting

### Port Conflicts
If you get port conflicts:
```bash
# Check what's using the ports
netstat -ano | findstr ":3002\|:5174"

# Kill processes if needed
taskkill /f /pid <PID>
```

### Database Issues
```bash
# Check database connection
psql -h localhost -U postgres -d cpr_jun21_test -c "SELECT 1;"

# Reset test database
npm run migrate:test
npm run seed:test-data
```

### Frontend Proxy Issues
If the frontend can't connect to the test backend:
1. Check that the test backend is running on port 3002
2. Verify the proxy configuration in `vite.config.test.ts`
3. Check browser console for CORS errors

## Best Practices

### 1. Data Isolation
- Never use test database for development
- Always seed fresh test data before testing
- Use different user accounts for test vs development

### 2. Testing Strategy
- Test new features in test environment first
- Use automated tests to verify functionality
- Test edge cases and error scenarios

### 3. Environment Management
- Keep test environment configuration separate
- Use environment-specific variables
- Document any environment-specific requirements

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Test Environment
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run migrate:test
      - run: npm run seed:test-data
      - run: npm run test
```

## Monitoring and Logging

### Test Environment Logs
- Backend logs: `backend/logs/test.log`
- Frontend logs: Browser console
- Database logs: PostgreSQL logs

### Health Checks
```bash
# Backend health
curl http://localhost:3002/api/v1/health

# Database health
psql -h localhost -U postgres -d cpr_jun21_test -c "SELECT 1;"
```

## Security Considerations

### Test Environment Security
- Use separate JWT secrets for test environment
- Disable production features in test environment
- Use test email services (Ethereal, Mailtrap)
- Never expose test environment to production

### Data Privacy
- Test data should not contain real personal information
- Use fake data generators for testing
- Clear test data regularly
- Follow data protection regulations even in test environments 