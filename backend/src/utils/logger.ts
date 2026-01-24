import winston from 'winston';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Production: only warnings and errors
// Development: info and above
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'info' : 'warn');

const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Development-only logging helper
const devLog = (...args: unknown[]) => {
    if (isDevelopment) {
        console.log(...args);
    }
};

// Export both logger and devLog utility
export { logger, devLog }; 