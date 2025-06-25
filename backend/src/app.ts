import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();

// Add request logger before other middleware
app.use(requestLogger);

// ... existing code ... 