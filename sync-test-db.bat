@echo off
echo ========================================
echo Syncing Test Database Schema
echo ========================================

echo.
echo [1/4] Dropping existing test database...
psql -U postgres -c "DROP DATABASE IF EXISTS cpr_jun21_test;"

echo.
echo [2/4] Creating fresh test database...
psql -U postgres -c "CREATE DATABASE cpr_jun21_test;"

echo.
echo [3/4] Copying schema from development database...
pg_dump -h localhost -U postgres -d cpr_jun21 --schema-only | psql -h localhost -U postgres -d cpr_jun21_test

echo.
echo [4/4] Seeding test data...
cd backend
npm run seed:test-data

echo.
echo ========================================
echo Test Database Sync Complete!
echo ========================================
echo.
echo Test Database: cpr_jun21_test
echo Test Credentials:
echo - Admin: admin@test.com / test123
echo - Instructor: instructor@test.com / test123
echo - Student: student@test.com / test123
echo.
pause 