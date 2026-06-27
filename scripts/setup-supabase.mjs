#!/usr/bin/env node
/**
 * Tự tạo bảng Supabase khi chạy dev — không cần vào SQL Editor.
 * Cần một trong hai biến trong .env:
 *   SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres
 *   SUPABASE_DB_PASSWORD=[PASSWORD]   (script tự ghép URL từ VITE_SUPABASE_URL)
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envPaths = [
  join(root, ".env"),
  join(root, "..", "ikigai-learn-hub", ".env"),
];

for (const path of envPaths) {
  if (existsSync(path)) {
    config({ path, override: false });
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

function resolveDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password || !projectRef) return null;
  const encoded = encodeURIComponent(password);
  return `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`;
}

async function tableExists() {
  if (!supabaseUrl || !anonKey || supabaseUrl.includes("your-project")) return false;
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, anonKey);
  const { error } = await client.from("tms_orders").select("id").limit(1);
  if (!error) return true;
  if (error.code === "PGRST205") return false;
  console.warn("[setup-supabase] Kiểm tra bảng:", error.message);
  return false;
}

async function runMigration(dbUrl) {
  const sqlPath = join(root, "supabase", "migrations", "001_tms_orders.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const pg = await import("pg");
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(sql);
  await client.end();
}

async function main() {
  if (!supabaseUrl || !anonKey || supabaseUrl.includes("your-project")) {
    console.log("[setup-supabase] Chưa cấu hình Supabase — dùng localStorage.");
    return;
  }

  if (await tableExists()) {
    console.log("[setup-supabase] Bảng tms_orders đã sẵn sàng.");
    return;
  }

  const dbUrl = resolveDbUrl();
  if (!dbUrl) {
    console.log(
      "[setup-supabase] Bảng chưa có. Thêm SUPABASE_DB_PASSWORD vào .env rồi chạy: npm run setup-db",
    );
    console.log("[setup-supabase] App vẫn lưu tự động trên trình duyệt (localStorage).");
    return;
  }

  try {
    console.log("[setup-supabase] Đang tạo bảng TMS trên Supabase...");
    await runMigration(dbUrl);
    console.log("[setup-supabase] Đã tạo bảng thành công.");
  } catch (error) {
    console.error("[setup-supabase] Tạo bảng thất bại:", error.message || error);
    console.error("[setup-supabase] Kiểm tra SUPABASE_DB_PASSWORD trong .env.");
  }
}

main().catch((error) => {
  console.error("[setup-supabase]", error);
});
