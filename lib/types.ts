export type VideoStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';
export type ElectionType = 'federal' | 'state' | 'local';
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  office_sought: string;
  party: string | null;
  bio: string | null;
  state: string | null;
  district: string | null;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  profile_approved: boolean;
  created_at: string;
}

export interface Video {
  id: string;
  candidate_id: string;
  youtube_video_id: string | null;
  youtube_url: string | null;
  storage_path: string | null;
  status: VideoStatus;
  review_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
}

export interface Election {
  id: string;
  name: string;
  election_date: string;
  state: string;
  election_type: ElectionType;
}

export interface Race {
  id: string;
  election_id: string;
  office_name: string;
  district: string | null;
  level: ElectionType;
}

export interface CandidateRace {
  candidate_id: string;
  race_id: string;
}
