// Root server file for Render deployment
// Load environment variables first
require('dotenv').config();

// Set NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('Starting server with environment:', process.env.NODE_ENV);
console.log('Database URL configured:', !!process.env.DATABASE_URL);
console.log('Port configured:', process.env.PORT || 5000);

// Load and start the backend server
require('./tpe-backend/src/server');