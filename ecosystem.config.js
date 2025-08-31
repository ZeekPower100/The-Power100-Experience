module.exports = {
  apps: [
    {
      name: 'tpe-backend',
      script: 'node',
      args: 'tpe-backend/src/server.js',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/home/ubuntu/The-Power100-Experience',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        NODE_TLS_REJECT_UNAUTHORIZED: '0'
      }
    },
    {
      name: 'tpe-frontend',
      script: 'node',
      args: '../node_modules/next/dist/bin/next start',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/home/ubuntu/The-Power100-Experience/tpe-front-end',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
