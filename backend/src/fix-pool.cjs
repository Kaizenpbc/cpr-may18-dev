const fs = require('fs');
const path = require('path');

const skipFiles = ['routes/v1/database.ts', 'config/database.ts', 'config/encryptionDatabase.ts', 'config/mfaDatabase.ts', 'config/securityMonitoringDatabase.ts'];

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files.push(...walk(full));
    else if (f.endsWith('.ts')) files.push(full);
  }
  return files;
}

const allFiles = walk('.').map(f => f.replace(/\\/g, '/').replace('./', ''));
const toProcess = allFiles.filter(f => !skipFiles.some(s => f.includes(s)) && !f.endsWith('.d.ts'));

let changed = 0;
for (const f of toProcess) {
  let content = fs.readFileSync(f, 'utf8');
  const original = content;
  content = content.replace(/\bpool\.query(<[^>]*>)?\(/g, 'query$1(');
  content = content.replace(/await pool\.connect\(\)/g, 'await getClient()');
  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated:', f);
    changed++;
  }
}
console.log('Done -', changed, 'files updated');
