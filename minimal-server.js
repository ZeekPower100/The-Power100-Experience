const http = require('http');

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'Minimal server working',
    port: PORT,
    url: req.url,
    method: req.method,
    headers: req.headers
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal HTTP server running on port ${PORT}`);
});

// Keep alive
setInterval(() => {
  console.log(`Still alive at ${new Date().toISOString()}`);
}, 30000);