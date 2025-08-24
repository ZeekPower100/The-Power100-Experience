#!/bin/bash

# The Power100 Experience - AWS Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Example: ./deploy.sh production deploy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
ACTION=${2:-deploy}
STACK_NAME="TPE-Infrastructure-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}
PROFILE=${AWS_PROFILE:-default}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment. Use: development, staging, or production${NC}"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(deploy|update|delete|validate)$ ]]; then
    echo -e "${RED}Error: Invalid action. Use: deploy, update, delete, or validate${NC}"
    exit 1
fi

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}The Power100 Experience${NC}"
echo -e "${GREEN}AWS Deployment Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Environment:${NC} $ENVIRONMENT"
echo -e "${YELLOW}Action:${NC} $ACTION"
echo -e "${YELLOW}Stack Name:${NC} $STACK_NAME"
echo -e "${YELLOW}Region:${NC} $REGION"
echo -e "${YELLOW}Profile:${NC} $PROFILE"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity --profile $PROFILE &> /dev/null; then
        echo -e "${RED}AWS credentials not configured. Run: aws configure${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Prerequisites checked${NC}"
}

# Function to get parameters
get_parameters() {
    echo -e "${YELLOW}Setting up parameters...${NC}"
    
    # Database password
    if [ -z "$DB_PASSWORD" ]; then
        read -sp "Enter database password (min 8 chars): " DB_PASSWORD
        echo ""
    fi
    
    # OpenAI API key
    if [ -z "$OPENAI_API_KEY" ]; then
        read -sp "Enter OpenAI API key: " OPENAI_API_KEY
        echo ""
    fi
    
    echo -e "${GREEN}✓ Parameters configured${NC}"
}

# Function to validate template
validate_template() {
    echo -e "${YELLOW}Validating CloudFormation template...${NC}"
    
    aws cloudformation validate-template \
        --template-body file://cloudformation-template.yaml \
        --profile $PROFILE \
        --region $REGION > /dev/null
    
    echo -e "${GREEN}✓ Template is valid${NC}"
}

# Function to deploy stack
deploy_stack() {
    echo -e "${YELLOW}Deploying CloudFormation stack...${NC}"
    
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://cloudformation-template.yaml \
        --parameters \
            ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
            ParameterKey=DatabasePassword,ParameterValue=$DB_PASSWORD \
            ParameterKey=OpenAIApiKey,ParameterValue=$OPENAI_API_KEY \
        --capabilities CAPABILITY_NAMED_IAM \
        --profile $PROFILE \
        --region $REGION \
        --on-failure DO_NOTHING
    
    echo -e "${GREEN}✓ Stack creation initiated${NC}"
    echo -e "${YELLOW}Waiting for stack to complete...${NC}"
    
    aws cloudformation wait stack-create-complete \
        --stack-name $STACK_NAME \
        --profile $PROFILE \
        --region $REGION
    
    echo -e "${GREEN}✓ Stack deployed successfully!${NC}"
}

# Function to update stack
update_stack() {
    echo -e "${YELLOW}Updating CloudFormation stack...${NC}"
    
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://cloudformation-template.yaml \
        --parameters \
            ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
            ParameterKey=DatabasePassword,ParameterValue=$DB_PASSWORD \
            ParameterKey=OpenAIApiKey,ParameterValue=$OPENAI_API_KEY \
        --capabilities CAPABILITY_NAMED_IAM \
        --profile $PROFILE \
        --region $REGION
    
    echo -e "${GREEN}✓ Stack update initiated${NC}"
    echo -e "${YELLOW}Waiting for stack to update...${NC}"
    
    aws cloudformation wait stack-update-complete \
        --stack-name $STACK_NAME \
        --profile $PROFILE \
        --region $REGION
    
    echo -e "${GREEN}✓ Stack updated successfully!${NC}"
}

# Function to delete stack
delete_stack() {
    echo -e "${YELLOW}Deleting CloudFormation stack...${NC}"
    echo -e "${RED}WARNING: This will delete all resources!${NC}"
    read -p "Are you sure? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Deletion cancelled"
        exit 0
    fi
    
    aws cloudformation delete-stack \
        --stack-name $STACK_NAME \
        --profile $PROFILE \
        --region $REGION
    
    echo -e "${GREEN}✓ Stack deletion initiated${NC}"
    echo -e "${YELLOW}Waiting for stack to delete...${NC}"
    
    aws cloudformation wait stack-delete-complete \
        --stack-name $STACK_NAME \
        --profile $PROFILE \
        --region $REGION
    
    echo -e "${GREEN}✓ Stack deleted successfully${NC}"
}

# Function to get stack outputs
get_outputs() {
    echo -e "${YELLOW}Getting stack outputs...${NC}"
    
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --profile $PROFILE \
        --region $REGION \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table
    
    # Save outputs to file
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --profile $PROFILE \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        > outputs-${ENVIRONMENT}.json
    
    echo -e "${GREEN}✓ Outputs saved to outputs-${ENVIRONMENT}.json${NC}"
}

# Main execution
check_prerequisites

case $ACTION in
    validate)
        validate_template
        ;;
    deploy)
        get_parameters
        validate_template
        deploy_stack
        get_outputs
        ;;
    update)
        get_parameters
        validate_template
        update_stack
        get_outputs
        ;;
    delete)
        delete_stack
        ;;
    *)
        echo -e "${RED}Invalid action: $ACTION${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"

# Show next steps
if [ "$ACTION" == "deploy" ] || [ "$ACTION" == "update" ]; then
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Update your .env file with the outputs from outputs-${ENVIRONMENT}.json"
    echo "2. Deploy your application code to EC2 instances"
    echo "3. Configure your domain name to point to the ALB"
    echo "4. Test the application at the ALB DNS name"
    echo ""
    echo -e "${YELLOW}To deploy application code:${NC}"
    echo "   ./deploy-app.sh $ENVIRONMENT"
fi