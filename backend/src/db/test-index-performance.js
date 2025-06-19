const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_may18',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

async function measureQueryPerformance(query, params = []) {
    const start = performance.now();
    const result = await pool.query(query, params);
    const duration = performance.now() - start;
    return { duration, rowCount: result.rowCount };
}

async function testIndexes() {
    console.log('🔍 Testing query performance with new indexes...\n');

    // Test 1: Course requests with organization and type
    const test1 = await measureQueryPerformance(`
        SELECT cr.*, o.name as org_name, ct.name as course_type
        FROM course_requests cr
        JOIN organizations o ON cr.organization_id = o.id
        JOIN class_types ct ON cr.course_type_id = ct.id
        LIMIT 100
    `);
    console.log('Test 1 - Course requests with org and type:');
    console.log(`Duration: ${test1.duration.toFixed(2)}ms`);
    console.log(`Rows returned: ${test1.rowCount}\n`);

    // Test 2: Invoices with organization and course
    const test2 = await measureQueryPerformance(`
        SELECT i.*, o.name as org_name, cr.id as course_id
        FROM invoices i
        JOIN organizations o ON i.organization_id = o.id
        LEFT JOIN course_requests cr ON i.course_request_id = cr.id
        LIMIT 100
    `);
    console.log('Test 2 - Invoices with org and course:');
    console.log(`Duration: ${test2.duration.toFixed(2)}ms`);
    console.log(`Rows returned: ${test2.rowCount}\n`);

    // Test 3: Course students with request details
    const test3 = await measureQueryPerformance(`
        SELECT cs.*, cr.id as request_id, o.name as org_name
        FROM course_students cs
        JOIN course_requests cr ON cs.course_request_id = cr.id
        JOIN organizations o ON cr.organization_id = o.id
        LIMIT 100
    `);
    console.log('Test 3 - Course students with request details:');
    console.log(`Duration: ${test3.duration.toFixed(2)}ms`);
    console.log(`Rows returned: ${test3.rowCount}\n`);

    // Verify indexes exist
    const indexCheck = await pool.query(`
        SELECT schemaname, tablename, indexname, indexdef
        FROM pg_indexes
        WHERE indexname LIKE 'idx_%'
        ORDER BY tablename, indexname
    `);
    
    console.log('📊 Index Verification:');
    indexCheck.rows.forEach(index => {
        console.log(`\nTable: ${index.tablename}`);
        console.log(`Index: ${index.indexname}`);
        console.log(`Definition: ${index.indexdef}`);
    });

    await pool.end();
}

testIndexes().catch(console.error); 