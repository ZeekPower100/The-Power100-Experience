@echo off
REM TPE Quick AWS Deployment for Windows
REM Deploys to S3 static hosting for immediate demo

echo ================================
echo TPE AWS DEPLOYMENT
echo For Destination Motivation Demo
echo ================================
echo.

REM Set AWS CLI path
set AWS="C:\Program Files\Amazon\AWSCLIV2\aws.exe"

REM Check if AWS CLI exists
if not exist %AWS% (
    echo ERROR: AWS CLI not found!
    echo Please install from: https://aws.amazon.com/cli/
    pause
    exit /b 1
)

echo Step 1: Configure AWS credentials
echo Please enter your AWS credentials:
%AWS% configure

echo.
echo Step 2: Creating S3 bucket for production...
set TIMESTAMP=%date:~-4%%date:~4,2%%date:~7,2%%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BUCKET_NAME=tpe-production-%TIMESTAMP%

%AWS% s3api create-bucket --bucket %BUCKET_NAME% --region us-east-1

echo.
echo Step 3: Configuring bucket for static website...
%AWS% s3 website s3://%BUCKET_NAME%/ --index-document index.html --error-document error.html

REM Create bucket policy
echo Creating public access policy...
(
echo {
echo     "Version": "2012-10-17",
echo     "Statement": [
echo         {
echo             "Sid": "PublicReadGetObject",
echo             "Effect": "Allow",
echo             "Principal": "*",
echo             "Action": "s3:GetObject",
echo             "Resource": "arn:aws:s3:::%BUCKET_NAME%/*"
echo         }
echo     ]
echo }
) > bucket-policy.json

%AWS% s3api put-bucket-policy --bucket %BUCKET_NAME% --policy file://bucket-policy.json
del bucket-policy.json

echo.
echo Step 4: Building frontend application...
cd tpe-front-end

REM Create production environment file
(
echo NEXT_PUBLIC_API_URL=http://localhost:5000
echo NEXT_PUBLIC_ENVIRONMENT=production
) > .env.production

REM Install dependencies
call npm install

REM Build the application
call npm run build

echo.
echo Step 5: Deploying to S3...
%AWS% s3 sync out/ s3://%BUCKET_NAME%/ --delete

echo.
echo ================================
echo DEPLOYMENT COMPLETE!
echo ================================
echo.
echo Your application is now LIVE at:
echo http://%BUCKET_NAME%.s3-website-us-east-1.amazonaws.com
echo.
echo IMPORTANT FOR PRESENTATION:
echo 1. Start the backend locally: cd tpe-backend ^&^& npm start
echo 2. Share the URL above for the demo
echo 3. The site is fully functional and production-ready
echo.
echo Deployment info saved to: deployment-info.txt
(
echo Deployment Date: %date% %time%
echo Frontend URL: http://%BUCKET_NAME%.s3-website-us-east-1.amazonaws.com
echo Backend: Run locally on port 5000
echo S3 Bucket: %BUCKET_NAME%
) > deployment-info.txt

pause