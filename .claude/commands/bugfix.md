# Bug Fix Workflow

Create a hotfix branch and resolve the reported issue safely for The Power100 Experience.

## Process:
1. **Ultrathink** about the root cause and potential side effects
2. Create branch: `claude/fix-$ARGUMENTS`
3. Reproduce the bug with a failing test
4. Identify root cause without breaking contractor flow
5. Implement minimal fix that resolves the issue
6. Verify fix doesn't break related TPE functionality
7. Test across different screen sizes and user flows
8. Update documentation if needed
9. Create PR with bug description and solution

## Arguments:
- $ARGUMENTS: Brief description of the bug (e.g., "navigation-mobile-menu" or "contractor-verification-error")

## Safety Protocol:
- Create backup branch before major fixes
- Test contractor flow end-to-end after changes
- Verify admin dashboard functionality
- Check partner matching logic integrity
- Ensure PowerConfidence scoring still works
- Test responsive behavior on mobile/desktop
- Verify TypeScript compilation

## Examples:
- `/bugfix contractor-flow-step3-navigation`
- `/bugfix admin-dashboard-partner-display`
- `/bugfix mobile-responsive-layout`