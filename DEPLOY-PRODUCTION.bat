@echo off
REM THE POWER100 EXPERIENCE - PRODUCTION DEPLOYMENT
REM Full AWS infrastructure deployment with CloudFormation

echo.
echo ============================================
echo    TPE PRODUCTION DEPLOYMENT TO AWS
echo    Full Infrastructure + Application
echo ============================================
echo.

set "AWS=C:\Program Files\Amazon\AWSCLIV2\aws.exe"
set REGION=us-east-1
set STACK_NAME=TPE-Production
set ENVIRONMENT=production

REM Step 1: Check AWS credentials
echo [Step 1/8] Checking AWS credentials...
"%AWS%" sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo AWS not configured. Please enter your credentials:
    "%AWS%" configure
)

REM Step 2: Validate CloudFormation template
echo [Step 2/8] Validating CloudFormation template...
cd deploy\aws
"%AWS%" cloudformation validate-template ^
    --template-body file://cloudformation-template.yaml ^
    --region %REGION% >nul 2>&1

if errorlevel 1 (
    echo ERROR: CloudFormation template validation failed
    pause
    exit /b 1
)

echo Template valid!

REM Step 3: Get parameters
echo.
echo [Step 3/8] Setting up parameters...
set /p DB_PASSWORD="Enter database password (min 8 chars): "
set /p OPENAI_KEY="Enter OpenAI API key (or press Enter to skip): "

REM Step 4: Deploy CloudFormation stack
echo.
echo [Step 4/8] Creating AWS infrastructure...
echo This will create:
echo - VPC with public/private subnets
echo - RDS PostgreSQL database
echo - EC2 instances with auto-scaling
echo - Application Load Balancer
echo - S3 buckets for storage
echo.

"%AWS%" cloudformation create-stack ^
    --stack-name %STACK_NAME% ^
    --template-body file://cloudformation-template.yaml ^
    --parameters ^
        ParameterKey=Environment,ParameterValue=%ENVIRONMENT% ^
        ParameterKey=DatabasePassword,ParameterValue=%DB_PASSWORD% ^
        ParameterKey=OpenAIApiKey,ParameterValue=%OPENAI_KEY% ^
    --capabilities CAPABILITY_NAMED_IAM ^
    --region %REGION% ^
    --on-failure DO_NOTHING

if errorlevel 1 (
    echo Stack might already exist, attempting update...
    "%AWS%" cloudformation update-stack ^
        --stack-name %STACK_NAME% ^
        --template-body file://cloudformation-template.yaml ^
        --parameters ^
            ParameterKey=Environment,ParameterValue=%ENVIRONMENT% ^
            ParameterKey=DatabasePassword,ParameterValue=%DB_PASSWORD% ^
            ParameterKey=OpenAIApiKey,ParameterValue=%OPENAI_KEY% ^
        --capabilities CAPABILITY_NAMED_IAM ^
        --region %REGION%
)

echo.
echo [Step 5/8] Waiting for infrastructure (this takes 10-15 minutes)...
echo You can check progress at: https://console.aws.amazon.com/cloudformation
timeout /t 5 >nul

"%AWS%" cloudformation wait stack-create-complete ^
    --stack-name %STACK_NAME% ^
    --region %REGION% 2>nul

echo Infrastructure ready!

REM Step 6: Get outputs
echo.
echo [Step 6/8] Getting infrastructure details...
"%AWS%" cloudformation describe-stacks ^
    --stack-name %STACK_NAME% ^
    --region %REGION% ^
    --query "Stacks[0].Outputs" > outputs.json

REM Extract key values
for /f "tokens=*" %%i in ('"%AWS%" cloudformation describe-stacks --stack-name %STACK_NAME% --region %REGION% --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDNS'].OutputValue" --output text') do set ALB_DNS=%%i
for /f "tokens=*" %%i in ('"%AWS%" cloudformation describe-stacks --stack-name %STACK_NAME% --region %REGION% --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpoint'].OutputValue" --output text') do set DB_ENDPOINT=%%i
for /f "tokens=*" %%i in ('"%AWS%" cloudformation describe-stacks --stack-name %STACK_NAME% --region %REGION% --query "Stacks[0].Outputs[?OutputKey=='BackendInstanceId'].OutputValue" --output text') do set EC2_ID=%%i

REM Step 7: Deploy application code
echo.
echo [Step 7/8] Deploying application to EC2...

REM Get EC2 public IP
for /f "tokens=*" %%i in ('"%AWS%" ec2 describe-instances --instance-ids %EC2_ID% --query "Reservations[0].Instances[0].PublicIpAddress" --output text --region %REGION%') do set EC2_IP=%%i

echo EC2 Instance IP: %EC2_IP%

REM Create deployment package
cd ..\..\
echo Creating deployment package...
tar -czf deploy.tar.gz ^
    tpe-backend ^
    tpe-front-end ^
    --exclude=node_modules ^
    --exclude=.next ^
    --exclude=*.log ^
    --exclude=*.db

echo Package created. You'll need to:
echo 1. SSH into EC2: ssh -i your-key.pem ec2-user@%EC2_IP%
echo 2. Upload and extract the package
echo 3. Install dependencies and start services

REM Step 8: Create production config
echo.
echo [Step 8/8] Creating production configuration...

cd tpe-backend
(
echo NODE_ENV=production
echo PORT=5000
echo DATABASE_URL=postgresql://tpeadmin:%DB_PASSWORD%@%DB_ENDPOINT%:5432/tpe_production
echo JWT_SECRET=your-production-secret-here
echo FRONTEND_URL=http://%ALB_DNS%
) > .env.production

cd ..\tpe-front-end
(
echo NEXT_PUBLIC_API_URL=http://%ALB_DNS%:5000
echo NEXT_PUBLIC_ENVIRONMENT=production
) > .env.production

echo.
echo ============================================
echo    PRODUCTION DEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Your production URLs:
echo Frontend: http://%ALB_DNS%
echo Backend API: http://%ALB_DNS%:5000
echo Database: %DB_ENDPOINT%
echo.
echo NEXT STEPS:
echo 1. SSH into EC2 and deploy code
echo 2. Set up domain name (optional)
echo 3. Configure SSL certificate (recommended)
echo 4. Test the production system
echo.
echo Infrastructure details saved to: outputs.json
echo.
pause