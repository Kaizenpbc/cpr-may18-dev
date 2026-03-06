#!/usr/bin/env python3
"""Patch init-db.js to replace INSERT...SELECT with INSERT...ON CONFLICT DO NOTHING"""

filepath = '/home/kaizenmo/cpr.kpbc.ca/backend/dist/scripts/init-db.js'

with open(filepath, 'r') as f:
    content = f.read()

# Pattern 1: the loop over defaultUsers with INSERT...SELECT
old1 = """            for (const user of defaultUsers) {
                await pool.query(`
          INSERT INTO users (username, email, password_hash, role)
          SELECT $1, $2, $3, $4
          WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE username = $1 OR email = $2
          )
        `, [user.username, user.email, passwordHash, user.role]);
            }"""

new1 = """            for (const user of defaultUsers) {
                try {
                    await pool.query(
                        "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING",
                        [user.username, user.email, passwordHash, user.role]
                    );
                } catch(e) { console.log("Skip user " + user.username + ":", e.message); }
            }"""

# Pattern 2: the orguser INSERT...SELECT
old2 = """            await pool.query(`
        INSERT INTO users (username, email, password_hash, role, organization_id)
        SELECT 'orguser', 'orguser@cpr.com', $1, 'organization', $2
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE username = 'orguser' OR email = 'orguser@cpr.com'
        )
      `, [passwordHash, testOrgId]);"""

new2 = """            try {
                await pool.query(
                    "INSERT INTO users (username, email, password_hash, role, organization_id) VALUES ('orguser', 'orguser@cpr.com', $1, 'organization', $2) ON CONFLICT (username) DO NOTHING",
                    [passwordHash, testOrgId]
                );
            } catch(e) { console.log("Skip orguser:", e.message); }"""

if old1 in content:
    content = content.replace(old1, new1)
    print("Patched pattern 1 (defaultUsers loop) OK")
else:
    print("ERROR: pattern 1 not found!")

if old2 in content:
    content = content.replace(old2, new2)
    print("Patched pattern 2 (orguser) OK")
else:
    print("ERROR: pattern 2 not found!")

with open(filepath, 'w') as f:
    f.write(content)

print("Done.")
