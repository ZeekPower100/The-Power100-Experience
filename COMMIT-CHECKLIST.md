# Commit Checklist for TPE

## Before Every Commit:

### 1. Check ALL Modified Files
```bash
git status -s
# Look for 'M' (modified) files - these are often missed!
```

### 2. Entity Management Features
When adding new entities (Books, Events, Podcasts, etc.):
- [ ] Frontend Form Component (e.g., BookForm.tsx)
- [ ] Frontend Management Page (e.g., /admindashboard/books/page.tsx)
- [ ] Admin Dashboard Cards (admindashboard/page.tsx)
- [ ] Backend Controller (e.g., bookController.js)
- [ ] Backend Routes (e.g., bookRoutes.js)
- [ ] Server.js Route Registration
- [ ] API Types/Interfaces
- [ ] Database Migration (if schema changes)

### 3. Feature Verification
- [ ] Run `npm run dev` in both frontend and backend
- [ ] Test all new pages load
- [ ] Test all API endpoints work
- [ ] Check data displays correctly

### 4. Staging Strategy
```bash
# Option 1: Stage everything for a feature
git add tpe-frontend/src/components/admin/*Form.tsx
git add tpe-frontend/src/app/admindashboard/*/
git add tpe-backend/src/controllers/*Controller.js
git add tpe-backend/src/routes/*Routes.js
git add tpe-backend/src/server.js

# Option 2: Interactive staging to review
git add -p

# Option 3: Stage all and review
git add -A
git status
git diff --cached
```

### 5. Common Pitfalls to Avoid
- ❌ Don't forget to stage modified files (M status)
- ❌ Don't forget server.js when adding new routes
- ❌ Don't forget admin dashboard navigation cards
- ❌ Don't commit test/temporary changes (like disabled features)

### 6. Final Check
```bash
# See exactly what will be committed:
git diff --cached --name-only

# Verify routes are registered:
grep -E "app.use.*Routes" tpe-backend/src/server.js

# Verify dashboard has navigation:
grep -E "Manage Books|Manage Events|Manage Podcasts" tpe-front-end/src/app/admindashboard/page.tsx
```

## Red Flags Before Pushing:
- 🚨 Modified files not staged
- 🚨 New features without navigation
- 🚨 Routes without server.js registration
- 🚨 Forms without backend endpoints