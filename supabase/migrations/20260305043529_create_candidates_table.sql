CREATE TABLE candidates (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text NOT NULL,
  office_sought   text NOT NULL,
  party           text,
  bio             text,
  state           char(2),
  district        text,
  subscription_status subscription_status NOT NULL DEFAULT 'inactive',
  stripe_customer_id  text,
  profile_approved    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Candidates can read and update their own row
CREATE POLICY "candidates_select_own" ON candidates
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "candidates_insert_own" ON candidates
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "candidates_update_own" ON candidates
  FOR UPDATE USING (auth.uid() = id);

-- Voters (anon) can read approved candidate profiles
CREATE POLICY "candidates_select_approved" ON candidates
  FOR SELECT USING (profile_approved = true);
