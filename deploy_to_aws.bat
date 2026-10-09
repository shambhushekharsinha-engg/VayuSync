@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo    VAYUSYNC - ONE-CLICK AWS CLOUD DEPLOYMENT SCRIPT
echo =======================================================
echo.

set AWS_REGION=ap-south-1
set STACK_NAME=VayuSync-Stack

echo [1/5] Building SAM backend deployment package...
cd c:\Vayusync\backend
call sam build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] SAM build failed. Please inspect logs.
    exit /b %ERRORLEVEL%
)

echo.
echo [2/5] Deploying CloudFormation Stack to AWS (%AWS_REGION%)...
call sam deploy --stack-name %STACK_NAME% --resolve-s3 --capabilities CAPABILITY_IAM --region %AWS_REGION% --no-confirm-changeset
if %ERRORLEVEL% neq 0 (
    echo [ERROR] SAM deploy failed. Please verify AWS credentials.
    exit /b %ERRORLEVEL%
)

echo.
echo [3/5] Seeding DynamoDB Tables with Delhi NCR Institutions...
python scripts\seed_dynamo.py --region %AWS_REGION%

echo.
echo [4/5] Retrieving Deployed Cloud Endpoints...
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --region %AWS_REGION% --query "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue" --output text') do set API_URL=%%i
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --region %AWS_REGION% --query "Stacks[0].Outputs[?OutputKey=='FrontendWebsiteURL'].OutputValue" --output text') do set WEB_URL=%%i
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --region %AWS_REGION% --query "Stacks[0].Outputs[?OutputKey=='FrontendWebBucket'].OutputValue" --output text 2^>nul') do set S3_BUCKET=%%i

if "%S3_BUCKET%"=="" (
    for /f "tokens=*" %%i in ('aws ssm get-caller-identity 2^>nul') do set DUMMY=%%i
    for /f "tokens=*" %%i in ('aws sts get-caller-identity --query "Account" --output text') do set ACC_ID=%%i
    set S3_BUCKET=vayusync-dashboard-!ACC_ID!
)

echo     Backend API URL: !API_URL!
echo     S3 Bucket:       !S3_BUCKET!

echo.
echo [5/5] Building Frontend and Uploading to S3 Hosting...
cd c:\Vayusync\frontend
echo VITE_API_BASE_URL=!API_URL! > .env
call npm run build
aws s3 sync dist/ s3://!S3_BUCKET!/ --delete --region %AWS_REGION%

echo.
echo =======================================================
echo    🎉 VAYUSYNC AWS DEPLOYMENT COMPLETE!
echo =======================================================
echo.
echo  LIVE DASHBOARD:  !WEB_URL!
echo  API GATEWAY:     !API_URL!
echo.
echo Judges can now open your live hosted dashboard URL!
echo =======================================================
