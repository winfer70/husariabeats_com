-- husariabeats — PostgreSQL schema bootstrap
-- Runs automatically on first container start via docker-entrypoint-initdb.d/
--
-- Tables:
--   topics  — community-suggested song/album ideas for voting
--   votes   — one vote per email (stored as SHA-256 hash) per topic per 24h

CREATE TABLE IF NOT EXISTS topics (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    -- open | in_development | released
    status      VARCHAR(50)  DEFAULT 'open',
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
    id          SERIAL PRIMARY KEY,
    topic_id    INTEGER      REFERENCES topics(id) ON DELETE CASCADE,
    -- SHA-256 of voter email — never store raw email
    email_hash  VARCHAR(64)  NOT NULL,
    voted_at    TIMESTAMPTZ  DEFAULT NOW(),
    -- one vote per email hash per topic
    UNIQUE (topic_id, email_hash)
);

CREATE INDEX IF NOT EXISTS idx_votes_topic      ON votes(topic_id);
CREATE INDEX IF NOT EXISTS idx_votes_email_hash ON votes(email_hash);

-- Seed: example topics for initial display
INSERT INTO topics (title, description, status) VALUES
    ('Husaria at Vienna 1683',  'Full documentary on the Battle of Vienna charge', 'open'),
    ('Polish-Ottoman Wars',     'Series covering all major engagements 1620-1696', 'open'),
    ('Pancerni cavalry',        'Lighter cavalry complement to husaria', 'open')
ON CONFLICT DO NOTHING;
