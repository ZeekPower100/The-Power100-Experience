// Use PostgreSQL if DATABASE_URL is set or SQLite is explicitly disabled
if (process.env.DATABASE_URL || process.env.USE_SQLITE === 'false') {
  console.log('Using PostgreSQL database');
  module.exports = require('./database.postgresql');
} else {
  console.log('Using SQLite database');
  module.exports = require('./database.sqlite');
}
