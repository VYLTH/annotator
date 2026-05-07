-- annotator initial schema
-- run: psql $DATABASE_URL -f services/api/migrations/0001_initial.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS annotator_projects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  token_hash    TEXT NOT NULL UNIQUE,
  destinations  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS annotator_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    TEXT NOT NULL REFERENCES annotator_projects(id) ON DELETE CASCADE,
  comment       TEXT NOT NULL,
  rects         JSONB NOT NULL,
  image         BYTEA,
  image_r2_key  TEXT,
  url           TEXT NOT NULL,
  pathname      TEXT NOT NULL,
  viewport      JSONB NOT NULL,
  document      JSONB NOT NULL DEFAULT '{}'::jsonb,
  targets       JSONB NOT NULL DEFAULT '[]'::jsonb,
  env           JSONB NOT NULL DEFAULT '{}'::jsonb,
  console_buf   JSONB NOT NULL DEFAULT '[]'::jsonb,
  network_buf   JSONB NOT NULL DEFAULT '[]'::jsonb,
  errors_buf    JSONB NOT NULL DEFAULT '[]'::jsonb,
  perf          JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata      JSONB,
  status        TEXT NOT NULL DEFAULT 'open',
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annotator_feedback_project_status_created
  ON annotator_feedback (project_id, status, created_at DESC);
