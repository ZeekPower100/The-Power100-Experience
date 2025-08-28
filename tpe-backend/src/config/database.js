// Default to PostgreSQL unless SQLite is explicitly enabled
// This ensures we use PostgreSQL in production and development by default
if (process.env.USE_SQLITE === 'true') {
  console.log('Using SQLite database (explicitly enabled)');
  module.exports = require('./database.sqlite');
} else {
  console.log('Using PostgreSQL database');
  module.exports = require('./database.postgresql');
}
