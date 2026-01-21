const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'cpr_jun21',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function resetPassword() {
    try {
        console.log('Resetting instructor password to: password123');

        const hashedPassword = await bcrypt.hash('password123', 10);

        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username',
            [hashedPassword, 'instructor']
        );

        if (result.rows.length > 0) {
            console.log('✅ Password reset successfully for user:', result.rows[0].username);
        } else {
            console.log('⚠️ User "instructor" not found');
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
        process.exit(1);
    }
}

resetPassword();
