// Simple script to start the server with SQLite mode
process.env.USE_SQLITE = 'true';
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'your-test-jwt-secret-key-for-development-only';
process.env.PORT = '5001';
process.env.FRONTEND_URL = 'http://localhost:3002';

console.log('🚀 Starting Power100 Backend in SQLite mode...');
console.log('📊 Database: SQLite (in-memory)');
console.log('🔑 JWT: Development secret');
console.log('🌐 Port: 5001');

// Start the server
require('./src/server.js');