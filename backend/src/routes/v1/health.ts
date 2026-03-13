import { Router } from 'express';
import { pool } from '../../config/database.js';
import { devLog } from '../../utils/devLog.js';
import { getSafeErrorMessage } from '../../utils/errorHandler.js';

const router = Router();

// Health check endpoint
router.get('/', async (req, res) => {
    devLog('🔍 [HEALTH] Basic health check requested');

    try {
        // Check database connection
        const client = await pool.connect();
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

        devLog('✅ [HEALTH] Basic health check successful');
        res.status(200).json(health);
    } catch (error) {
        console.error('❌ [HEALTH] Basic health check failed:', error);
        res.status(500).json({
            status: 'DOWN',
            error: getSafeErrorMessage(error, 'Health check failed'),
            timestamp: new Date().toISOString()
        });
    }
});

export default router; 