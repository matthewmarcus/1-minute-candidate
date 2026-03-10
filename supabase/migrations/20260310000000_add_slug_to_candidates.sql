-- Add slug column to candidates table for human-readable profile URLs
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Update the trigger to save slug from auth metadata on new candidate registration
CREATE OR REPLACE FUNCTION public.handle_new_candidate_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.candidates (
    id,
    name,
    email,
    office_sought,
    party,
    state,
    district,
    bio,
    slug
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'office_sought',
    NULLIF(NEW.raw_user_meta_data->>'party', ''),
    NULLIF(NEW.raw_user_meta_data->>'state', ''),
    NULLIF(NEW.raw_user_meta_data->>'district', ''),
    NULLIF(NEW.raw_user_meta_data->>'bio', ''),
    NULLIF(NEW.raw_user_meta_data->>'slug', '')
  );
  RETURN NEW;
END;
$$;
