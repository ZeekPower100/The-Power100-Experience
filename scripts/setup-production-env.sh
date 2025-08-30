#!/bin/bash
# Production Environment Setup Script
# This script ensures production has the correct database credentials

echo "🔧 Setting up production environment variables..."

# Production database credentials
PROD_DB_HOST="tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com"
PROD_DB_PORT="5432"
PROD_DB_NAME="tpedb"
PROD_DB_USER="tpeadmin"
PROD_DB_PASSWORD="dBP0wer100!!"

# Create production .env file
cat > /home/ubuntu/The-Power100-Experience/tpe-backend/.env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=5000

# PRODUCTION Database Configuration (AWS RDS)
DB_HOST=${PROD_DB_HOST}
DB_PORT=${PROD_DB_PORT}
DB_NAME=${PROD_DB_NAME}
DB_USER=${PROD_DB_USER}
DB_PASSWORD=${PROD_DB_PASSWORD}
DB_SSL=true

# JWT Configuration
JWT_SECRET=your_production_jwt_secret_key_power100_2025

# Frontend URL
FRONTEND_URL=https://tpx.power100.io

# Database URL with SSL
DATABASE_URL=postgresql://${PROD_DB_USER}:${PROD_DB_PASSWORD}@${PROD_DB_HOST}:${PROD_DB_PORT}/${PROD_DB_NAME}?sslmode=require

# Production password reminder: dBP0wer100!!
EOF

# Copy to active .env file
cp /home/ubuntu/The-Power100-Experience/tpe-backend/.env.production /home/ubuntu/The-Power100-Experience/tpe-backend/.env

echo "✅ Production environment variables configured"
echo "📝 Database password set to: dBP0wer100!!"
echo "📝 This is stored in:"
echo "   - tpe-backend/.env.production"
echo "   - tpe-backend/.env"
echo "   - DATABASE_CREDENTIALS_REFERENCE.md"