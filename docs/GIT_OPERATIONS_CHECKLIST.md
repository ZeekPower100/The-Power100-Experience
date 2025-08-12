# Git Operations Verification Checklist

## 🚨 MANDATORY: Pre-Action Verification Protocol

This checklist MUST be followed before ANY git operations involving remote repositories.

---

## Before Creating Pull Requests

### ✅ Step 1: Fetch Latest Remote State
```bash
git fetch origin
git fetch --all --prune
```

### ✅ Step 2: Check What's Already in Remote
```bash
# Check if files already exist
git ls-tree -r origin/master --name-only | grep -i "[feature_name]"

# Check commit history for related work
git log origin/master --oneline --grep="[feature]" -i -20

# Check all remote branches for similar work
git branch -r | grep -i "[feature]"
```

### ✅ Step 3: Compare Local vs Remote
```bash
# See what commits are unique to your branch
git log origin/master..HEAD --oneline

# See what files are different
git diff --name-only origin/master..HEAD

# Check if specific features already exist
git show origin/master:path/to/suspected/file
```

### ✅ Step 4: Check for Existing PRs
```bash
# List all PRs (open and closed)
gh pr list --state all --limit 20

# Search for related PRs
gh pr list --search "[feature_name]" --state all
```

### ✅ Step 5: Verify No Duplicates
- [ ] Confirmed feature doesn't exist in master
- [ ] Confirmed feature doesn't exist in other branches
- [ ] Confirmed no similar PRs are open
- [ ] Confirmed no recently closed PRs with same changes

---

## Before Merging or Cherry-Picking

### ✅ Step 1: Test Merge Conflicts
```bash
# Test merge without actually merging
git merge --no-commit --no-ff origin/master
git merge --abort  # After checking conflicts
```

### ✅ Step 2: Review Changes That Will Be Merged
```bash
# See what would be merged
git log origin/master..feature-branch --oneline
git diff origin/master...feature-branch
```

### ✅ Step 3: Verify Branch History
```bash
# Visual branch history
git log --graph --oneline --all -20
```

---

## Before Pushing Changes

### ✅ Step 1: Verify Clean Working Directory
```bash
git status
git diff --staged
```

### ✅ Step 2: Confirm Correct Branch
```bash
git branch --show-current
git log --oneline -5
```

### ✅ Step 3: Test Build and Tests
```bash
# Frontend
cd tpe-front-end && npm test
cd tpe-front-end && npm run build

# Backend
cd tpe-backend && npm test
```

---

## Common Verification Commands Reference

### Check Remote Content
```bash
# List files in remote branch
git ls-tree -r origin/[branch] --name-only

# Search for specific content in remote
git grep "[search_term]" origin/master

# Show file from remote without checking out
git show origin/master:path/to/file.tsx
```

### Compare Branches
```bash
# Files changed between branches
git diff --name-status origin/master..HEAD

# Commits in current branch not in master
git log origin/master..HEAD --oneline

# Changes that would come from merge
git diff origin/master...HEAD
```

### Find When Feature Was Added
```bash
# Find commit that added a file
git log --all --full-history -- "**/[filename]"

# Find when specific text was added
git log -S "[search_text]" --all
```

---

## ❌ NEVER DO THIS

1. **NEVER** create a PR without checking if the feature exists
2. **NEVER** merge without checking for conflicts first
3. **NEVER** assume master is behind without verification
4. **NEVER** cherry-pick without understanding what's already merged
5. **NEVER** force push without explicit permission
6. **NEVER** delete branches without confirming they're merged

---

## 📝 Documentation Requirements

Before ANY git operation, document:

1. **What you checked**: List verification commands run
2. **What you found**: State current remote state
3. **What you're doing**: Explain intended action
4. **Why it's needed**: Justify the operation
5. **Expected outcome**: Describe what should happen

---

## 🔄 Post-Operation Verification

After completing git operations:

```bash
# Verify push was successful
git log origin/[branch] --oneline -1

# Verify PR was created
gh pr view [pr-number]

# Verify no unintended changes
git diff origin/[branch]
```

---

## 🚦 Quick Decision Tree

```
Need to make changes?
├── Check remote first → Feature exists?
│   ├── YES → Stop, it's already there
│   └── NO → Safe to proceed
│
Need to create PR?
├── Check existing PRs → Similar PR exists?
│   ├── YES → Stop, avoid duplicate
│   └── NO → Safe to create
│
Need to merge branches?
├── Test merge conflicts → Conflicts exist?
│   ├── YES → Resolve carefully
│   └── NO → Safe to merge
```

---

## 📊 Verification Log Template

```markdown
## Git Operation Verification Log

**Date**: [Date]
**Operation**: [PR/Merge/Push]
**Branch**: [Branch name]

### Verification Steps Completed:
- [ ] Fetched latest remote state
- [ ] Checked remote master for feature
- [ ] Compared local vs remote branches
- [ ] Searched for existing PRs
- [ ] Tested for merge conflicts

### Findings:
- Remote master contains: [list]
- Local branch unique changes: [list]
- Existing related PRs: [none/list]

### Decision:
[Proceed/Stop] because [reason]
```

---

**Remember**: When in doubt, CHECK FIRST. It's always faster to verify than to fix duplicate or conflicting work.