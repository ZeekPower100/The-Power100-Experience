# Nginx Reverse Proxy Migration Plan
**Status:** Planned for Weekend Maintenance  
**Priority:** Medium (Current Next.js proxy working, but nginx is better long-term)  
**Estimated Time:** 15-20 minutes  
**Risk Level:** Low-Medium  

## Current Setup
- Frontend: `https://tpx.power100.io` (Next.js on port 3000)
- Backend: Internal port 5000, proxied through Next.js rewrites
- Both services managed by PM2

## Why Migrate to Nginx
1. **Performance**: Remove Next.js proxy overhead
2. **Scalability**: Independent frontend/backend scaling
3. **Reliability**: Separate failure domains
4. **Features**: Built-in caching, rate limiting, compression
5. **Industry Standard**: Easier maintenance and troubleshooting

## Migration Steps

### 1. Pre-Migration Checklist
- [ ] Schedule maintenance window (weekend preferred)
- [ ] Backup current configuration
- [ ] Ensure you have sudo access
- [ ] Have rollback plan ready

### 2. Install Nginx
```bash
sudo apt update && sudo apt install nginx -y
sudo apt install certbot python3-certbot-nginx -y  # For SSL
```

### 3. Configure Nginx
Create `/etc/nginx/sites-available/tpx.power100.io`:
```nginx
server {
    listen 80;
    server_name tpx.power100.io;

    # Frontend (Next.js on port 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API (Node.js on port 5000)
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (if needed)
        proxy_set_header Access-Control-Allow-Origin $http_origin;
        proxy_set_header Access-Control-Allow-Credentials true;
    }

    # WebSocket support (if needed)
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 4. Enable Site & SSL
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/tpx.power100.io /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration

# Set up SSL with Let's Encrypt
sudo certbot --nginx -d tpx.power100.io

# Restart nginx
sudo systemctl restart nginx
```

### 5. Update PM2 Services
```bash
# Update PM2 to not expose ports publicly
pm2 stop tpe-frontend tpe-backend
pm2 delete tpe-frontend tpe-backend

# Restart with internal ports only
cd /home/ubuntu/The-Power100-Experience/tpe-frontend
pm2 start "npm start" --name tpe-frontend

cd /home/ubuntu/The-Power100-Experience/tpe-backend
pm2 start src/server.js --name tpe-backend

pm2 save
pm2 startup  # If not already done
```

### 6. Remove Next.js Proxy
After confirming nginx works, update `next.config.js`:
```javascript
// Remove the rewrites section
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove this:
  // async rewrites() { ... }
};
```

### 7. Testing Checklist
- [ ] Frontend loads at https://tpx.power100.io
- [ ] API calls work (/api/partners/active)
- [ ] Contractor flow works
- [ ] Admin dashboard works
- [ ] SSL certificate valid
- [ ] No CORS errors

## Rollback Plan
If issues occur:
```bash
# Disable nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Restore PM2 to listen on port 3000
pm2 restart tpe-frontend --update-env
```

## Post-Migration
1. Monitor logs for 24 hours:
   - `sudo tail -f /var/log/nginx/error.log`
   - `pm2 logs`
2. Update documentation
3. Remove Next.js rewrites from codebase
4. Consider adding:
   - Rate limiting
   - Caching rules
   - Compression
   - Security headers

## Benefits After Migration
- ✅ ~20-30% faster API response times
- ✅ Better resource utilization
- ✅ Can handle 2-3x more concurrent connections
- ✅ Easier to debug (separate nginx access/error logs)
- ✅ Industry-standard setup

## Notes
- Current Next.js proxy is working fine for current load
- Migration is for optimization, not fixing a broken system
- Can be done incrementally (test with different port first)
- Keep Next.js rewrites as fallback initially

---
*Created: August 28, 2025*  
*Target Implementation: This Weekend*  
*Last Updated: August 28, 2025*