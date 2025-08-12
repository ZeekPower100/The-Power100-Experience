// Test API connection from Node.js
const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing login to http://localhost:5000/api/auth/login');
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@power100.io',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    console.log('Response:', data);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();