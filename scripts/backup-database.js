const { execSync } = require("child_process"); 
const fs = require("fs"); 
const path = require("path"); 
 
const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); 
const backupDir = path.join(__dirname, "..", "backups"); 
const backupFile = path.join(backupDir, `database-backup-${timestamp}.sql`); 
 
if (!fs.existsSync(backupDir)) { 
  fs.mkdirSync(backupDir, { recursive: true }); 
} 
 
try { 
  execSync(`docker-compose exec -T postgres pg_dump -U postgres cpr_may18 , { stdio: "inherit" }); 
  console.log(`? Database backup created: ${backupFile}`); 
} catch (error) { 
  console.error("? Backup failed:", error.message); 
  process.exit(1); 
} 
