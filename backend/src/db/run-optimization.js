import pg from 'pg';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_may18',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr'
});

async function runOptimization() {
    try {
        console.log('🚀 Starting database optimization...\n');

        // Read the SQL file
        const sqlFile = await fs.readFile(join(__dirname, 'optimize-and-test.sql'), 'utf8');
        
        // Split the file into individual statements
        const statements = sqlFile.split(';').filter(stmt => stmt.trim());
        
        // Execute each statement
        for (const stmt of statements) {
            if (stmt.trim()) {
                try {
                    const result = await pool.query(stmt);
                    if (result.command === 'CREATE') {
                        console.log(`✅ Created index: ${stmt.split('ON')[1].trim()}`);
                    } else if (result.command === 'SELECT') {
                        console.log('📊 Query results:', result.rows.length, 'rows');
                    }
                } catch (err) {
                    if (!err.message.includes('already exists')) {
                        console.error('❌ Error executing statement:', err.message);
                    }
                }
            }
        }

        console.log('\n✅ Database optimization completed successfully');
    } catch (err) {
        console.error('❌ Error during optimization:', err);
    } finally {
        await pool.end();
    }
}

runOptimization(); 