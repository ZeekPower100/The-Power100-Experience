#!/bin/bash

# The Power100 Experience - Application Deployment Script
# This deploys your actual code to the AWS infrastructure
# Usage: ./deploy-app.sh [environment] [branch]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-production}
BRANCH=${2:-feature/aws-deployment-infrastructure}
REGION=${AWS_REGION:-us-east-1}

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}TPE Application Deployment${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "${YELLOW}Environment:${NC} $ENVIRONMENT"
echo -e "${YELLOW}Branch:${NC} $BRANCH"
echo -e "${YELLOW}Region:${NC} $REGION"
echo ""

# Get stack outputs
echo -e "${YELLOW}Getting infrastructure details...${NC}"
STACK_NAME="TPE-Infrastructure-${ENVIRONMENT}"

# Get S3 bucket name for frontend
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucket`].OutputValue' \
    --output text \
    --region $REGION 2>/dev/null || echo "")

# Get EC2 instance ID for backend
BACKEND_INSTANCE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`BackendInstanceId`].OutputValue' \
    --output text \
    --region $REGION 2>/dev/null || echo "")

# Get CloudFront distribution
CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text \
    --region $REGION 2>/dev/null || echo "")

# If infrastructure not found, create it first
if [ -z "$FRONTEND_BUCKET" ]; then
    echo -e "${RED}Infrastructure not found. Creating it first...${NC}"
    ./deploy.sh $ENVIRONMENT deploy
    
    # Re-get the values
    FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucket`].OutputValue' \
        --output text \
        --region $REGION)
    
    BACKEND_INSTANCE=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`BackendInstanceId`].OutputValue' \
        --output text \
        --region $REGION)
    
    CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text \
        --region $REGION)
fi

# Deploy Frontend
echo ""
echo -e "${YELLOW}Deploying Frontend to S3...${NC}"
cd ../../tpe-front-end

# Build frontend
echo "Building Next.js application..."
npm install
npm run build

# Export static files
npm run export 2>/dev/null || npx next export

# Upload to S3
echo "Uploading to S3 bucket: $FRONTEND_BUCKET"
aws s3 sync out/ s3://$FRONTEND_BUCKET/ --delete --region $REGION

# Invalidate CloudFront cache
if [ ! -z "$CLOUDFRONT_ID" ]; then
    echo "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_ID \
        --paths "/*" \
        --region $REGION > /dev/null
fi

echo -e "${GREEN}✓ Frontend deployed successfully!${NC}"

# Deploy Backend
echo ""
echo -e "${YELLOW}Deploying Backend to EC2...${NC}"
cd ../tpe-backend

# Create deployment package
echo "Creating deployment package..."
tar -czf backend-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.env \
    --exclude=*.log \
    --exclude=*.db \
    --exclude=*.sqlite \
    .

# Get EC2 instance public IP
BACKEND_IP=$(aws ec2 describe-instances \
    --instance-ids $BACKEND_INSTANCE \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $REGION)

# Create deployment script
cat > remote-deploy.sh << 'EOF'
#!/bin/bash
cd /home/ec2-user/tpe-backend
tar -xzf backend-deploy.tar.gz
npm install --production
pm2 stop tpe-backend 2>/dev/null || true
pm2 start src/server.js --name tpe-backend
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user
EOF

# Upload and deploy
echo "Deploying to EC2 instance at $BACKEND_IP..."
scp -i ~/.ssh/tpe-key.pem -o StrictHostKeyChecking=no \
    backend-deploy.tar.gz \
    remote-deploy.sh \
    ec2-user@$BACKEND_IP:/home/ec2-user/tpe-backend/

ssh -i ~/.ssh/tpe-key.pem -o StrictHostKeyChecking=no \
    ec2-user@$BACKEND_IP \
    "chmod +x /home/ec2-user/tpe-backend/remote-deploy.sh && /home/ec2-user/tpe-backend/remote-deploy.sh"

# Cleanup
rm backend-deploy.tar.gz remote-deploy.sh

echo -e "${GREEN}✓ Backend deployed successfully!${NC}"

# Get application URLs
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region $REGION)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
    --output text \
    --region $REGION)

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Application URLs:${NC}"
echo -e "Frontend: ${GREEN}https://${CLOUDFRONT_URL}${NC}"
echo -e "Backend API: ${GREEN}http://${ALB_DNS}:5000${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update DNS records to point to CloudFront"
echo "2. Configure SSL certificates"
echo "3. Test the application"
echo "4. Monitor CloudWatch logs"