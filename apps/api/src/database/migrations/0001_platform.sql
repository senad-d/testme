CREATE SCHEMA IF NOT EXISTS mobey_platform;

CREATE TABLE mobey_platform.migrations (
  position integer PRIMARY KEY CHECK (position > 0),
  name text NOT NULL UNIQUE CHECK (name ~ '^[0-9]{4}_[a-z0-9_]+[.]sql$'),
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
