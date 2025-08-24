#!/bin/bash
# EC2 User Data Script for TPE Application - Amazon Linux 2023

# Update system
dnf update -y

# Install Node.js 18 and Git
dnf install -y nodejs npm git

# Install PM2 globally
npm install -g pm2

# Create app directory
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# Clone the repository
git clone https://github.com/ZeekPower100/The-Power100-Experience.git .
git checkout feature/aws-deployment-infrastructure

# Install backend dependencies
cd tpe-backend
npm ci --production

# Create backend environment file
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://tpeadmin:${DB_PASSWORD}@${DB_ENDPOINT}:5432/tpe_production
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=http://${ALB_DNS}
OPENAI_API_KEY=${OPENAI_API_KEY}
EOF

# Start backend with PM2
pm2 start src/server.js --name tpe-backend

# Install frontend dependencies
cd ../tpe-front-end
npm ci

# Create frontend environment file
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://${ALB_DNS}:5000
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_ALB_URL=http://${ALB_DNS}
EOF

# Build frontend
npm run build

# Start frontend with PM2
pm2 start npm --name tpe-frontend -- start

# Save PM2 configuration
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Install and configure nginx
dnf install -y nginx
cat > /etc/nginx/conf.d/tpe.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

systemctl start nginx
systemctl enable nginx

# Set permissions
chown -R ec2-user:ec2-user /home/ec2-user/app

echo "TPE Application deployment complete!"