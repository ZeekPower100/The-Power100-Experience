@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"

echo ========================================
echo Setting up HTTPS for tpx.power100.io
echo ========================================
echo.

echo Step 1: Request SSL Certificate from ACM
echo You need to validate domain ownership via DNS
aws acm request-certificate --domain-name tpx.power100.io --validation-method DNS --output json > cert-request.json

for /f "tokens=*" %%i in ('powershell -Command "(Get-Content 'cert-request.json' | ConvertFrom-Json).CertificateArn"') do set CERT_ARN=%%i
echo Certificate ARN: %CERT_ARN%

echo.
echo Step 2: Get DNS validation records
aws acm describe-certificate --certificate-arn %CERT_ARN% --query "Certificate.DomainValidationOptions[0].ResourceRecord" --output json

echo.
echo ========================================
echo IMPORTANT: Add the CNAME record above to GoDaddy DNS to validate the certificate
echo Then run add-https-listener.bat to complete setup
echo ========================================