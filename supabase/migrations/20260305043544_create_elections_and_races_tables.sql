CREATE TABLE elections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  election_date  date NOT NULL,
  state          char(2) NOT NULL,
  election_type  election_type NOT NULL
);

CREATE INDEX elections_state_idx ON elections(state);
CREATE INDEX elections_date_idx ON elections(election_date);

ALTER TABLE elections ENABLE ROW LEVEL SECURITY;

-- Everyone can read elections
CREATE POLICY "elections_select_all" ON elections
  FOR SELECT USING (true);


CREATE TABLE races (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  uuid NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  office_name  text NOT NULL,
  district     text,
  level        election_type NOT NULL
);

CREATE INDEX races_election_id_idx ON races(election_id);

ALTER TABLE races ENABLE ROW LEVEL SECURITY;

-- Everyone can read races
CREATE POLICY "races_select_all" ON races
  FOR SELECT USING (true);


CREATE TABLE candidate_races (
  candidate_id  uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  race_id       uuid NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  PRIMARY KEY (candidate_id, race_id)
);

CREATE INDEX candidate_races_race_id_idx ON candidate_races(race_id);

ALTER TABLE candidate_races ENABLE ROW LEVEL SECURITY;

-- Everyone can read candidate_races (to discover which candidates are in which race)
CREATE POLICY "candidate_races_select_all" ON candidate_races
  FOR SELECT USING (true);

-- Candidates can manage their own race associations
CREATE POLICY "candidate_races_insert_own" ON candidate_races
  FOR INSERT WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "candidate_races_delete_own" ON candidate_races
  FOR DELETE USING (auth.uid() = candidate_id);
