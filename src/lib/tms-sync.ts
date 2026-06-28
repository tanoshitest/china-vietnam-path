import { supabase, isSupabaseConfigured, emitCloudStatus } from "@/lib/supabase";
import { preloadTmsData } from "@/lib/preload-tms-data";
import { invalidateTmsLoadCache } from "@/lib/tms-load-cache";
import { probeSupabaseOrders } from "@/lib/supabase-health";

export const TMS_DATA_UPDATED_EVENT = "tms-data-updated";
const SYNC_CHANNEL = "tms-cross-tab";

const TMS_TABLES = [
  "tms_orders",
  "tms_products",
  "tms_customers",
  "tms_suppliers",
  "tms_debts",
  "tms_users",
  "tms_cost_types",
  "tms_cashflow_vouchers",
] as const;

const TMS_LOCAL_KEYS = new Set([
  "viet_thao_orders",
  "viet_thao_products",
  "viet_thao_customers",
  "viet_thao_suppliers",
  "viet_thao_debts",
  "viet_thao_users",
  "viet_thao_cost_types",
  "viet_thao_cashflow_vouchers",
]);

let started = false;
let stopRealtime: (() => void) | null = null;
let stopBroadcast: (() => void) | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

async function refreshAllTmsData(options?: { silent?: boolean; force?: boolean }): Promise<void> {
  if (!options?.silent) emitCloudStatus("syncing");
  if (options?.force) invalidateTmsLoadCache();
  try {
    await preloadTmsData({ force: options?.force });
    const probe = await probeSupabaseOrders();
    emitCloudStatus(probe.reachable ? "online" : "offline");
  } catch {
    emitCloudStatus("offline");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TMS_DATA_UPDATED_EVENT));
  }
}

function scheduleRefresh(silent = true): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshAllTmsData({ silent });
  }, 350);
}

/** Báo tab/trình duyệt khác tải lại từ cloud. */
export function broadcastTmsSync(): void {
  if (typeof window === "undefined") return;
  try {
    new BroadcastChannel(SYNC_CHANNEL).postMessage("pull");
  } catch {
    /* BroadcastChannel không hỗ trợ */
  }
}

/** Cập nhật UI tab hiện tại + báo tab cùng trình duyệt. */
export function notifyTmsDataUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TMS_DATA_UPDATED_EVENT));
  }
  broadcastTmsSync();
}

function startBroadcastListener(): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;

  const channel = new BroadcastChannel(SYNC_CHANNEL);
  channel.onmessage = () => scheduleRefresh(true);
  return () => channel.close();
}

function startRealtimeSync(): () => void {
  if (!isSupabaseConfigured) return () => undefined;

  const channel = supabase.channel("tms-live-sync");

  for (const table of TMS_TABLES) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => scheduleRefresh(true),
    );
  }

  channel.subscribe((status) => {
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      scheduleRefresh(true);
    }
  });

  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Tự đồng bộ: Realtime + BroadcastChannel + storage + focus + mỗi 3 giây. */
export function initTmsAutoSync(options?: { skipInitialRefresh?: boolean }): () => void {
  if (typeof window === "undefined" || started) return () => undefined;
  started = true;

  const onFocus = () => scheduleRefresh(true);
  const onVisible = () => {
    if (document.visibilityState === "visible") scheduleRefresh(true);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key && TMS_LOCAL_KEYS.has(event.key)) {
      invalidateTmsLoadCache(event.key);
      notifyTmsDataUpdated();
    }
  };

  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("storage", onStorage);
  stopBroadcast = startBroadcastListener();
  stopRealtime = startRealtimeSync();

  const intervalId = window.setInterval(() => {
    scheduleRefresh(true);
  }, 30000);

  if (!options?.skipInitialRefresh) {
    void refreshAllTmsData({ silent: false, force: true });
  }

  return () => {
    started = false;
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("storage", onStorage);
    window.clearInterval(intervalId);
    if (refreshTimer) clearTimeout(refreshTimer);
    stopBroadcast?.();
    stopBroadcast = null;
    stopRealtime?.();
    stopRealtime = null;
  };
}

export { refreshAllTmsData };
