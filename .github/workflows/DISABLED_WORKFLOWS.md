# ⚠️ DISABLED WORKFLOWS

## deploy-to-ec2.yml
**Status:** DISABLED
**Date Disabled:** August 30, 2025
**Reason:** This workflow was causing production failures by:
1. Skipping npm install steps conditionally
2. Causing Express and other dependencies to disappear
3. Creating version conflicts between React 18 and React 19
4. Breaking the monorepo symlink structure

**Issue Details:**
- The workflow's conditional npm install logic (`if [ "$BACKEND_CHANGED" = "true" ]`) was unreliable
- Dependencies would disappear from production, causing the backend to crash
- The symlink structure in the monorepo was not properly maintained

**Solution:**
- Workflow has been renamed to `deploy-to-ec2.yml.disabled` to prevent automatic execution
- Use the manual deployment script instead: `scripts/manual-deploy-to-production.sh`
- The "Deploy to AWS Production" workflow remains active and functional

**To Re-enable:**
1. Fix the conditional install logic to ALWAYS do clean installs
2. Ensure symlinks are properly created
3. Test thoroughly in a staging environment first
4. Rename back from `.disabled` to `.yml`

**Alternative:**
Use manual deployment or the "Deploy to AWS Production" workflow which has been more reliable.