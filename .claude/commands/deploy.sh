#!/bin/bash

# Claude Command: Deploy to Production
# Usage: /deploy [options]

set -e

# Configuration
EC2_HOST="tpx.power100.io"
EC2_USER="ubuntu"
PROJECT_DIR="/home/ubuntu/The-Power100-Experience"

# Parse command line arguments
SKIP_BUILD=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: /deploy [--skip-build] [--backend-only] [--frontend-only] [--force]"
            exit 1
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting deployment to production...${NC}"

# Function to run commands on EC2
run_on_ec2() {
    ssh -o ConnectTimeout=10 ${EC2_USER}@${EC2_HOST} "$1"
}

# Check connection
echo -e "${YELLOW}📡 Checking connection to EC2...${NC}"
if ! run_on_ec2 "echo 'Connected successfully'" 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to EC2. Check your SSH configuration.${NC}"
    echo "Make sure you have SSH access configured for ${EC2_USER}@${EC2_HOST}"
    exit 1
fi

# Check for uncommitted changes
if [ "$FORCE" != "true" ]; then
    echo -e "${YELLOW}🔍 Checking for uncommitted changes...${NC}"
    UNCOMMITTED=$(run_on_ec2 "cd ${PROJECT_DIR} && git status --porcelain | wc -l")
    if [ "$UNCOMMITTED" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Uncommitted changes detected on production${NC}"
        echo "Run with --force to stash them, or commit them first"
        exit 1
    fi
else
    # Force mode - stash changes
    UNCOMMITTED=$(run_on_ec2 "cd ${PROJECT_DIR} && git status --porcelain | wc -l")
    if [ "$UNCOMMITTED" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Stashing uncommitted changes...${NC}"
        run_on_ec2 "cd ${PROJECT_DIR} && git stash"
    fi
fi

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
run_on_ec2 "cd ${PROJECT_DIR} && git pull origin master"

# Deploy backend
if [ "$FRONTEND_ONLY" != "true" ]; then
    echo -e "${YELLOW}📦 Deploying backend...${NC}"
    run_on_ec2 "cd ${PROJECT_DIR}/tpe-backend && npm ci --production"
    run_on_ec2 "pm2 restart tpe-backend"
fi

# Deploy frontend
if [ "$BACKEND_ONLY" != "true" ]; then
    echo -e "${YELLOW}🎨 Deploying frontend...${NC}"
    run_on_ec2 "cd ${PROJECT_DIR}/tpe-front-end && npm ci"
    
    if [ "$SKIP_BUILD" != "true" ]; then
        echo -e "${YELLOW}🔨 Building frontend...${NC}"
        run_on_ec2 "cd ${PROJECT_DIR}/tpe-front-end && npm run build"
    else
        echo -e "${YELLOW}⏭️  Skipping build step${NC}"
    fi
    
    run_on_ec2 "pm2 restart tpe-frontend"
fi

# Wait for services
sleep 5

# Show status
echo -e "${YELLOW}📊 Service status:${NC}"
run_on_ec2 "pm2 list"

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${EC2_HOST}/)
if [ "$HTTP_STATUS" -eq "200" ]; then
    echo -e "${GREEN}✅ Deployment successful! Site is up (Status: ${HTTP_STATUS})${NC}"
else
    echo -e "${YELLOW}⚠️  Site returned status: ${HTTP_STATUS}${NC}"
fi

echo -e "${GREEN}🎉 Done! Visit: https://${EC2_HOST}${NC}"