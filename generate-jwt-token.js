const jwt = require('jsonwebtoken');

// This should match your JWT_SECRET in .env.development
const JWT_SECRET = 'dev-secret-change-in-production-to-something-very-secure';

// Generate a token that lasts for 30 days
const token = jwt.sign(
  {
    id: 2,  // Admin user ID
    email: 'admin@power100.io'
  },
  JWT_SECRET,
  {
    expiresIn: '30d'
  }
);

console.log('🔑 New JWT Token (valid for 30 days):');
console.log('=====================================');
console.log(token);
console.log('=====================================');
console.log('\n📝 Update this in your n8n workflow HTTP Request node:');
console.log('Authorization: Bearer ' + token);