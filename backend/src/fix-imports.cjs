const fs = require('fs');
const path = require('path');

// Files that also need getClient (they use transactions)
const needsGetClient = [
  'accounting.ts', 'course-requests.ts', 'hr-dashboard.ts', 'index.ts',
  'instructor.ts', 'org-billing.ts', 'payRates.ts', 'paymentRequests.ts',
  'payroll.ts', 'timesheet.ts', 'vendor-invoice-admin.ts', 'health.ts',
  'cacheService.ts', 'paymentRequestService.ts', 'scheduledJobs.ts',
  'sessionManager.ts', 'EmailTemplate.ts', 'authController.ts', 'apiSecurity.ts'
];

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files.push(...walk(full));
    else if (f.endsWith('.ts')) files.push(full);
  }
  return files;
}

const allFiles = walk('.').map(f => f.replace(/\\/g, '/'));
const skipFiles = ['config/database.ts', 'config/encryptionDatabase.ts', 'config/mfaDatabase.ts', 'config/securityMonitoringDatabase.ts', 'fix-pool.cjs', 'fix-imports.cjs'];

let changed = 0;
for (const f of allFiles) {
  if (skipFiles.some(s => f.includes(s))) continue;
  if (f.endsWith('.d.ts')) continue;

  let content = fs.readFileSync(f, 'utf8');
  const original = content;
  const basename = path.basename(f);

  const wantsGetClient = needsGetClient.some(n => basename === n);

  // Fix: import { pool } from ... → import { query } or { query, getClient }
  // Match various patterns of pool import from database
  const importRegex = /import\s*\{([^}]*)\}\s*from\s*(['"])(\.\.\/)*config\/database\.js\2/g;

  content = content.replace(importRegex, (match, imports) => {
    const parts = imports.split(',').map(s => s.trim()).filter(Boolean);
    const hasPool = parts.includes('pool');
    if (!hasPool) return match; // doesn't import pool, skip

    const newParts = parts.filter(p => p !== 'pool');
    if (!newParts.includes('query')) newParts.push('query');
    if (wantsGetClient && !newParts.includes('getClient')) newParts.push('getClient');

    const relPath = match.match(/(['"])(\.\.\/)*config\/database\.js\1/)[0];
    return `import { ${newParts.join(', ')} } from ${relPath}`;
  });

  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated import:', f);
    changed++;
  }
}
console.log('Done -', changed, 'files updated');
