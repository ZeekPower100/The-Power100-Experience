#!/bin/bash

# Production Deployment Script
# Usage: ./deploy-to-production.sh

set -e  # Exit on error

# Configuration
EC2_HOST="tpx.power100.io"  # Or use IP address
EC2_USER="ubuntu"
PROJECT_DIR="/home/ubuntu/The-Power100-Experience"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment to production...${NC}"

# Function to run commands on EC2
run_on_ec2() {
    ssh ${EC2_USER}@${EC2_HOST} "$1"
}

# Check connection
echo -e "${YELLOW}📡 Checking connection to EC2...${NC}"
if ! run_on_ec2 "echo 'Connected successfully'"; then
    echo -e "${RED}❌ Cannot connect to EC2. Check your SSH configuration.${NC}"
    exit 1
fi

# Check for uncommitted changes on production
echo -e "${YELLOW}🔍 Checking for uncommitted changes on production...${NC}"
UNCOMMITTED=$(run_on_ec2 "cd ${PROJECT_DIR} && git status --porcelain | wc -l")
if [ "$UNCOMMITTED" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected on production${NC}"
    read -p "Do you want to stash them? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_on_ec2 "cd ${PROJECT_DIR} && git stash"
        echo -e "${GREEN}✅ Changes stashed${NC}"
    else
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
fi

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
run_on_ec2 "cd ${PROJECT_DIR} && git pull origin master"

# Install backend dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
run_on_ec2 "cd ${PROJECT_DIR}/tpe-backend && npm ci --production"

# Install frontend dependencies and build
echo -e "${YELLOW}🎨 Building frontend...${NC}"
run_on_ec2 "cd ${PROJECT_DIR}/tpe-front-end && npm ci && npm run build"

# Restart services
echo -e "${YELLOW}♻️  Restarting services...${NC}"
run_on_ec2 "pm2 restart tpe-backend && pm2 restart tpe-frontend"

# Wait for services to stabilize
sleep 5

# Check PM2 status
echo -e "${YELLOW}📊 Checking service status...${NC}"
run_on_ec2 "pm2 list"

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${EC2_HOST}/)
if [ "$HTTP_STATUS" -eq "200" ]; then
    echo -e "${GREEN}✅ Site is up and running! (Status: ${HTTP_STATUS})${NC}"
else
    echo -e "${YELLOW}⚠️  Site returned status: ${HTTP_STATUS}${NC}"
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "Visit: https://${EC2_HOST}"