const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

router.get('/test-logs', (req, res) => {
    // Generate different types of logs
    logger.info('Test info log', { endpoint: '/test-logs', method: 'GET' });
    logger.warn('Test warning log', { memory: process.memoryUsage() });
    logger.error('Test error log', { error: 'This is a test error' });
    
    // Log some performance metrics
    logger.info('Performance metrics', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    });

    res.json({ message: 'Test logs generated successfully' });
});

module.exports = router; 