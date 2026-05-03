-- migrate_email_voting.sql
-- Adds vote_subscriptions table for email notification opt-in.
-- Voters who confirm via magic link get notified when their topic
-- moves to in_development or released.
--
-- email_raw stored max 90 days (GDPR auto-expiry).
-- email_hash is permanent (needed to prevent duplicate subscriptions).

CREATE TABLE IF NOT EXISTS vote_subscriptions (
    id               SERIAL       PRIMARY KEY,
    topic_id         INTEGER      NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    email_hash       VARCHAR(64)  NOT NULL,
    email_raw        TEXT         NOT NULL,
    subscribed_at    TIMESTAMPTZ  DEFAULT NOW(),
    email_expires_at TIMESTAMPTZ  DEFAULT (NOW() + INTERVAL '90 days'),
    UNIQUE (topic_id, email_hash)
);

CREATE INDEX IF NOT EXISTS idx_vote_subs_topic ON vote_subscriptions(topic_id);
