// Ultra-simple test server for Render
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch all for debugging
app.use('*', (req, res) => {
  console.log(`404 - Path not found: ${req.originalUrl}`);
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple server running on port ${PORT}`);
  console.log(`Server is listening on all interfaces (0.0.0.0)`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  
  // Keep the process alive
  setInterval(() => {
    console.log(`Server still running at ${new Date().toISOString()}`);
  }, 60000); // Log every minute
});

// Handle errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});