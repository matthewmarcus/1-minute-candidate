# 1 Minute Candidate — Project Briefing

## What We're Building

1 Minute Candidate is a dual-sided platform connecting political candidates directly with voters through short-form video. Candidates record and submit 60-second-or-less videos via a guided mobile app. Voters use the same app — or the web — to instantly find and watch videos of every candidate on their specific ballot, including while standing in line at the polling center.

The platform is owned and operated by 60secondz, LLC. The official domain is 1minutecandidate.com.

---

## The Two User Experiences

### Candidate Experience
- Candidate downloads the app and creates an account
- A guided recording flow coaches them through best practices (look at camera, state name, state office, deliver message)
- A live 60-second countdown timer enforces the format — recording stops at 60 seconds
- Candidate previews and re-records as many times as needed before submitting
- Submitted video enters a review queue for 1MC editorial approval
- Once approved, video is uploaded to the official 1 Minute Candidate YouTube channel
- Candidate profile page goes live on the platform with their embedded video

### Voter Experience
- Voter enters their address (or allows location access)
- App shows every candidate running in every race on their specific ballot — federal down to local
- Each candidate has a profile page with their 60-second video, office sought, party affiliation, and basic bio
- Voter experience is completely free, nonpartisan, and requires no account creation

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend / Mobile | Expo (React Native) | Single codebase for iOS, Android, and web |
| Backend & Database | Supabase | Postgres DB, auth, file storage, auto-generated APIs |
| Video Hosting | YouTube Data API | All videos on the official 1MC YouTube channel |
| Payments | Stripe | Candidate subscriptions and future ad payments |
| Ballot Data | Google Civic Information API | Address-based ballot and candidate lookup |
| Web Hosting | Vercel | Web frontend deployment |
| Mobile Builds | Expo Application Services (EAS) | iOS and Android builds and OTA updates |

---

## Monetization

### Candidate Subscriptions (Primary — Launch)
- Local race: $49 per election cycle
- State race: $99 per election cycle
- National race: $199 per election cycle
- Processed via Stripe

### Campaign Advertising & Sponsorships (Secondary — Growth Phase)
- Display placements on voter-facing pages
- Sponsored/featured candidate profile placement (clearly labeled)
- Targeted at campaign-adjacent businesses and civic organizations

---

## Database Schema (Supabase / Postgres)

### candidates
- id, name, email, office_sought, party, bio, state, district
- subscription_status, stripe_customer_id
- profile_approved (boolean), created_at

### videos
- id, candidate_id (FK), youtube_video_id, youtube_url
- status: submitted | under_review | approved | rejected
- review_notes, submitted_at, approved_at

### elections
- id, name, election_date, state, election_type (federal | state | local)

### races
- id, election_id (FK), office_name, district, level

### candidate_races
- candidate_id (FK), race_id (FK) — links candidates to races

---

## Build Phases

| Phase | Focus |
|-------|-------|
| 1 | Foundation — Supabase setup, auth, DB schema, candidate registration, Stripe |
| 2 | Candidate App — Guided video recording, 60s countdown, submission flow |
| 3 | Admin Dashboard — Review queue, YouTube upload workflow, election/race data |
| 4 | Voter Experience — Address lookup, candidate profiles, video embeds |
| 5 | Polish & Launch — Analytics, notifications, App Store submission, marketing site |

---

## Coding Conventions

- Use TypeScript throughout
- Functional React components with hooks — no class components
- Supabase client initialized once and imported where needed
- Environment variables for all API keys (Supabase, Stripe, YouTube, Google Civic) — never hardcode keys
- Keep components small and single-purpose
- Use Expo's built-in APIs for camera, location, and notifications where possible

---

## Project Structure (Target)

```
1-minute-candidate/
├── app/                  # Expo Router screens
│   ├── (candidate)/      # Candidate-facing screens
│   ├── (voter)/          # Voter-facing screens
│   └── (admin)/          # Admin/editorial screens
├── components/           # Reusable UI components
├── lib/                  # Supabase client, API helpers, utilities
├── hooks/                # Custom React hooks
├── constants/            # Colors, fonts, config values
├── assets/               # Images, icons, fonts
└── CLAUDE.md             # This file
```

---

## Current Status

- Phase 1 in progress
- GitHub repo: 1-minute-candidate
- Supabase project: created
- Stripe account: created (pricing tiers configured)
- YouTube channel: 1 Minute Candidate (official channel for all candidate videos)
- Google Civic Information API: access requested
- Domain: 1minutecandidate.com

---

## Important Notes

- All candidate videos are hosted exclusively on the official 1 Minute Candidate YouTube channel — candidates do NOT upload to their own channels
- The voter experience requires zero account creation — keep it frictionless
- The 60-second limit is a hard constraint — it is core to the brand and must be enforced in the recording UI
- Always ask for confirmation before running destructive database operations
- Commit frequently with clear, descriptive commit messages

## Pull Request Guidelines
- Always include a clear PR description summarizing what was changed and why
- Keep PR titles concise and descriptive