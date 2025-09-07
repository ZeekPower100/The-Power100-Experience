# 📚 Book Entity - Complete Data Requirements
*Incorporating Greg's Strategic Insights*

---

## 🎯 Core Philosophy
Books are knowledge resources that help contractors solve specific problems. We need to understand not just WHAT the book contains, but WHO wrote it, WHY they wrote it, and HOW accessible they are for deeper engagement.

**IMPORTANT: For initial launch, ALL fields are OPTIONAL except basic contact info. We explain why each field matters but never block submission.**

---

## 📝 Data Collection Structure

### STEP 1: Book Information
**Basic Information (All Optional with Guidance)**

```yaml
# Book Basics
title: string                      # Book title (STRONGLY ENCOURAGED)
  # Why it matters: "This is how contractors will find your book"
  
author_name: string                # Full author name (STRONGLY ENCOURAGED)
  # Why it matters: "Builds your credibility and personal brand"
  
original_release_date: date        # First publication date (OPTIONAL)
  # Why it matters: "Shows the book's track record and relevance"
  
latest_edition_date: date          # Most recent edition/update (OPTIONAL)
  # Why it matters: "Contractors want current information"
  
isbn: string                       # ISBN-13 preferably (OPTIONAL)
  # Why it matters: "Helps us verify and find your book across platforms"
  
publisher: string                  # Publishing company (OPTIONAL)
  # Why it matters: "Adds credibility and helps with verification"

# Availability
purchase_links: array              # Where to buy (ENCOURAGED)
  # Why it matters: "Direct path for contractors to get your book"
  - amazon_url: string
  - barnes_noble_url: string
  - author_website_url: string
  - other_purchase_urls: array
  
formats_available: array           # Book formats (OPTIONAL)
  # Why it matters: "Contractors have different learning preferences"
  - format: enum                   # Hardcover/Paperback/eBook/Audiobook
  - price: string                  # Price for this format
  - link: string                   # Purchase link for this format

# Optional but Valuable
pdf_upload: file                   # Author can upload PDF (OPTIONAL)
  # Incentive: "Upload a PDF to unlock AI-powered insights and summaries
  # that will make your book more discoverable and actionable for contractors"
```

### STEP 2: Author & Contact Information
**Contact Details (Minimal Requirements)**

```yaml
# Author Contact (ONLY EMAIL REQUIRED IF SUBMITTING AS AUTHOR)
author_email: string               # Email (REQUIRED for authors, OPTIONAL for team)
  # Why it matters: "So we can contact you about opportunities"
  
author_phone: string               # Direct phone (OPTIONAL)
  # Why it matters: "For urgent partnership opportunities"
  
author_linkedin_url: string        # LinkedIn profile (ENCOURAGED)
  # Why it matters: "Contractors often research authors before buying"
  
author_website: string             # Personal/business website (OPTIONAL)
  # Why it matters: "Showcases your broader work and services"

# Executive Assistant Info (OPTIONAL - Shows only if toggled)
has_executive_assistant: boolean   # Toggle to show/hide EA fields
  # Why it matters: "Helps us reach you through the right channels"
  
ea_name: string                    # EA full name
ea_email: string                  # EA email  
ea_phone: string                  # EA phone
ea_scheduling_link: string        # Calendly or similar
  # Greg's insight: "Professional authors often work through EAs"

# Associated Companies (OPTIONAL but valuable)
author_companies: array            # Companies author is affiliated with
  # Why it matters: "Opens doors for broader partnerships"
  - company_name: string
  - role: string                  # CEO, Founder, Advisor, etc.
  - website: string
  - is_primary: boolean           # Main company affiliation
```

### STEP 3: Content & Influence
**What's Inside & Who Influenced It (All Optional)**

```yaml
# Key Citations (OPTIONAL - Greg's unique insight)
key_citations: array               # Top 3 influential citations
  # Why it matters: "Shows thought leadership and credibility"
  - cited_person: string          # Name of person cited
  - their_expertise: string       # What they're known for
  - citation_context: string      # How they influenced the book
  # Guidance: "Share up to 3 key influencers cited in your book"

# Content Classification (ENCOURAGED for matching)
focus_areas_covered: array        # Which contractor problems it solves
  # Why it matters: "Ensures your book reaches the right contractors"
  
topics: array                     # Detailed topic tags
  # Why it matters: "Improves discoverability in our system"
  
target_audience: text             # Who should read this
  # Why it matters: "Helps us match with appropriate contractors"
  
reading_level: enum               # Beginner/Intermediate/Advanced
  # Why it matters: "Sets proper expectations for readers"

# Key Takeaways (OPTIONAL but helpful)
main_concepts: array              # Top 5 concepts/frameworks
  # Why it matters: "Contractors can quickly assess value"
  - concept: string
  - brief_description: string
  - chapter_location: string     # Where to find it
```

### STEP 4: Author's Story & Vision
**The Why Behind the Book (All Optional but Impactful)**

```yaml
# Author's Motivation (OPTIONAL)
writing_inspiration: text          # "What influenced you to write this book?"
  # Why it matters: "Your story resonates with contractors facing similar challenges"

problems_addressed: text           # "What solutions were you hoping to provide?"
  # Why it matters: "Directly connects to contractor pain points"

# Author's Future Focus (OPTIONAL - Greg's forward-looking questions)
next_12_18_months: text           # "What are you focused on for the next 12-18 months?"
  # Why it matters: "Identifies partnership and speaking opportunities"
  
book_goals: text                  # "What are you hoping the book helps you accomplish?"
  # Why it matters: "Aligns your goals with contractor success"

author_availability: enum          # For speaking/consulting/partnerships
  # Why it matters: "Opens doors for live engagements"
  - 'actively_seeking'            # Wants engagements
  - 'selectively_available'       # Right opportunities only
  - 'not_available'               # Book only, no engagements
  - 'through_company'            # Engage via their company
```

