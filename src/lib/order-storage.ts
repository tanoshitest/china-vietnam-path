import { orders as mockOrders, type Order } from "@/lib/mock-data";
import { canSyncToSupabase, handleSupabaseSyncError } from "@/lib/supabase-health";
import {
  fetchAllOrdersFromSupabase,
  fetchOrderFromSupabase,
  upsertOrderToSupabase,
  upsertOrdersToSupabase,
} from "@/services/orderService";

const ORDERS_KEY = "viet_thao_orders";
const MIGRATED_KEY = "viet_thao_orders_supabase_migrated";

export function getLocalOrders(): Order[] {
  if (typeof window === "undefined") return mockOrders;

  const stored = localStorage.getItem(ORDERS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Order[];
    } catch {
      return mockOrders;
    }
  }

  localStorage.setItem(ORDERS_KEY, JSON.stringify(mockOrders));
  return mockOrders;
}

export function saveLocalOrders(orders: Order[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
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

export async function loadAllOrders(): Promise<Order[]> {
  if (!(await canSyncToSupabase())) {
    return getLocalOrders();
  }

  try {
    const remote = await fetchAllOrdersFromSupabase();
    if (remote.length > 0) {
      saveLocalOrders(remote);
      return remote;
    }

    const local = getLocalOrders();
    await migrateLocalOrdersToSupabase(local);
    return local;
  } catch (error) {
    handleSupabaseSyncError(error);
    return getLocalOrders();
  }
}

export async function loadOrderById(idOrCode: string): Promise<Order | null> {
  if (await canSyncToSupabase()) {
    try {
      const remote = await fetchOrderFromSupabase(idOrCode);
      if (remote) {
        const local = getLocalOrders();
        const merged = local.some((o) => o.id === remote.id)
          ? local.map((o) => (o.id === remote.id ? remote : o))
          : [...local, remote];
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
    } catch (error) {
      handleSupabaseSyncError(error);
    }
  }
}

export async function persistOrdersList(orders: Order[]): Promise<void> {
  saveLocalOrders(orders);
  if (await canSyncToSupabase()) {
    try {
      await upsertOrdersToSupabase(orders);
    } catch (error) {
      handleSupabaseSyncError(error);
    }
  }
}
