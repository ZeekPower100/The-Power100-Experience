# Emergency Backup Creation

Create immediate backup of current Power100 Experience work state.

## Process:
1. Create timestamped backup branch
2. Commit all current changes (including uncommitted)
3. Push backup to remote repository
4. Tag backup with descriptive message
5. Document backup location and contents
6. Verify backup integrity
7. Return to original working state

## Arguments:
- $ARGUMENTS: Optional backup description (e.g., "before-major-refactor" or "working-contractor-flow")

## Backup Naming Convention:
- Format: `backup/YYYY-MM-DD-HH-MM-SS-description`
- Always include timestamp for easy identification
- Push to remote immediately for safety
- Create backup before any risky operations

## What Gets Backed Up:
- All committed changes in current branch
- Uncommitted changes (staged and unstaged)
- Current project configuration
- Frontend and backend code (when applicable)
- Documentation and scripts

## Examples:
- `/backup before-backend-integration`
- `/backup working-admin-dashboard`
- `/backup stable-contractor-flow`

## Safety Notes:
- Backups are automatically pushed to remote
- Never delete backup branches without team approval
- Use before major refactoring or risky changes
- Can restore from backup if something goes wrong