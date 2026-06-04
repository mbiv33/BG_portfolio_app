-- Activity tracking schema for the Bivines Group portfolio portal.
-- One row per tracked event. Anonymous visitors have user_email = NULL.

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          INTEGER NOT NULL,            -- epoch milliseconds (server-stamped)
  visitor_id  TEXT,                        -- stable per browser (localStorage)
  session_id  TEXT,                        -- per tab/session (sessionStorage)
  user_email  TEXT,                        -- logged-in portal user, NULL = anonymous
  event_type  TEXT NOT NULL,               -- page_view|project_view|artifact_view|tab_change|click|login|login_failed|heartbeat
  project_id  TEXT,
  artifact_id TEXT,
  label       TEXT,                        -- free-form (tab id, button label, attempted email, etc.)
  device      TEXT,                        -- desktop|mobile|tablet
  browser     TEXT,
  os          TEXT,
  ip          TEXT,                        -- server-derived (CF-Connecting-IP)
  country     TEXT,                        -- server-derived (request.cf)
  city        TEXT,                        -- server-derived (request.cf)
  referrer    TEXT,
  path        TEXT,
  duration_ms INTEGER                      -- engaged time for heartbeat events
);

CREATE INDEX IF NOT EXISTS idx_events_ts          ON events (ts);
CREATE INDEX IF NOT EXISTS idx_events_user        ON events (user_email);
CREATE INDEX IF NOT EXISTS idx_events_ip          ON events (ip);
CREATE INDEX IF NOT EXISTS idx_events_type        ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_visitor     ON events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_project     ON events (project_id);
