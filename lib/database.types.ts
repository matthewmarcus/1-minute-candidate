export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      candidates: {
        Row: {
          id: string;
          name: string;
          email: string;
          office_sought: string;
          party: string | null;
          bio: string | null;
          state: string | null;
          district: string | null;
          subscription_status: string;
          stripe_customer_id: string | null;
          profile_approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          office_sought: string;
          party?: string | null;
          bio?: string | null;
          state?: string | null;
          district?: string | null;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          profile_approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          office_sought?: string;
          party?: string | null;
          bio?: string | null;
          state?: string | null;
          district?: string | null;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          profile_approved?: boolean;
          created_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          candidate_id: string;
          youtube_video_id: string | null;
          youtube_url: string | null;
          status: string;
          review_notes: string | null;
          submitted_at: string | null;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          youtube_video_id?: string | null;
          youtube_url?: string | null;
          status?: string;
          review_notes?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          youtube_video_id?: string | null;
          youtube_url?: string | null;
          status?: string;
          review_notes?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
        };
      };
      elections: {
        Row: {
          id: string;
          name: string;
          election_date: string;
          state: string;
          election_type: string;
        };
        Insert: {
          id?: string;
          name: string;
          election_date: string;
          state: string;
          election_type: string;
        };
        Update: {
          id?: string;
          name?: string;
          election_date?: string;
          state?: string;
          election_type?: string;
        };
      };
      races: {
        Row: {
          id: string;
          election_id: string;
          office_name: string;
          district: string | null;
          level: string;
        };
        Insert: {
          id?: string;
          election_id: string;
          office_name: string;
          district?: string | null;
          level: string;
        };
        Update: {
          id?: string;
          election_id?: string;
          office_name?: string;
          district?: string | null;
          level?: string;
        };
      };
      candidate_races: {
        Row: {
          candidate_id: string;
          race_id: string;
        };
        Insert: {
          candidate_id: string;
          race_id: string;
        };
        Update: {
          candidate_id?: string;
          race_id?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      video_status: 'submitted' | 'under_review' | 'approved' | 'rejected';
      election_type: 'federal' | 'state' | 'local';
      subscription_status: 'inactive' | 'active' | 'past_due' | 'canceled';
    };
  };
}
