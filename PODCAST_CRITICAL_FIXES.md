# Critical Podcast Form Fixes Needed

## Issue 1: Frequency Field Value Mismatch
**Problem**: Public form sends lowercase values with underscores, admin expects capitalized values without underscores

### Public Form Values:
- `daily`, `weekly`, `bi_weekly`, `monthly`, `irregular`

### Admin Form Values:
- `Daily`, `Weekly`, `Biweekly`, `Monthly`, `Twice Weekly`

**Fix**: ✅ FIXED - Aligned public form to match admin values exactly
- Changed from lowercase to capitalized values
- Changed bi_weekly to Biweekly
- Added "Twice Weekly" option
- Removed "Irregular" option

## Issue 2: Host Fields Only Visible for Team Members
**Problem**: host_linkedin, host_company, host_bio only show when submissionType === 'team_member'

**Current Structure**:
- When host: Shows only host_email and host_phone
- When team_member: Shows ALL host fields including linkedin, company, bio

**Fix**: ✅ FIXED - Show ALL host fields for BOTH host and team_member options
- Consolidated host fields into single section
- Shows for both submissionType === 'host' OR 'team_member'
- Removed duplicate section
- All 5 host fields now visible: email, phone, linkedin, company, bio