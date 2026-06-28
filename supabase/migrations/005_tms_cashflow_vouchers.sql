-- Phiếu thu / phiếu chi
CREATE TABLE IF NOT EXISTS tms_cashflow_vouchers (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL,
  type          TEXT NOT NULL,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tms_cashflow_vouchers_code_idx ON tms_cashflow_vouchers (code);
CREATE INDEX IF NOT EXISTS tms_cashflow_vouchers_type_idx ON tms_cashflow_vouchers (type);

ALTER TABLE tms_cashflow_vouchers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON tms_cashflow_vouchers TO anon, authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tms_cashflow_vouchers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
