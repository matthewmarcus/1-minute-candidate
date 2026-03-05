CREATE TABLE videos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id     uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  youtube_video_id text,
  youtube_url      text,
  status           video_status NOT NULL DEFAULT 'submitted',
  review_notes     text,
  submitted_at     timestamptz,
  approved_at      timestamptz
);

CREATE INDEX videos_candidate_id_idx ON videos(candidate_id);
CREATE INDEX videos_status_idx ON videos(status);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Candidates can read their own videos
CREATE POLICY "videos_select_own" ON videos
  FOR SELECT USING (auth.uid() = candidate_id);

-- Candidates can insert their own videos
CREATE POLICY "videos_insert_own" ON videos
  FOR INSERT WITH CHECK (auth.uid() = candidate_id);

-- Voters (anon) can read approved videos
CREATE POLICY "videos_select_approved" ON videos
  FOR SELECT USING (status = 'approved');
