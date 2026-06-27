-- TMS (Transport Management) — vận đơn lưu cloud Supabase
CREATE TABLE IF NOT EXISTS tms_orders (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL,
  client        TEXT NOT NULL,
  client_id     TEXT,
  status        TEXT NOT NULL DEFAULT 'van_chuyen_noi_dia_tq',
  fee           NUMERIC(14, 0) DEFAULT 0,
  created_at    DATE,
  updated_at    DATE,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tms_orders_code_idx ON tms_orders (code);
CREATE INDEX IF NOT EXISTS tms_orders_client_idx ON tms_orders (client);
CREATE INDEX IF NOT EXISTS tms_orders_status_idx ON tms_orders (status);

ALTER TABLE tms_orders DISABLE ROW LEVEL SECURITY;
GRANT ALL ON tms_orders TO anon, authenticated;

-- Products catalog
CREATE TABLE IF NOT EXISTS tms_products (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  category  TEXT NOT NULL DEFAULT 'Hàng khác',
  unit      TEXT NOT NULL DEFAULT 'Cái',
  data      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tms_products DISABLE ROW LEVEL SECURITY;
GRANT ALL ON tms_products TO anon, authenticated;

-- Customers
CREATE TABLE IF NOT EXISTS tms_customers (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  data      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tms_customers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON tms_customers TO anon, authenticated;
