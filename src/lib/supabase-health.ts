import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const DISABLED_KEY = "tms_supabase_sync_disabled";

export function isSupabaseErrorMissingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === "PGRST205" ||
    e.code === "42P01" ||
    Boolean(e.message?.includes("Could not find the table")) ||
    Boolean(e.message?.includes("tms_orders"))
  );
}

export function disableSupabaseSync(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(DISABLED_KEY, "1");
  }
}

export function isSupabaseSyncDisabled(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DISABLED_KEY) === "1";
}

export function handleSupabaseSyncError(error: unknown): void {
  if (isSupabaseErrorMissingTable(error)) {
    disableSupabaseSync();
    console.info(
      "[TMS] Bảng Supabase chưa sẵn sàng — dữ liệu lưu trên trình duyệt. Thêm SUPABASE_DB_PASSWORD vào .env rồi chạy lại npm run dev để tự tạo bảng.",
    );
  }
}

let probePromise: Promise<boolean> | null = null;

/** Kiểm tra một lần: bảng tms_orders có tồn tại và ghi được không. */
export async function probeSupabaseSync(): Promise<boolean> {
  if (!isSupabaseConfigured || isSupabaseSyncDisabled()) return false;
  if (probePromise) return probePromise;

  probePromise = (async () => {
    try {
      const { error } = await supabase.from("tms_orders").select("id").limit(1);
      if (error) {
        handleSupabaseSyncError(error);
        return false;
      }
      return true;
    } catch (error) {
      handleSupabaseSyncError(error);
      return false;
    }
  })();

  return probePromise;
}

export async function canSyncToSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured || isSupabaseSyncDisabled()) return false;
  return probeSupabaseSync();
}
