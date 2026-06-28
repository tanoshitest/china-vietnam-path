import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type SupabaseProbeResult = {
  reachable: boolean;
  orderCount: number;
  error?: string;
};

/** Kiểm tra kết nối cloud (fetch thật, không chỉ ping rỗng). */
export async function probeSupabaseOrders(): Promise<SupabaseProbeResult> {
  if (!isSupabaseConfigured) {
    return { reachable: false, orderCount: 0, error: "Chưa cấu hình Supabase" };
  }

  try {
    const { data, error } = await supabase.from("tms_orders").select("id", { count: "exact" });
    if (error) {
      handleSupabaseSyncError(error);
      return { reachable: false, orderCount: 0, error: error.message };
    }
    return { reachable: true, orderCount: data?.length ?? 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    handleSupabaseSyncError(error);
    return { reachable: false, orderCount: 0, error: message };
  }
}

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

export function handleSupabaseSyncError(error: unknown): void {
  if (isSupabaseErrorMissingTable(error)) {
    console.info(
      "[TMS] Bảng Supabase chưa sẵn sàng — dữ liệu lưu trên trình duyệt. Chạy npm run setup-db.",
    );
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function probeSupabaseOnce(): Promise<boolean> {
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
}

/** Luôn thử lại — không cache trạng thái fail cũ trong session. */
export async function canSyncToSupabase(retries = 3): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (await probeSupabaseOnce()) return true;
    if (attempt < retries - 1) await sleep(400 * (attempt + 1));
  }

  return false;
}

export async function probeSupabaseSync(): Promise<boolean> {
  return canSyncToSupabase();
}
