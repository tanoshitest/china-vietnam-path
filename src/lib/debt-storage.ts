import { orders as mockOrders, type Order } from "./mock-data";
import { createSyncStorage } from "@/lib/sync-storage";
import type { Database } from "@/lib/database.types";
import { getLocalOrders, loadAllOrders } from "@/lib/order-storage";

export type CostBreakdownValue = number | { amount?: number; partyId?: string };

export type StoredDebtRecord = {
  id: string;
  orderId?: string;
  waybill?: string;
  amount?: number;
  recordType?: "receivable" | "payable" | "cost";
  kind?: string;
  paymentStatus?: string;
  status?: string;
  costBreakdown?: Record<string, CostBreakdownValue>;
};

export function getCostBreakdownEntryAmount(value: CostBreakdownValue | undefined): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") return value.amount ?? 0;
  return 0;
}

export type EbtRow = {
  orderId: string;
  orderCode: string;
  customer: string;
  receivable: number;
  payable: number;
  profit: number;
};

const matchOrder = (debt: StoredDebtRecord, order: Order) =>
  debt.orderId === order.id || debt.waybill === order.code;

const sumCostBreakdown = (breakdown?: StoredDebtRecord["costBreakdown"]) => {
  if (!breakdown) return 0;
  return Object.values(breakdown).reduce<number>(
    (sum, val) => sum + getCostBreakdownEntryAmount(val),
    0,
  );
};

export const inferDebtRecordType = (
  item: StoredDebtRecord,
): "receivable" | "payable" | "cost" | null => {
  if (item.recordType) return item.recordType;
  if (item.kind === "Phải thu") return "receivable";
  if (item.kind === "Cập nhật chi phí") return "cost";
  if (item.kind === "Phải trả") {
    if (item.paymentStatus && !item.costBreakdown) return "payable";
    return item.costBreakdown ? "cost" : null;
  }
  if (item.costBreakdown) return "cost";
  return null;
};

export function ensureDebtId(debt: Partial<StoredDebtRecord>, index = 0): string {
  if (debt.id) return debt.id;
  const base = debt.orderId ?? debt.waybill ?? "debt";
  const kind = debt.recordType ?? debt.kind ?? "record";
  return `${base}-${kind}-${index}`;
}

const normalizeDebt = (debt: Partial<StoredDebtRecord>, index: number): StoredDebtRecord | null => {
  if (!debt.orderId && !debt.waybill) return null;
  return {
    ...debt,
    id: ensureDebtId(debt, index),
    orderId: debt.orderId,
    waybill: debt.waybill,
    amount: debt.amount,
    recordType: debt.recordType,
    kind: debt.kind,
    paymentStatus: debt.paymentStatus,
    costBreakdown: debt.costBreakdown,
  } as StoredDebtRecord;
};

const normalizeDebts = (items: Partial<StoredDebtRecord>[]): StoredDebtRecord[] =>
  items
    .map((item, index) => normalizeDebt(item, index))
    .filter((item): item is StoredDebtRecord => item !== null);

type DebtRow = Database["public"]["Tables"]["tms_debts"]["Row"];

const debtStorage = createSyncStorage<StoredDebtRecord, "tms_debts">({
  localKey: "viet_thao_debts",
  migratedKey: "viet_thao_debts_supabase_migrated",
  table: "tms_debts",
  demoData: [],
  normalizeLocal: (items) => normalizeDebts(items),
  fromRow: (row: DebtRow) => {
    const data = (row.data ?? {}) as Partial<StoredDebtRecord>;
    return normalizeDebt(
      {
        ...data,
        id: row.id,
        orderId: row.order_id ?? data.orderId,
        waybill: row.waybill ?? data.waybill,
      },
      0,
    )!;
  },
  toRow: (debt) => ({
    id: debt.id,
    order_id: debt.orderId ?? null,
    waybill: debt.waybill ?? null,
    data: debt as unknown as Database["public"]["Tables"]["tms_debts"]["Insert"]["data"],
    updated_at_ts: new Date().toISOString(),
  }),
});

export const getLocalDebts = debtStorage.getLocal;
export const loadAllDebts = debtStorage.loadAll;
export const persistDebtsList = debtStorage.persistList;

/** @deprecated use getLocalDebts */
export function getStoredDebts(): StoredDebtRecord[] {
  return getLocalDebts();
}

export function getStoredOrders(): Order[] {
  return getLocalOrders();
}

export { loadAllOrders };

export function getReceivableAmount(order: Order): number {
  return order.fee;
}

export function getPayableAmount(order: Order, debts: StoredDebtRecord[]): number {
  const costDebt = debts.find(
    (debt) => inferDebtRecordType(debt) === "cost" && matchOrder(debt, order),
  );
  if (!costDebt) return 0;
  if (typeof costDebt.amount === "number") return costDebt.amount;
  return sumCostBreakdown(costDebt.costBreakdown);
}

export function buildEbtRows(orders: Order[], debts: StoredDebtRecord[]): EbtRow[] {
  return orders.map((order) => {
    const receivable = getReceivableAmount(order);
    const payable = getPayableAmount(order, debts);
    return {
      orderId: order.id,
      orderCode: order.code,
      customer: order.client,
      receivable,
      payable,
      profit: receivable - payable,
    };
  });
}
