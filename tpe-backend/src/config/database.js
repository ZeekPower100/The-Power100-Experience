// Use PostgreSQL in production, SQLite in development
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  console.log('Using PostgreSQL database');
  module.exports = require('./database.postgresql');
} else {
  console.log('Using SQLite database');
  module.exports = require('./database.sqlite');
}
