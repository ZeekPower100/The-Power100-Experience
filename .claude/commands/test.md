# Test Creation Workflow

Generate comprehensive tests for TPE components, features, and business logic.

## Process:
1. Analyze the component/feature being tested in TPE context
2. Create test file in appropriate directory (frontend/backend)
3. Write unit tests for individual functions
4. Write integration tests for component interactions
5. Write E2E tests for critical contractor flow paths
6. Include edge cases and error scenarios
7. Test responsive behavior and accessibility
8. Test business logic (partner matching, PowerConfidence scoring)
9. Run full test suite to ensure no regressions

## Arguments:
- $ARGUMENTS: Component, feature, or flow to test (e.g., "VerificationStep" or "partner-matching-algorithm")

## Test Categories:
- **Unit**: Individual component behavior
- **Integration**: Component interactions and data flow
- **E2E**: Full contractor flow scenarios
- **API**: Backend endpoint testing (when backend is built)
- **Visual**: Responsive design validation
- **Business Logic**: Partner matching, scoring algorithms

## Examples:
- `/test VerificationStep`
- `/test contractor-flow-complete-journey`
- `/test admin-dashboard-analytics`
- `/test partner-matching-algorithm`