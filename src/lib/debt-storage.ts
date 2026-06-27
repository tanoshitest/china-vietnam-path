import { orders as mockOrders, type Order } from "./mock-data";

export type StoredDebtRecord = {
  orderId?: string;
  waybill?: string;
  amount?: number;
  recordType?: "receivable" | "payable" | "cost";
  kind?: string;
  paymentStatus?: string;
  costBreakdown?: Record<string, number | { amount?: number; partyId?: string }>;
};

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
  return Object.values(breakdown).reduce((sum, val) => {
    if (typeof val === "number") return sum + val;
    if (val && typeof val === "object") return sum + (val.amount ?? 0);
    return sum;
  }, 0);
};

export const inferDebtRecordType = (
  item: StoredDebtRecord
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

import { getLocalOrders } from "@/lib/order-storage";

export function getStoredOrders(): Order[] {
  return getLocalOrders();
}

export function getStoredDebts(): StoredDebtRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("viet_thao_debts");
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as StoredDebtRecord[];
    return parsed.filter((item) => item.orderId || item.waybill);
  } catch {
    return [];
  }
}

/** Số phải thu — đồng bộ từ trang Công nợ phải thu khách hàng (thành tiền đơn). */
export function getReceivableAmount(order: Order): number {
  return order.fee;
}

/** Số phải trả — tổng chi phí đã nhập tại Cập nhật chi phí theo mã đơn. */
export function getPayableAmount(order: Order, debts: StoredDebtRecord[]): number {
  const costDebt = debts.find(
    (debt) => inferDebtRecordType(debt) === "cost" && matchOrder(debt, order)
  );
  if (!costDebt) return 0;
  return costDebt.amount ?? sumCostBreakdown(costDebt.costBreakdown);
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
