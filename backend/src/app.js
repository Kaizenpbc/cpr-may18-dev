const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const testRoutes = require('./routes/test');
const healthRoutes = require('./routes/health');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/v1/test', testRoutes);
app.use('/api/v1/health', healthRoutes);

// Error handling
app.use((err, req, res, next) => {
    logger.error('Error occurred:', { error: err.message, stack: err.stack });
    res.status(500).json({
        success: false,
        error: {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        }
    });
});

module.exports = app; 