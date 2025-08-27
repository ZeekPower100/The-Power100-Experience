@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo Getting RDS Database Information...
echo.

for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name TPE-Production --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpoint'].OutputValue" --output text') do set DB_ENDPOINT=%%i

echo Database Endpoint: %DB_ENDPOINT%
echo Database Name: tpedb
echo Database User: tpeadmin
echo Database Port: 5432
echo.
echo Connection string format:
echo postgresql://tpeadmin:[YOUR-PASSWORD]@%DB_ENDPOINT%:5432/tpedb