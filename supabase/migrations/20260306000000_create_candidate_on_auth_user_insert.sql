-- Trigger function: inserts a candidates row when a new auth user is created.
-- Uses SECURITY DEFINER so it runs as the function owner (bypassing RLS),
-- which is necessary because the auth session doesn't exist yet when email
-- confirmation is required.
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
    bio
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'office_sought',
    NULLIF(NEW.raw_user_meta_data->>'party', ''),
    NULLIF(NEW.raw_user_meta_data->>'state', ''),
    NULLIF(NEW.raw_user_meta_data->>'district', ''),
    NULLIF(NEW.raw_user_meta_data->>'bio', '')
  );
  RETURN NEW;
END;
$$;

-- Fire the function after every new row in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_candidate_user();
