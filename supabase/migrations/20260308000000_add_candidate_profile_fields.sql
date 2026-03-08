-- Add extended profile fields to candidates table
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS photo_url      text,
  ADD COLUMN IF NOT EXISTS website_url    text,
  ADD COLUMN IF NOT EXISTS twitter_handle text,
  ADD COLUMN IF NOT EXISTS facebook_url   text,
  ADD COLUMN IF NOT EXISTS phone          text;
