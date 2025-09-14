#!/bin/bash
# Git Commands for Event/Book/Podcast Forms Commit
# Date: September 12, 2025
# IMPORTANT: This will ONLY add the necessary form files, excluding all test scripts, docs, and conversation logs

echo "========================================="
echo "Starting selective git commit process..."
echo "========================================="

# 1. First, let's see current status
echo "Current git status:"
git status --short

# 2. Reset staging area to ensure clean start
echo "Resetting staging area..."
git reset

# 3. Add ONLY the backend controllers
echo "Adding backend controllers..."
git add tpe-backend/src/controllers/eventController.js
git add tpe-backend/src/controllers/bookController.js
git add tpe-backend/src/controllers/podcastController.js

# 4. Add frontend PUBLIC forms
echo "Adding public forms..."
git add tpe-front-end/src/components/event/EventOnboardingForm.tsx
git add tpe-front-end/src/components/book/BookOnboardingForm.tsx
git add tpe-front-end/src/components/podcast/PodcastOnboardingForm.tsx

# 5. Add frontend ADMIN forms
echo "Adding admin forms..."
git add tpe-front-end/src/components/admin/EventForm.tsx
git add tpe-front-end/src/components/admin/BookForm.tsx
git add tpe-front-end/src/components/admin/PodcastForm.tsx

# 6. Add admin dashboard pages
echo "Adding admin dashboard pages..."
git add tpe-front-end/src/app/admindashboard/events/page.tsx
git add "tpe-front-end/src/app/admindashboard/events/[id]/page.tsx"

# 7. Add type definitions
echo "Adding type definitions..."
git add tpe-front-end/src/lib/types/event.ts
# Check if these exist and have changes
git add tpe-front-end/src/lib/types/book.ts 2>/dev/null || true
git add tpe-front-end/src/lib/types/podcast.ts 2>/dev/null || true

# 8. Add API configuration (if modified)
echo "Adding API configuration..."
git add tpe-front-end/src/lib/api.ts 2>/dev/null || true

# 9. Add utility files
echo "Adding utility files..."
git add tpe-front-end/src/utils/jsonHelpers.ts 2>/dev/null || true
git add tpe-front-end/src/utils/arrayHelpers.tsx 2>/dev/null || true
git add tpe-backend/src/utils/jsonHelpers.js 2>/dev/null || true

# 10. Add validation tools
echo "Adding validation tools..."
git add tools/database-field-validator.js

# 11. Add the migration script
echo "Adding database migration script..."
git add PRODUCTION_MIGRATION_SEPT_2025.sql

# 12. Show what we're about to commit
echo "========================================="
echo "Files staged for commit:"
git status --short | grep "^[AM]"

echo "========================================="
echo "Files NOT staged (excluded):"
git status --short | grep "^[^AM]"

# 13. Confirm before committing
echo "========================================="
read -p "Do you want to proceed with the commit? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Create the commit
    git commit -m "fix: Complete field alignment for Event, Book, and Podcast forms

- Event Forms: Fixed all missing fields (POC contacts, dates, sponsors, etc.)
- Book Forms: Aligned all fields with database (submitter info, strategic fields)  
- Podcast Forms: Complete field parity (platform URLs, metrics, guest management)
- Backend: Controllers properly handle all fields with correct data types
- Frontend: Forms have proper field mappings and date formatting
- Database: Migration script included for all new columns

BREAKING: Requires database migration (PRODUCTION_MIGRATION_SEPT_2025.sql)

Co-Authored-By: Claude <noreply@anthropic.com>"

    echo "========================================="
    echo "Commit created successfully!"
    echo "========================================="
    
    # Ask about pushing
    read -p "Do you want to push to origin/master? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        git push origin master
        echo "✅ Pushed to production!"
    else
        echo "⏸️ Commit created but not pushed. Run 'git push origin master' when ready."
    fi
else
    echo "❌ Commit cancelled. Files remain staged."
fi

echo "========================================="
echo "Process complete!"
echo "========================================="

# EXCLUDED FILES (for reference):
# - "2025-09-08-Latest convo about step 7 add partner auto navigation bug fix.txt"
# - All .bat files
# - All EVENT_BATCH*.md, BOOK_FORM_*.md, PODCAST_*.md tracking files
# - All test_*.js files
# - All check_*.bat scripts
# - docs/AI-FIRST-STRATEGY.md and other AI docs
# - dev-manager-with-safety.js and other dev tools