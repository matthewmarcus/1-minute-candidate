-- Allow the service role to read all videos regardless of status.
-- The service_role bypasses RLS by default, but these policies make
-- the intent explicit and serve as documentation.

-- Admin: read all videos (any status) for the review queue
CREATE POLICY "videos_select_admin" ON videos
  FOR SELECT USING (auth.role() = 'service_role');

-- Admin: update any video (approve / reject workflow)
CREATE POLICY "videos_update_admin" ON videos
  FOR UPDATE USING (auth.role() = 'service_role');

-- Admin: read all candidate profiles for the review queue
CREATE POLICY "candidates_select_admin" ON candidates
  FOR SELECT USING (auth.role() = 'service_role');

-- Admin: update any candidate profile (e.g. set profile_approved = true)
CREATE POLICY "candidates_update_admin" ON candidates
  FOR UPDATE USING (auth.role() = 'service_role');
