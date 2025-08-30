# GitHub Actions EC2 Auto-Deploy Setup Guide

## Prerequisites
You need:
1. Your EC2 SSH private key (`.pem` file)
2. Your EC2 host/IP address
3. Access to your GitHub repository settings

## Step 1: Find Your SSH Key

Look for your EC2 key file. It's usually named something like:
- `your-key-name.pem`
- `power100-ec2.pem` 
- `tpe-production.pem`

Common locations:
- `C:\Users\broac\.ssh\`
- `C:\Users\broac\Downloads\`
- `C:\Users\broac\Documents\AWS\`

## Step 2: Add GitHub Secrets

1. Go to your GitHub repository: https://github.com/ZeekPower100/The-Power100-Experience
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

Add these two secrets:

### Secret 1: EC2_SSH_KEY
- **Name**: `EC2_SSH_KEY`
- **Value**: Copy the ENTIRE contents of your `.pem` file, including:
  ```
  -----BEGIN RSA PRIVATE KEY-----
  [all the key content]
  -----END RSA PRIVATE KEY-----
  ```

To get the content, run:
```bash
cat path/to/your-key.pem
```

### Secret 2: EC2_HOST
- **Name**: `EC2_HOST`
- **Value**: `tpx.power100.io` (or your EC2 IP address)

## Step 3: Commit the Workflow File

The workflow file is already created at `.github/workflows/deploy-to-ec2.yml`

Commit and push it:
```bash
git add .github/workflows/deploy-to-ec2.yml
git commit -m "Add EC2 auto-deployment workflow"
git push origin master
```

## Step 4: Test the Deployment

After pushing, go to the **Actions** tab in GitHub to see if the workflow runs successfully.

## Troubleshooting

### If deployment fails with "Permission denied":
- Make sure you copied the ENTIRE private key including BEGIN and END lines
- Ensure there are no extra spaces or line breaks

### If it fails with "Host not found":
- Verify EC2_HOST is set to the correct domain or IP
- Make sure your EC2 instance is running

### If it fails with "Command not found":
- The EC2 instance might be missing npm or pm2
- SSH into EC2 and ensure these are installed

## How It Works

Every time you push to `master` branch:
1. GitHub Actions triggers the workflow
2. It SSHs into your EC2 instance
3. Pulls the latest code
4. Installs dependencies
5. Builds the frontend
6. Restarts PM2 services
7. Runs a health check

## Manual Override

If auto-deploy is running but you need to deploy manually:
```bash
/deploy --force
```

This will force a deployment even if GitHub Actions is running.