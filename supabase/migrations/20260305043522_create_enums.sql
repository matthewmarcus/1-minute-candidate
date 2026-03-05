-- Enums
CREATE TYPE video_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected');
CREATE TYPE election_type AS ENUM ('federal', 'state', 'local');
CREATE TYPE subscription_status AS ENUM ('inactive', 'active', 'past_due', 'canceled');
