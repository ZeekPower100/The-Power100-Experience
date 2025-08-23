# GitHub Secrets Setup for AWS Deployment

## Required Secrets

You need to add these secrets to your GitHub repository:

### 1. Go to Your Repository Settings
https://github.com/ZeekPower100/The-Power100-Experience/settings/secrets/actions

### 2. Add These Secrets

Click "New repository secret" for each:

#### AWS Credentials (Required)
- **Name**: `AWS_ACCESS_KEY_ID`
- **Value**: Your AWS Access Key ID (from IAM user)

- **Name**: `AWS_SECRET_ACCESS_KEY`
- **Value**: Your AWS Secret Access Key

#### Database (Required)
- **Name**: `DB_PASSWORD`
- **Value**: The password you used when creating the RDS database

- **Name**: `JWT_SECRET`
- **Value**: Generate a random string (e.g., `openssl rand -hex 32` or any random 32+ character string)

#### Optional
- **Name**: `OPENAI_API_KEY`
- **Value**: Your OpenAI API key (if using AI features)

## Quick Setup Commands

If you have GitHub CLI installed, you can set secrets via command line:

```bash
# Set AWS credentials
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY

# Set database password
gh secret set DB_PASSWORD

# Set JWT secret (generate random)
gh secret set JWT_SECRET --body="$(openssl rand -hex 32)"

# Set OpenAI key (optional)
gh secret set OPENAI_API_KEY
```

## Verify Deployment

After adding secrets:

1. Make a small change to any file
2. Commit and push to `feature/aws-deployment-infrastructure`
3. Check Actions tab: https://github.com/ZeekPower100/The-Power100-Experience/actions
4. Watch the deployment run

## Deployment Triggers

The GitHub Action will run when:
- You push to `feature/aws-deployment-infrastructure` branch
- You merge a PR into `feature/aws-deployment-infrastructure` branch

## What Gets Deployed

1. **Database**: Migrations and demo data
2. **Backend**: Node.js API to EC2
3. **Frontend**: Next.js app to S3 and EC2
4. **Assets**: Static files to S3 with CloudFront