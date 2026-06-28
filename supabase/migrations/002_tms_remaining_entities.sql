-- Nhà cung cấp, công nợ, người dùng, loại chi phí
CREATE TABLE IF NOT EXISTS tms_suppliers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'Others',
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tms_suppliers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON tms_suppliers TO anon, authenticated;

CREATE TABLE IF NOT EXISTS tms_debts (
  id            TEXT PRIMARY KEY,
  order_id      TEXT,
  waybill       TEXT,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tms_debts_order_id_idx ON tms_debts (order_id);
CREATE INDEX IF NOT EXISTS tms_debts_waybill_idx ON tms_debts (waybill);

ALTER TABLE tms_debts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON tms_debts TO anon, authenticated;

CREATE TABLE IF NOT EXISTS tms_users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL DEFAULT '',
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tms_users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON tms_users TO anon, authenticated;

CREATE TABLE IF NOT EXISTS tms_cost_types (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tms_cost_types DISABLE ROW LEVEL SECURITY;
GRANT ALL ON tms_cost_types TO anon, authenticated;
