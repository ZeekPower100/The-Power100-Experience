# Podcast Tables: Database vs Model Field Comparison

## 1. PODCAST_SHOWS

### Database Columns (14 fields):
- id
- name
- host
- description
- logo_url
- website
- rss_feed_url
- category
- frequency
- average_episode_length
- total_episodes
- is_active
- created_at
- updated_at

### Model Expects (21 fields):
- title (❌ should be 'name')
- description ✅
- host_name (❌ should be 'host')
- host_email (❌ not in DB)
- category ✅
- website_url (❌ should be 'website')
- rss_feed_url ✅
- apple_podcasts_url (❌ not in DB)
- spotify_url (❌ not in DB)
- google_podcasts_url (❌ not in DB)
- total_episodes ✅
- status (❌ should be 'is_active')
- cover_art_url (❌ should be 'logo_url')
- language (❌ not in DB)
- explicit_content (❌ not in DB)
- copyright (❌ not in DB)
- itunes_category (❌ not in DB)
- tags (❌ not in DB)
- release_schedule (❌ should be 'frequency')
- contact_email (❌ not in DB)
- average_episode_length ✅

### Missing from Model:
- frequency (mapped to release_schedule incorrectly)
- created_at
- updated_at

---

## Let me check the other tables...