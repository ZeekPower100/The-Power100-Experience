# Deployment Workflow

Safely deploy The Power100 Experience changes to staging or production.

## Process:
1. **Think hard** about deployment impact and rollback strategy
2. Verify all tests pass (frontend and backend)
3. Check TypeScript compilation across entire project
4. Run build process for target environment
5. Create deployment branch if needed
6. Generate pre-deployment checklist
7. Deploy to staging first (always)
8. Run comprehensive smoke tests on staging
9. Test contractor flow end-to-end on staging
10. Monitor for errors and performance issues
11. Deploy to production only if staging successful
12. Monitor production metrics and user feedback

## Arguments:
- $ARGUMENTS: Environment target ("staging" or "production")

## Pre-Deployment Checklist:
- [ ] **All tests passing** (unit, integration, E2E)
- [ ] **TypeScript compiles** cleanly with no errors
- [ ] **Build succeeds** for target environment
- [ ] **No console errors** in browser
- [ ] **Contractor flow works** end-to-end
- [ ] **Admin dashboard accessible** and functional
- [ ] **Partner matching** algorithm working
- [ ] **Mobile responsive** on all devices
- [ ] **Database migrations** applied (when backend exists)
- [ ] **Environment variables** configured
- [ ] **SSL certificates** valid
- [ ] **Performance benchmarks** met

## Staging Validation:
- Test complete contractor onboarding flow
- Verify admin dashboard analytics
- Check partner integration endpoints
- Test SMS/email verification (sandbox mode)
- Validate PowerConfidence scoring
- Check responsive design on mobile/tablet/desktop

## Production Monitoring:
- User registration and flow completion rates
- API response times and error rates
- Database performance metrics
- Partner integration success rates
- Customer satisfaction feedback

## Rollback Plan:
- Keep previous version ready for immediate rollback
- Document rollback procedure
- Monitor key metrics for 24 hours post-deployment