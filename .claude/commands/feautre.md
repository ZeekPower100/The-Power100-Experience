# Feature Development Workflow

Create a new feature branch and implement the requested functionality following TPE best practices.

## Process:
1. **Think hard** about the feature requirements and impact on the Power100 Experience
2. Create feature branch: `claude/feature-$ARGUMENTS`
3. Analyze impact on contractor flow, partner matching, and admin dashboard
4. Write failing tests first (TDD approach)
5. Implement the feature with proper TypeScript types
6. Ensure responsive design and Power100 brand consistency
7. Test the feature thoroughly across frontend/backend
8. Document any new patterns or components
9. Create PR with detailed description

## Arguments:
- $ARGUMENTS: Brief description of the feature (e.g., "contractor-email-verification" or "backend-partner-api")

## Safety Checks:
- Never work on main/master branch
- Always maintain existing contractor flow functionality
- Follow TypeScript strict mode
- Use Power100 design system colors
- Add proper error handling and loading states
- Consider full-stack implications

## Examples:
- `/feature contractor-sms-verification`
- `/feature backend-partner-matching-api`
- `/feature admin-dashboard-analytics`