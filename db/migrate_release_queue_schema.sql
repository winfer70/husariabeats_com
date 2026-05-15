-- Migration: align release_queue schema with API router expectations
-- API expects: status IN ('pending','releasing','released','failed')
--              columns: topic_id, upload_post_request_id, released_at

BEGIN;

-- 1. Add missing columns
ALTER TABLE release_queue
  ADD COLUMN IF NOT EXISTS topic_id               INT  REFERENCES topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upload_post_request_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS released_at            TIMESTAMPTZ;

-- 2. Drop old CHECK constraint (find by name)
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE  conrelid = 'release_queue'::regclass AND contype = 'c' AND conname LIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE release_queue DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- 3. Remap old status values before adding new constraint
UPDATE release_queue SET status = 'pending'  WHERE status = 'queued';
UPDATE release_queue SET status = 'failed'   WHERE status = 'skipped';

-- 4. Add new constraint matching API expectations
ALTER TABLE release_queue
  ADD CONSTRAINT release_queue_status_check
  CHECK (status IN ('pending','releasing','released','failed'));

-- 5. Fix default
ALTER TABLE release_queue ALTER COLUMN status SET DEFAULT 'pending';

COMMIT;
