# Code Review Workflow

Perform comprehensive code review of recent changes in The Power100 Experience.

## Process:
1. **Think hard** about code quality, architecture, and TPE business logic
2. Review recent commits or specified changes
3. Check for TypeScript best practices
4. Verify component architecture patterns match TPE standards
5. Validate responsive design implementation
6. Check accessibility compliance
7. Review error handling and loading states
8. Verify test coverage and quality
9. Check performance implications
10. Ensure Power100 brand consistency
11. Validate business logic (contractor flow, partner matching)
12. Provide actionable feedback and recommendations

## Arguments:
- $ARGUMENTS: Specific file/component to review (optional, e.g., "contractorflow" or "admin-dashboard")

## Review Checklist:
- [ ] **TypeScript**: Proper types, no `any` usage
- [ ] **Architecture**: Follows TPE component patterns
- [ ] **Responsive**: Mobile-first design implemented
- [ ] **Brand**: Power100 colors and styling consistent
- [ ] **Error Handling**: Proper try/catch and user feedback
- [ ] **Loading States**: Appropriate loading indicators
- [ ] **Accessibility**: ARIA labels, keyboard navigation
- [ ] **Performance**: Optimized rendering, efficient queries
- [ ] **Tests**: Unit, integration, and E2E coverage
- [ ] **Business Logic**: Contractor flow integrity
- [ ] **Security**: Input validation, authentication
- [ ] **Documentation**: Code comments and README updates

## Focus Areas for TPE:
- Contractor verification flow integrity
- Partner matching algorithm correctness
- Admin dashboard data accuracy
- PowerConfidence scoring logic
- Email/SMS integration security
- Database query optimization (when backend exists)