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
| Email | Resend | Transactional emails to candidates |

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
- storage_path (set to null after approve/reject — file is deleted from storage)

### elections
- id, name, election_date, state, election_type (federal | state | local)

### races
- id, election_id (FK), office_name, district, level

### candidate_races
- candidate_id (FK), race_id (FK) — links candidates to races

---

## Supabase Edge Functions

### upload-to-youtube (verify_jwt: true)
- Called by admin review screen on video approval
- Downloads video from Supabase Storage using service role
- Refreshes YouTube OAuth token, uploads video as unlisted
- Sets selfDeclaredMadeForKids: false on all uploads
- Returns youtube_video_id and youtube_url
- After successful upload, the video file is deleted from Supabase Storage

### notify-candidate (verify_jwt: false)
- Sends transactional emails via Resend API
- Supports three statuses: submitted | approved | rejected
- Called from record.tsx on submission, and admin review screen on approve/reject
- Uses RESEND_API_KEY Supabase secret
- Sends from noreply@1minutecandidate.com

---

## Build Phases

| Phase | Status | Focus |
|-------|--------|-------|
| 1 | ✅ Complete | Foundation — Supabase setup, auth, DB schema, candidate registration, Stripe config |
| 2 | ✅ Complete | Candidate App — Guided video recording, 60s countdown, submission flow |
| 3 | ✅ Complete | Admin Dashboard — Review queue, YouTube upload, approve/reject, email notifications |
| 4 | 🔄 In Progress | Voter Experience — Address lookup, Google Civic API, candidate profiles, video embeds |
| 5 | ⏳ Pending | Polish & Launch — Stripe payments, candidate dashboard polish, App Store submission |

---

## Current App Route Structure

```
app/
├── _layout.tsx
├── index.tsx                    # Root redirect
├── +not-found.tsx
├── (candidate)/
│   ├── _layout.tsx
│   ├── index.tsx                # Candidate dashboard
│   ├── login.tsx
│   ├── register.tsx
│   ├── profile.tsx
│   ├── record.tsx               # Video recording flow
│   └── subscribe.tsx
├── (voter)/
│   ├── _layout.tsx
│   ├── index.tsx                # Voter address entry (Phase 4)
│   ├── ballot.tsx               # Races on voter's ballot (Phase 4)
│   └── candidate/[id].tsx       # Candidate profile with video (Phase 4)
└── admin/
    ├── _layout.tsx
    ├── index.tsx                # Admin review queue
    ├── login.tsx
    └── review/[id].tsx          # Video review screen
```

Note: Admin routes are at `admin/` — the URL is `/admin` not `/(admin)`.

---

## Key Technical Notes

### Platform-Specific Code
- `expo-screen-orientation` is mobile-only — use `hooks/useScreenOrientation.native.ts` for native and `hooks/useScreenOrientation.ts` as web stub
- `expo-file-system/next` (ExpoFile) is NOT available in Expo Go — use legacy `FileSystem.readAsStringAsync` with base64 encoding for video upload
- Video recording is mobile-only — show "Video recording is only available on the mobile app" on web

### Web Bundler
- `app.json` has `"web": { "output": "single", "bundler": "metro" }` — SPA mode to avoid expo-server ReadableStream errors
- Admin dashboard works correctly at `/admin` in browser and on mobile

### Video Upload
- Videos are read as base64 using `FileSystem.readAsStringAsync(uri, { encoding: Base64 })` then converted to Uint8Array for Supabase Storage upload
- Supabase Storage free tier enforces 50MB file size limit — full 60s iPhone videos may exceed this
- Fix before launch: upgrade to Supabase Pro ($25/mo) or implement direct YouTube upload from phone

### Supabase Storage
- Bucket: `candidate-videos` (private)
- Files are deleted from storage after admin approves or rejects — only kept during review window

### Email Notifications
- Candidates receive emails at three points: video submitted, video approved, video rejected
- notify-candidate Edge Function has verify_jwt: false

---

## Coding Conventions

- Use TypeScript throughout
- Functional React components with hooks — no class components
- Supabase client (`lib/supabase.ts`) initialized once and imported where needed
- Admin operations use `lib/supabaseAdmin.ts` (service role key, bypasses RLS)
- Environment variables for all API keys — never hardcode keys
- Keep components small and single-purpose
- Use Expo's built-in APIs for camera, location, and notifications where possible
- Wrap mobile-only packages with Platform.OS checks or use .native.ts / .ts file pairs

---

## Pull Requests

ALWAYS include a PR description. Never create a PR without one.
The description must summarize: what was changed, why, and any testing notes.
Do not use git worktrees. Make all changes directly in the current working directory.

---

## Important Notes

- All candidate videos are hosted exclusively on the official 1 Minute Candidate YouTube channel — candidates do NOT upload to their own channels
- The voter experience requires zero account creation — keep it frictionless
- The 60-second limit is a hard constraint — it is core to the brand and must be enforced in the recording UI
- Always ask for confirmation before running destructive database operations
- Commit frequently with clear, descriptive commit messages
- Supabase project ID: dbvuptwcjudfpimjxfei
