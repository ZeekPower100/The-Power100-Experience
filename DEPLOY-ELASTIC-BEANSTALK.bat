@echo off
REM TPE Production Deploy via Elastic Beanstalk
REM Easier deployment option for Node.js apps

echo.
echo ================================================
echo    TPE PRODUCTION - ELASTIC BEANSTALK
echo    Simpler AWS Deployment Option
echo ================================================
echo.

set AWS="C:\Program Files\Amazon\AWSCLIV2\aws.exe"
set EB="C:\Program Files\Python\Scripts\eb.exe"
set REGION=us-east-1

REM Check EB CLI
where eb >nul 2>&1
if errorlevel 1 (
    echo Installing Elastic Beanstalk CLI...
    pip install awsebcli --upgrade
    echo.
)

REM Configure AWS
echo [1/5] Checking AWS configuration...
%AWS% sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    %AWS% configure
)

REM Initialize Elastic Beanstalk
echo.
echo [2/5] Initializing Elastic Beanstalk...
cd tpe-backend

if not exist .elasticbeanstalk (
    eb init -p node.js-18 tpe-backend --region %REGION%
)

REM Create environment
echo.
echo [3/5] Creating production environment...
eb create tpe-production --single --instance-type t3.small

REM Set environment variables
echo.
echo [4/5] Setting environment variables...
eb setenv NODE_ENV=production PORT=5000

REM Deploy
echo.
echo [5/5] Deploying application...
eb deploy

REM Get URL
eb status

echo.
echo ================================================
echo    BACKEND DEPLOYED!
echo ================================================
echo.
echo Now deploying frontend to Amplify...
cd ..\tpe-front-end

REM Install Amplify CLI if needed
where amplify >nul 2>&1
if errorlevel 1 (
    npm install -g @aws-amplify/cli
)

echo.
echo Running Amplify setup...
echo When prompted:
echo - Choose "Hosting with Amplify Console"
echo - Choose "Manual deployment"
echo.
amplify init
amplify add hosting
amplify publish

echo.
echo ================================================
echo    DEPLOYMENT COMPLETE!
echo ================================================
echo.
echo Your app is now live on AWS!
echo Check the URLs above for access.
echo.
pause