### STEP 5: Engagement & Implementation
**How Contractors Can Go Deeper (All Optional)**

```yaml
# Beyond the Book (OPTIONAL)
companion_resources: array         # Additional materials
  # Why it matters: "Added value increases book adoption"
  - workbooks: boolean
  - online_course: boolean
  - templates: boolean
  - community_access: boolean
  - coaching_available: boolean

# Implementation Support (OPTIONAL)
implementation_difficulty: enum    # Easy/Moderate/Complex
  # Why it matters: "Sets realistic expectations"
  
typical_time_to_implement: string # "1 week", "1 month", "3 months"
  # Why it matters: "Helps contractors plan"
  
case_studies_included: boolean    # Real examples in book
  # Why it matters: "Practical examples increase success"
  
success_stories: array            # Readers who've succeeded
  # Why it matters: "Social proof drives adoption"
  - story: text
  - outcome: string
  - company_size: string         # Revenue tier

# Author Engagement Options (OPTIONAL)
speaking_topics: array            # What author speaks about
  # Why it matters: "Event matching opportunities"
  
workshop_available: boolean       # Can do workshops
  # Why it matters: "Hands-on learning opportunities"
  
consulting_available: boolean     # Offers consulting
  # Why it matters: "Deeper engagement options"
  
typical_engagement_fee: string    # Fee range (optional)
  # Why it matters: "Budget planning for contractors"
```

---

## 🎬 Form Flow Design

### Non-Blocking Progressive Form

**Page 1: Book Basics**
```
Title: [___________] (optional)
Author: [___________] (optional)

💡 The more information you provide, the better we can match 
   your book with contractors who need it most.

[Continue] [Save as Draft] [Skip to Contact Info]
```

**Page 2: Contact Information**
```
Email: [___________] (required for authors, optional for team)
Phone: [___________] (optional)
LinkedIn: [___________] (optional)

□ I have an executive assistant
[EA fields appear if checked]

💡 Professional tip: Including EA info helps us respect your 
   communication preferences and reach you efficiently.

[Continue] [Save as Draft] [Submit Basic Info]
```

**Page 3: Content & Citations** 
```
Who are the top 3 people you cite in your book? (optional)
[Dynamic list for citations]

What contractor challenges does your book address? (optional)
[Checkbox list of focus areas]

💡 Books with clear focus areas get 3x more visibility

[Continue] [Save as Draft] [Submit Current Info]
```

**Page 4: Your Story**
```
These questions help contractors connect with your journey:

What influenced you to write this book? (optional)
[Text area with character counter]

What are you focused on for the next 12-18 months? (optional)
[Text area]

💡 Authors who share their story see 40% higher engagement

[Continue] [Save as Draft] [Submit Current Info]
```

**Page 5: Engagement Options**
```
How else can contractors engage with you? (all optional)

□ Speaking available
□ Workshops available  
□ Consulting available
□ Have companion resources

💡 Books with engagement options generate 5x more partnerships

[Submit Complete Profile] [Submit Current Info] [Save as Draft]
```

---

## 💡 Form Completion Strategies

### For Team Members Filling Forms
- Quick mode: Just title, author, and one purchase link
- Can return later to enhance
- Bulk import option for multiple books
- AI can auto-fill from ISBN or Amazon URL

### For Authors
- Incentivize completion with benefits
- Show completion percentage
- Offer "verified author" badge for complete profiles
- Preview how their book will appear to contractors

### Progressive Enhancement
- Email reminders to complete profile
- "Your book is getting views! Add more info to increase matches"
- Seasonal campaigns: "Update your book for the new year"

---

## 🤖 AI Enhancement for Incomplete Profiles

When profiles are incomplete, AI can:

1. **Web Scraping** 
   - Pull data from Amazon/Goodreads
   - Extract author bio from LinkedIn
   - Find purchase links automatically

2. **ISBN Lookup**
   - Auto-populate publisher, dates, formats
   - Find cover image
   - Get description and reviews

3. **Content Analysis**
   - If PDF provided, extract everything needed
   - Generate summaries and key concepts
   - Identify citations automatically

4. **Smart Defaults**
   - Infer target audience from description
   - Suggest focus areas based on title/content
   - Estimate reading level and time

---

## 📊 Submission Scenarios

### Minimum Viable Book Entry (Team Member)
```yaml
title: "Beyond the Hammer"
author_name: "Brian Gottlieb"
purchase_links: 
  - amazon_url: "amazon.com/..."
# That's it! Book is live, AI enhances the rest
```

### Author Quick Submit
```yaml
title: "Beyond the Hammer"
author_name: "Brian Gottlieb"
author_email: "brian@example.com"  # Only required field
author_linkedin_url: "linkedin.com/in/brian"
focus_areas_covered: ["team_building", "leadership"]
# Author can enhance profile anytime
```

### Complete Profile (Ideal)
```yaml
# All fields filled
# Gets "Complete Profile" badge
# Priority in matching algorithm
# Featured in recommendations
```

---

## ✅ Implementation Notes

### Form Behavior
- **Save as Draft**: Available at every step
- **Skip Sections**: Can jump to any section
- **Auto-Save**: Every 30 seconds
- **Progress Indicator**: Shows completion percentage
- **Return Later**: Email link to continue

### Validation
- Only validate email format if provided
- No blocking validations except email for authors
- Gentle suggestions, not requirements
- Explain value of each field

### Team Member Features
- Bulk upload via CSV
- Quick-add mode
- Clone existing book as template
- AI auto-fill from minimal info

---

*This flexible approach ensures we can start collecting book data immediately while building toward complete profiles over time*