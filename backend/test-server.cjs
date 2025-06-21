const express = require('express');
const app = express();
const PORT = 4000;

// Basic middleware
app.use(express.json());

// Test routes
app.get('/', (req, res) => {
  res.json({ message: 'Test server is running!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log(`🔌 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API Health: http://localhost:${PORT}/api/v1/health`);
}); 