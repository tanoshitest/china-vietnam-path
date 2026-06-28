import { orders as mockOrders, type Order } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { canSyncToSupabase, handleSupabaseSyncError } from "@/lib/supabase-health";
import { notifyTmsDataUpdated } from "@/lib/tms-sync";
import {
  fetchAllOrdersFromSupabase,
  fetchOrderFromSupabase,
  upsertOrderToSupabase,
  upsertOrdersToSupabase,
} from "@/services/orderService";
import { cachedLoad, seedTmsLoadCache } from "@/lib/tms-load-cache";

const ORDERS_KEY = "viet_thao_orders";
const MIGRATED_KEY = "viet_thao_orders_supabase_migrated";

function mergeOrders(remote: Order[], local: Order[]): Order[] {
  const byId = new Map<string, Order>();
  const remoteCodes = new Set(remote.map((order) => order.code));
  for (const order of remote) byId.set(order.id, order);
  for (const order of local) {
    if (!byId.has(order.id) && !remoteCodes.has(order.code)) {
      byId.set(order.id, order);
    }
  }
  return [...byId.values()];
}

export function getLocalOrders(): Order[] {
  if (typeof window === "undefined") return mockOrders;

  const stored = localStorage.getItem(ORDERS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Order[];
    } catch {
      return isSupabaseConfigured ? [] : mockOrders;
    }
  }

  if (isSupabaseConfigured) return [];

  localStorage.setItem(ORDERS_KEY, JSON.stringify(mockOrders));
  return mockOrders;
}

export function saveLocalOrders(orders: Order[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

async function syncLocalOnlyOrders(localOrders: Order[], remoteOrders: Order[]): Promise<void> {
  if (!(await canSyncToSupabase()) || localOrders.length === 0) return;

  const remoteIds = new Set(remoteOrders.map((order) => order.id));
  const remoteCodes = new Set(remoteOrders.map((order) => order.code));
  const pending = localOrders.filter(
    (order) => !remoteIds.has(order.id) && !remoteCodes.has(order.code),
  );

  if (pending.length === 0) return;

  try {
    await upsertOrdersToSupabase(pending);
  } catch (error) {
    handleSupabaseSyncError(error);
  }
}

async function migrateLocalOrdersToSupabase(localOrders: Order[]): Promise<void> {
  if (!(await canSyncToSupabase()) || localOrders.length === 0) return;
  if (localStorage.getItem(MIGRATED_KEY) === "1") return;

  try {
    await upsertOrdersToSupabase(localOrders);
    localStorage.setItem(MIGRATED_KEY, "1");
  } catch (error) {
    handleSupabaseSyncError(error);
  }
}

export async function loadAllOrders(options?: { force?: boolean }): Promise<Order[]> {
  const local = getLocalOrders();
  seedTmsLoadCache(ORDERS_KEY, local);

  return cachedLoad(
    ORDERS_KEY,
    async () => {
      if (!(await canSyncToSupabase())) {
        return local.length > 0 ? local : getLocalOrders();
      }

      try {
        let remote = await fetchAllOrdersFromSupabase();
        if (remote.length > 0) {
          await syncLocalOnlyOrders(local, remote);
          const remoteIds = new Set(remote.map((order) => order.id));
          const remoteCodes = new Set(remote.map((order) => order.code));
          const hadLocalOnly = local.some(
            (order) => !remoteIds.has(order.id) && !remoteCodes.has(order.code),
          );
          if (hadLocalOnly) {
            remote = await fetchAllOrdersFromSupabase();
          }
          const merged = mergeOrders(remote, local);
          saveLocalOrders(merged);
          seedTmsLoadCache(ORDERS_KEY, merged);
          return merged;
        }

        await migrateLocalOrdersToSupabase(local);
        if (local.length > 0) {
          remote = await fetchAllOrdersFromSupabase();
          if (remote.length > 0) {
            const merged = mergeOrders(remote, local);
            saveLocalOrders(merged);
            seedTmsLoadCache(ORDERS_KEY, merged);
            return merged;
          }
        }
        return local.length > 0 ? local : [];
      } catch (error) {
        handleSupabaseSyncError(error);
        return local;
      }
    },
    options,
  );
}

export async function loadOrderById(idOrCode: string): Promise<Order | null> {
  if (await canSyncToSupabase()) {
    try {
      const remote = await fetchOrderFromSupabase(idOrCode);
      if (remote) {
        const local = getLocalOrders();
        const merged = mergeOrders([remote], local);
        saveLocalOrders(merged);
        return remote;
      }
    } catch (error) {
      handleSupabaseSyncError(error);
    }
  }

  const local = getLocalOrders();
  return local.find((o) => o.id === idOrCode || o.code === idOrCode) ?? null;
}

export async function persistOrder(order: Order, allOrders?: Order[]): Promise<void> {
  const list =
    allOrders ??
    getLocalOrders().map((existing) => (existing.id === order.id ? order : existing));

  const exists = list.some((o) => o.id === order.id);
  const nextList = exists ? list : [...list, order];

  try {
    saveLocalOrders(nextList);
  } catch {
    throw new Error("STORAGE_FULL");
  }

  if (await canSyncToSupabase()) {
    try {
      await upsertOrderToSupabase(order);
      notifyTmsDataUpdated();
    } catch (error) {
      handleSupabaseSyncError(error);
      throw error;
    }
  }
}

/** Lưu danh sách local, chỉ upsert các bản ghi thay đổi lên cloud (tránh ghi đè dữ liệu tab khác). */
export async function persistOrdersBatch(changed: Order[], fullLocalList: Order[]): Promise<void> {
  saveLocalOrders(fullLocalList);
  if (!(await canSyncToSupabase()) || changed.length === 0) {
    notifyTmsDataUpdated();
    return;
  }

  try {
    await upsertOrdersToSupabase(changed);
    notifyTmsDataUpdated();
  } catch (error) {
    handleSupabaseSyncError(error);
    throw error;
  }
}

export async function persistOrdersList(orders: Order[]): Promise<void> {
  saveLocalOrders(orders);
  if (await canSyncToSupabase()) {
    try {
      await upsertOrdersToSupabase(orders);
      notifyTmsDataUpdated();
    } catch (error) {
      handleSupabaseSyncError(error);
      throw error;
    }
  }
}
