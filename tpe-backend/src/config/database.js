// PostgreSQL configuration
// This ensures we use PostgreSQL in production and development by default
// PostgreSQL is the only supported database
console.log('Using PostgreSQL database');
module.exports = require('./database.postgresql');
