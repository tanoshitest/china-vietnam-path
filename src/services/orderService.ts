import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Order, OrderStatus } from "@/lib/mock-data";
import type { Database } from "@/lib/database.types";

type TmsOrderRow = Database["public"]["Tables"]["tms_orders"]["Row"];

export function rowToOrder(row: TmsOrderRow): Order {
  const data = (row.data ?? {}) as Partial<Order>;
  return {
    ...data,
    id: row.id,
    code: row.code,
    client: row.client,
    clientId: row.client_id ?? data.clientId ?? "",
    status: (row.status ?? data.status ?? "van_chuyen_noi_dia_tq") as OrderStatus,
    fee: Number(row.fee ?? data.fee ?? 0),
    createdAt: row.created_at ?? data.createdAt ?? "",
    updatedAt: row.updated_at ?? data.updatedAt ?? undefined,
    weight: data.weight ?? "",
    origin: data.origin ?? "",
    destination: data.destination ?? "",
    images: data.images ?? [],
    attachments: data.attachments,
    timeline: data.timeline ?? [],
    costs: data.costs ?? [],
    items: data.items ?? [],
    note: data.note,
    masterBill: data.masterBill,
    logs: data.logs,
  };
}

export function orderToRow(order: Order): Database["public"]["Tables"]["tms_orders"]["Insert"] {
  return {
    id: order.id,
    code: order.code,
    client: order.client,
    client_id: order.clientId,
    status: order.status,
    fee: order.fee,
    created_at: order.createdAt || null,
    updated_at: order.updatedAt || order.createdAt || null,
    data: order as unknown as Database["public"]["Tables"]["tms_orders"]["Insert"]["data"],
    updated_at_ts: new Date().toISOString(),
  };
}

export async function fetchAllOrdersFromSupabase(): Promise<Order[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("tms_orders")
    .select("*")
    .order("updated_at_ts", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToOrder);
}

export async function upsertOrderToSupabase(order: Order): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from("tms_orders")
    .upsert(orderToRow(order), { onConflict: "id" });

  if (error) throw error;
}

export async function upsertOrdersToSupabase(orders: Order[]): Promise<void> {
  if (!isSupabaseConfigured || orders.length === 0) return;

  const { error } = await supabase
    .from("tms_orders")
    .upsert(orders.map(orderToRow), { onConflict: "id" });

  if (error) throw error;
}

export async function fetchOrderFromSupabase(idOrCode: string): Promise<Order | null> {
  if (!isSupabaseConfigured) return null;

  const byId = await supabase.from("tms_orders").select("*").eq("id", idOrCode).maybeSingle();
  if (byId.data) return rowToOrder(byId.data);
  if (byId.error) throw byId.error;

  const byCode = await supabase.from("tms_orders").select("*").eq("code", idOrCode).maybeSingle();
  if (byCode.error) throw byCode.error;
  return byCode.data ? rowToOrder(byCode.data) : null;
}
