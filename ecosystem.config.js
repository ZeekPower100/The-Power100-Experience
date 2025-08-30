module.exports = {
  apps: [
    {
      name: 'tpe-backend',
      script: './tpe-backend/src/server.js',
      cwd: '/home/ubuntu/The-Power100-Experience',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/home/ubuntu/.pm2/logs/tpe-backend-error.log',
      out_file: '/home/ubuntu/.pm2/logs/tpe-backend-out.log',
      
      // Pre-start health check
      min_uptime: '10s',
      max_restarts: 3,
      
      // Post-start monitoring
      listen_timeout: 3000,
      kill_timeout: 5000,
      
      // Restart conditions
      restart_delay: 4000,
      autorestart: true,
      
      // Pre-hook to ensure dependencies
      pre_restart_hook: function() {
        const { execSync } = require('child_process');
        try {
          // Ensure symlink exists
          execSync('cd /home/ubuntu/The-Power100-Experience/tpe-backend && [ -L node_modules ] || ln -sf ../node_modules node_modules');
          console.log('✅ Backend symlink verified');
        } catch (err) {
          console.error('❌ Failed to verify backend setup:', err);
        }
      }
    },
    {
      name: 'tpe-frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/ubuntu/The-Power100-Experience/tpe-front-end',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      interpreter: 'node',
      error_file: '/home/ubuntu/.pm2/logs/tpe-frontend-error.log',
      out_file: '/home/ubuntu/.pm2/logs/tpe-frontend-out.log'
    }
  ]
};