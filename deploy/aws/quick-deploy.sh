#!/bin/bash

# TPE Quick Production Deployment
# Fastest way to get live for presentation

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}TPE Quick AWS Deployment${NC}"
echo -e "${GREEN}For Destination Motivation Demo${NC}"
echo -e "${GREEN}================================${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not installed!${NC}"
    echo "Install from: https://aws.amazon.com/cli/"
    echo "Or run: winget install Amazon.AWSCLI"
    exit 1
fi

# Test AWS credentials
echo -e "${YELLOW}Testing AWS credentials...${NC}"
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}AWS not configured! Run: aws configure${NC}"
    exit 1
fi

REGION=$(aws configure get region || echo "us-east-1")
echo -e "${GREEN}✓ AWS configured for region: $REGION${NC}"

# Create S3 buckets
BUCKET_NAME="tpe-production-$(date +%s)"
echo -e "${YELLOW}Creating S3 bucket: $BUCKET_NAME${NC}"

aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION \
    $(if [ "$REGION" != "us-east-1" ]; then echo "--create-bucket-configuration LocationConstraint=$REGION"; fi) \
    2>/dev/null || echo "Bucket might already exist"

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME/ \
    --index-document index.html \
    --error-document error.html

# Set bucket policy for public access
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
rm bucket-policy.json

# Build and deploy frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd ../../tpe-front-end

# Create production env file
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://tpe-backend.herokuapp.com
NEXT_PUBLIC_ENVIRONMENT=production
EOF

# Build
npm install
npm run build

# For static export
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true
}

module.exports = nextConfig
EOF

npm run build

# Upload to S3
echo -e "${YELLOW}Deploying to S3...${NC}"
aws s3 sync out/ s3://$BUCKET_NAME/ --delete

# Get website URL
WEBSITE_URL="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"

# Deploy backend to Heroku (simpler than EC2 for demo)
echo -e "${YELLOW}Setting up backend...${NC}"
cd ../tpe-backend

# Create Heroku app (if Heroku CLI installed)
if command -v heroku &> /dev/null; then
    heroku create tpe-backend-prod || true
    heroku config:set NODE_ENV=production
    git push heroku feature/aws-deployment-infrastructure:main
    BACKEND_URL=$(heroku info -s | grep web_url | cut -d= -f2)
else
    echo -e "${YELLOW}Heroku CLI not found. Backend deployment skipped.${NC}"
    BACKEND_URL="http://localhost:5000"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Access your application at:${NC}"
echo -e "${GREEN}${WEBSITE_URL}${NC}"
echo ""
echo -e "${YELLOW}Backend API:${NC}"
echo -e "${GREEN}${BACKEND_URL}${NC}"
echo ""
echo -e "${YELLOW}S3 Bucket:${NC} $BUCKET_NAME"
echo ""
echo -e "${RED}IMPORTANT for Presentation:${NC}"
echo "1. The site is now LIVE at the URL above"
echo "2. Share this URL for the demo: ${WEBSITE_URL}"
echo "3. Backend needs to be running (locally or Heroku)"
echo ""

# Save deployment info
cat > deployment-info.txt << EOF
Deployment Date: $(date)
Frontend URL: ${WEBSITE_URL}
Backend URL: ${BACKEND_URL}
S3 Bucket: ${BUCKET_NAME}
Region: ${REGION}
EOF

echo "Deployment info saved to deployment-info.txt"