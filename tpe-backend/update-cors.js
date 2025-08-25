const fs = require('fs');
const content = fs.readFileSync('src/server.js', 'utf8');
const updated = content.replace(
  /origin: \[[\s\S]*?\]/,
  `origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'https://tpx.power100.io',
    'http://tpx.power100.io',
    'http://3.95.250.211:3000',
    process.env.FRONTEND_URL
  ]`
);
fs.writeFileSync('src/server.js', updated);
console.log('CORS updated');
