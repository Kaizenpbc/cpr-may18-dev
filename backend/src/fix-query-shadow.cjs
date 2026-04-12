/**
 * Fix "query" variable shadowing the imported query() function.
 * Renames local `let query`, `const query`, `query +=`, `query =` (string assignment)
 * to `sql` within each handler block — WITHOUT touching the imported `query(` calls.
 *
 * Strategy: replace `const query = \`` and `let query` / standalone `query =`
 * (as SQL string assignment) with `sql`, then replace `query(query,` with `query(sql,`
 * and `query(query)` with `query(sql)`.
 */
const fs = require('fs');
const path = require('path');

const files = [
  'services/NotificationService.ts',
  'services/organizationPricingService.ts',
  'services/vendorDetectionService.ts',
  'routes/v1/sysadmin-entities.ts',
  'routes/v1/vendor.ts',
  'routes/v1/organization.ts',
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) {
    console.log('SKIP (not found):', file);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Step 1: rename `let query =` or `let query,` or `const query =` declarations
  // that assign a string (SQL) value — NOT function declarations
  // Detect pattern: `let query` or `const query` followed by assignment to string/template
  content = content.replace(/\blet query\b/g, 'let sql');
  content = content.replace(/\bconst query\s*=/g, 'const sql =');

  // Step 2: rename `query +=` (SQL string concat) to `sql +=`
  content = content.replace(/\bquery\s*\+=/g, 'sql +=');

  // Step 3: rename standalone `query =` (re-assignment, not function call)
  // Only match `query =` where it is NOT followed by `(` (that would be a call)
  // and NOT preceded by `await ` or `.`
  // Pattern: word boundary, `query`, space*, `=`, space*, not `=` (not ===), not `(`
  content = content.replace(/(?<!\.\s*)(?<!await\s)\bquery\s*=\s*(?!=)(?!\()/g, (match, offset) => {
    // Check surrounding context to avoid matching inside function calls
    return 'sql = ';
  });

  // Step 4: rename `query(query,` → `query(sql,` and `query(query)` → `query(sql)`
  content = content.replace(/\bquery\(query\b/g, 'query(sql');

  // Step 5: rename `${query}` template interpolation → `${sql}`
  content = content.replace(/\$\{query\}/g, '${sql}');

  // Step 6: rename standalone `query` in comments that say "execute query"
  // Actually skip — don't touch comments

  fs.writeFileSync(fullPath, content);
  console.log('Fixed:', file);
}
