# Public Capabilities Documentation

This directory contains documentation for **public-facing showcase and display systems** in The Power100 Experience platform.

## 📂 What Goes Here

Public capabilities are:
- **Publicly accessible** (no authentication required)
- **Showcase/display focused** (not transaction-heavy features)
- **Brand-building** (demonstrate quality, build trust)
- **Data-driven** (pull from internal systems but present externally)

## 📄 Current Documentation

### [LIVE-PCR-RANKINGS.md](./LIVE-PCR-RANKINGS.md)
Dynamic, ESPN-style showcase of partner PowerConfidence Ratings
- **Route**: `/live-pcrs`
- **Purpose**: Public pulse of partner quality
- **Status**: In Development

### Future Capabilities:
- Public PCR Landing Pages (individual partner pages)
- Partner Directory (searchable catalog)
- Event Showcase (upcoming events with public PCRs)
- Books & Podcasts Rankings

---

## 🎯 vs. Internal Features

**Public Capabilities** (this directory):
- Live PCR Rankings
- Public partner landing pages
- Event showcases
- Public-facing directories

**Internal Features** (`docs/features/`):
- PowerCard Feedback System
- AI Concierge
- Admin dashboards
- Lead management

**Rule of thumb**: If it requires login → `features/`. If it's public showcase → `public-capabilities/`

---

Last Updated: November 13, 2025
