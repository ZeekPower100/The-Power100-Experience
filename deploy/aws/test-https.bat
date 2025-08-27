@echo off
echo Testing HTTP vs HTTPS...
echo.
echo HTTP Test:
curl -I http://tpx.power100.io

echo.
echo HTTPS Test (what browsers try):
curl -I https://tpx.power100.io

echo.
echo If HTTPS fails, that's why browsers can't connect.
echo Browsers auto-redirect to HTTPS for .io domains.