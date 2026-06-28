#!/usr/bin/env node
/**
 * Tự tạo bảng Supabase khi chạy dev — không cần vào SQL Editor.
 * Cần một trong hai biến trong .env:
 *   SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres
 *   SUPABASE_DB_PASSWORD=[PASSWORD]   (script tự ghép URL từ VITE_SUPABASE_URL)
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
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

function resolveDbUrls() {
  if (process.env.SUPABASE_DB_URL) return [process.env.SUPABASE_DB_URL];

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password || !projectRef) return [];

  const encoded = encodeURIComponent(password);
  const region = process.env.SUPABASE_DB_REGION || "ap-northeast-1";
  const poolerShards = process.env.SUPABASE_POOLER_SHARD
    ? [process.env.SUPABASE_POOLER_SHARD]
    : ["1", "0"];

  const poolerUrls = poolerShards.flatMap((shard) => [
    `postgresql://postgres.${projectRef}:${encoded}@aws-${shard}-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encoded}@aws-${shard}-${region}.pooler.supabase.com:6543/postgres`,
  ]);

  return [
    ...poolerUrls,
    `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`,
  ];
}

async function connectPgClient(pg) {
  const urls = resolveDbUrls();
  if (urls.length === 0) return null;

  let lastError;
  for (const connectionString of urls) {
    const client = new pg.default.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
    }
  }

  throw lastError;
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

async function runAllMigrations() {
  const migrationsDir = join(root, "supabase", "migrations");
  const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
  const pg = await import("pg");
  const client = await connectPgClient(pg);
  if (!client) return;

  try {
    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      await client.query(sql);
      console.log(`[setup-supabase] Đã apply ${file}`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  if (!supabaseUrl || !anonKey || supabaseUrl.includes("your-project")) {
    console.log("[setup-supabase] Chưa cấu hình Supabase — dùng localStorage.");
    return;
  }

  const dbUrls = resolveDbUrls();
  if (dbUrls.length === 0) {
    const ready = await tableExists();
    if (ready) {
      console.log("[setup-supabase] Bảng TMS đã sẵn sàng (chưa chạy migration mới — thiếu SUPABASE_DB_PASSWORD).");
    } else {
      console.log(
        "[setup-supabase] Bảng chưa có. Thêm SUPABASE_DB_PASSWORD vào .env rồi chạy: npm run setup-db",
      );
      console.log("[setup-supabase] App vẫn lưu trên trình duyệt (localStorage).");
    }
    return;
  }

  try {
    console.log("[setup-supabase] Đang đồng bộ schema TMS lên Supabase...");
    await runAllMigrations();
    console.log("[setup-supabase] Schema TMS đã sẵn sàng.");
  } catch (error) {
    console.error("[setup-supabase] Migration thất bại:", error.message || error);
    console.error("[setup-supabase] Kiểm tra SUPABASE_DB_PASSWORD trong .env.");
  }
}

main().catch((error) => {
  console.error("[setup-supabase]", error);
});
