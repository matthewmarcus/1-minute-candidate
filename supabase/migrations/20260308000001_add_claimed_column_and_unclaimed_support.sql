-- Allow unclaimed candidates (auto-created from Civic API ballot data) to exist
-- without a corresponding auth.users entry.

-- 1. Drop the FK constraint that ties candidates.id to auth.users
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_id_fkey;

-- 2. Add a default so Postgres generates a UUID when id is omitted
ALTER TABLE candidates ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Make email nullable — unclaimed candidates don't have one
ALTER TABLE candidates ALTER COLUMN email DROP NOT NULL;

-- 4. Add claimed column: true = registered candidate, false = auto-created from Civic API
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS claimed boolean NOT NULL DEFAULT true;

-- Existing rows are all real registered candidates
UPDATE candidates SET claimed = true WHERE claimed IS NULL;
