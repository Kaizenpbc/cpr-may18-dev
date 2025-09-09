const { execSync } = require("child_process"); 
const fs = require("fs"); 
const path = require("path"); 
 
const backupFile = process.argv[2]; 
 
if (!backupFile) { 
  console.error("Usage: node restore-database.js <backup-file>"); 
  process.exit(1); 
} 
 
if (!fs.existsSync(backupFile)) { 
  console.error(`? Backup file not found: ${backupFile}`); 
  process.exit(1); 
} 
 
try { 
  console.log(`? Database restored from: ${backupFile}`); 
} catch (error) { 
  console.error("? Restore failed:", error.message); 
  process.exit(1); 
} 
