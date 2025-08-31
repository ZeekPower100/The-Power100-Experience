// Default to PostgreSQL unless SQLite is explicitly enabled
// This ensures we use PostgreSQL in production and development by default
// Always use PostgreSQL - SQLite support has been removed
console.log('Using PostgreSQL database');
module.exports = require('./database.postgresql');
