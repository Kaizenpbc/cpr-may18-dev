const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files.push(...walk(full));
    else if (f.endsWith('.ts')) files.push(full);
  }
  return files;
}

const allFiles = walk('.');
let changed = 0;

for (const f of allFiles) {
  if (f.endsWith('.d.ts') || f.includes('fix-')) continue;

  let content = fs.readFileSync(f, 'utf8');
  const original = content;

  // 1. ILIKE → LIKE (MySQL LIKE is case-insensitive by default on utf8mb4_general_ci)
  content = content.replace(/\bILIKE\b/g, 'LIKE');

  // 2. ::date cast removal — common patterns
  // e.g.  col::date  →  col  (when it's just a cast on a column/param)
  // Be careful: $1::date in WHERE clauses → just $1
  // cr.completed_at::date → DATE(cr.completed_at)
  // .date::date → .date (already a date column)
  // $N::date → $N
  content = content.replace(/(\$\d+)::date/g, '$1');
  content = content.replace(/(\w+\.\w+)::date\b/g, 'DATE($1)');
  content = content.replace(/(\w+)::date\b(?!\s*\))/g, 'DATE($1)');

  // 3. ::text → cast removed (MySQL returns text naturally)
  content = content.replace(/(\w+(?:\.\w+)*)::text/g, '$1');
  content = content.replace(/(\$\d+)::text/g, '$1');

  // 4. ::int → CAST(x AS SIGNED) - simplify to just remove when after COUNT(*)
  // COUNT(*)::int → COUNT(*)
  content = content.replace(/COUNT\(\*\)::int/g, 'COUNT(*)');
  content = content.replace(/COUNT\(\s*DISTINCT[^)]*\)::int/g, m => m.replace(/::int$/, ''));
  content = content.replace(/\)::int\b/g, ')');  // (subquery)::int → (subquery)

  // 5. ::numeric / ::integer → remove
  content = content.replace(/::numeric(\[\])?/g, '');
  content = content.replace(/::integer/g, '');

  // 6. INTERVAL 'N unit' → INTERVAL N UNIT  (remove quotes, uppercase unit)
  // Handle common patterns: '30 days', '60 days', '90 days', '1 year', '24 hours', '60 seconds', '1 month', '11 months', '6 days'
  content = content.replace(/INTERVAL\s+'(\d+)\s+(day|days|month|months|year|years|hour|hours|minute|minutes|second|seconds)'/gi,
    (m, n, unit) => `INTERVAL ${n} ${unit.toUpperCase().replace(/S$/, '')}`);

  // 7. '1 month'::interval → INTERVAL 1 MONTH
  content = content.replace(/'1 month'::interval/g, 'INTERVAL 1 MONTH');

  // 8. Template literal INTERVAL '${n} days' → INTERVAL ${n} DAY  etc.
  content = content.replace(/INTERVAL\s+'\$\{([^}]+)\}\s+(day|days|month|months)'/gi,
    (m, expr, unit) => `INTERVAL \${${expr}} ${unit.toUpperCase().replace(/S$/, '')}`);

  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('SQL-fixed:', f);
    changed++;
  }
}
console.log('Done -', changed, 'files updated');
