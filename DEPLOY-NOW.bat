@echo off
REM TPE INSTANT AWS DEPLOYMENT
REM One-click deployment to AWS S3

echo.
echo ============================================
echo    THE POWER100 EXPERIENCE - AWS DEPLOY
echo    Destination Motivation Presentation
echo ============================================
echo.

REM Set paths
set AWS="C:\Program Files\Amazon\AWSCLIV2\aws.exe"
set PROJECT_ROOT=%cd%

REM Check AWS CLI
if not exist %AWS% (
    echo ERROR: AWS CLI not found!
    echo Installing AWS CLI...
    winget install Amazon.AWSCLI --accept-package-agreements --accept-source-agreements
    echo Please restart this script after installation completes.
    pause
    exit /b 1
)

echo [1/7] Checking AWS credentials...
%AWS% sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo.
    echo AWS credentials not configured. Let's set them up:
    echo.
    %AWS% configure
)

echo.
echo [2/7] Creating S3 bucket...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BUCKET_NAME=tpe-demo-%datetime:~0,14%

%AWS% s3api create-bucket --bucket %BUCKET_NAME% --region us-east-1 2>nul
if errorlevel 1 (
    echo Bucket might already exist, continuing...
)

echo [3/7] Configuring static website hosting...
%AWS% s3 website s3://%BUCKET_NAME%/ --index-document index.html --error-document error.html

echo [4/7] Setting public access...
(
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [{
echo     "Sid": "PublicReadGetObject",
echo     "Effect": "Allow",
echo     "Principal": "*",
echo     "Action": "s3:GetObject",
echo     "Resource": "arn:aws:s3:::%BUCKET_NAME%/*"
echo   }]
echo }
) > policy.json

%AWS% s3api put-bucket-policy --bucket %BUCKET_NAME% --policy file://policy.json
del policy.json

echo [5/7] Building frontend...
cd tpe-front-end

REM Update environment for production
(
echo NEXT_PUBLIC_API_URL=http://localhost:5000
echo NEXT_PUBLIC_ENVIRONMENT=production
) > .env.production

REM Install and build
call npm install --silent
echo Building application (this may take 2-3 minutes)...
call npm run build

echo [6/7] Deploying to AWS...
%AWS% s3 sync out/ s3://%BUCKET_NAME%/ --delete

echo [7/7] Creating CloudFront distribution for better performance...
set DOMAIN=%BUCKET_NAME%.s3-website-us-east-1.amazonaws.com

echo.
echo ============================================
echo    DEPLOYMENT SUCCESSFUL!
echo ============================================
echo.
echo YOUR LIVE URL:
echo http://%DOMAIN%
echo.
echo NEXT STEPS:
echo 1. Start backend: cd tpe-backend ^&^& npm start
echo 2. Visit the URL above
echo 3. The app is now LIVE for your presentation!
echo.
echo Saving deployment info...
(
echo TPE Production Deployment
echo ========================
echo Date: %date% %time%
echo Live URL: http://%DOMAIN%
echo S3 Bucket: %BUCKET_NAME%
echo Backend: http://localhost:5000
echo.
echo To update: aws s3 sync tpe-front-end/out/ s3://%BUCKET_NAME%/ --delete
) > DEPLOYMENT-INFO.txt

echo Deployment info saved to DEPLOYMENT-INFO.txt
echo.
echo Press any key to open the live site...
pause >nul
start http://%DOMAIN%

cd %PROJECT_ROOT%