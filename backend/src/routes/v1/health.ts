import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

// Initialize service clients
const dbPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'cpr_may18',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

// Health check endpoint
router.get('/', async (req, res) => {
    console.log('🔍 [HEALTH] Basic health check requested');

    try {
        // Check database connection
        const client = await dbPool.connect();
        await client.query('SELECT NOW()');
        client.release();

        const health = {
            status: 'UP',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
                database: {
                    status: 'UP',
                    critical: true
                }
            }
        };

        console.log('✅ [HEALTH] Basic health check successful');
        res.status(200).json(health);
    } catch (error) {
        console.error('❌ [HEALTH] Basic health check failed:', error);
        res.status(500).json({
            status: 'DOWN',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

export default router; 