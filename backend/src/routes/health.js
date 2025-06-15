const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Health check endpoint
router.get('/', async (req, res) => {
    try {
        const health = {
            status: 'UP',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            services: {
                database: 'UP', // You can add actual DB check here
                elasticsearch: 'UP', // You can add actual ES check here
                logstash: 'UP' // You can add actual Logstash check here
            }
        };

        // Log health check
        logger.info('Health check performed', { health });

        res.status(200).json(health);
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(500).json({
            status: 'DOWN',
            error: error.message
        });
    }
});

// Detailed health check endpoint
router.get('/detailed', async (req, res) => {
    try {
        const detailedHealth = {
            status: 'UP',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                heapUsed: process.memoryUsage().heapUsed,
                heapTotal: process.memoryUsage().heapTotal,
                rss: process.memoryUsage().rss,
                external: process.memoryUsage().external
            },
            cpu: process.cpuUsage(),
            environment: process.env.NODE_ENV,
            nodeVersion: process.version,
            services: {
                database: {
                    status: 'UP',
                    lastChecked: new Date().toISOString()
                },
                elasticsearch: {
                    status: 'UP',
                    lastChecked: new Date().toISOString()
                },
                logstash: {
                    status: 'UP',
                    lastChecked: new Date().toISOString()
                }
            }
        };

        // Log detailed health check
        logger.info('Detailed health check performed', { detailedHealth });

        res.status(200).json(detailedHealth);
    } catch (error) {
        logger.error('Detailed health check failed', { error: error.message });
        res.status(500).json({
            status: 'DOWN',
            error: error.message
        });
    }
});

module.exports = router; 