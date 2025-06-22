@echo off
echo Starting Test Backend Server...
set NODE_ENV=test
set PORT=3002
set DB_NAME_TEST=cpr_jun21_test
cd backend
tsx watch src/index.ts 