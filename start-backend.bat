@echo off
cd backend
set DB_HOST=127.0.0.1
set DB_USER=postgres
set DB_PASSWORD=gtacpr
set DB_PORT=5432
set DB_NAME=cpr_may18
npx tsx src/index.ts 