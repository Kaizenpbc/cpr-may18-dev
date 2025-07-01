const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const port = 3001;

// Database connection to cpr_jun21
const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21', // FORCED: Always use cpr_jun21 for stability
});

// Fix CORS configuration for credentials
app.use(cors({
  origin: 'http://localhost:5173', // Specific origin instead of wildcard
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/api/v1/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT current_database(), NOW()');
    res.json({
      status: 'ok',
      database: result.rows[0].current_database,
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Authentication endpoints
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    console.log('🔐 [LOGIN] Request received:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    
    const { username, password } = req.body;
    
    console.log('🔐 [LOGIN] Credentials:', { username, password });
    
    // Simple authentication for testing
    if (username === 'instructor' && password === 'test123') {
      console.log('✅ [LOGIN] Authentication successful');
      res.json({
        success: true,
        data: {
          accessToken: 'test-token-123',
          user: {
            id: 4827,
            username: 'instructor',
            role: 'instructor'
          }
        }
      });
    } else {
      console.log('❌ [LOGIN] Authentication failed - invalid credentials');
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('❌ [LOGIN] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/auth/me', async (req, res) => {
  try {
    // Simple auth check - return instructor user
    res.json({
      success: true,
      user: {
        id: 4827,
        username: 'instructor',
        role: 'instructor'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test instructor classes endpoint
app.get('/api/v1/instructor/classes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.instructor_id,
        c.class_type_id,
        c.start_time,
        c.end_time,
        c.status,
        c.location,
        ct.name as course_name
      FROM classes c
      JOIN class_types ct ON c.class_type_id = ct.id
      WHERE c.instructor_id = 4827
      LIMIT 5
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Add missing endpoints that frontend expects
app.get('/api/v1/events', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Credentials': 'true'
  });
  
  // Send initial connection message
  res.write('data: {"type":"connected","message":"SSE connection established"}\n\n');
  
  // Keep connection alive
  const interval = setInterval(() => {
    res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);
  
  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

app.get('/api/v1/instructor/availability', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/v1/instructor/classes/completed', (req, res) => {
  res.json({ success: true, data: [] });
});

// Add missing endpoint for instructor classes today
app.get('/api/v1/instructor/classes/today', (req, res) => {
  res.json({ success: true, data: [] });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Handle any custom events here
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });
});

// Start server
server.listen(port, () => {
  console.log(`🚀 Simple server running on http://localhost:${port}`);
  console.log(`📊 Connected to database: cpr_jun21`);
  console.log(`🔧 CORS configured for http://localhost:5173`);
  console.log(`🔌 WebSocket/Socket.IO enabled`);
  console.log(`📡 SSE endpoint available at /api/v1/events`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
}); 