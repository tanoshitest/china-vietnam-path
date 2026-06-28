import { clients, vendors, type Order } from "@/lib/mock-data";
import type { CashflowVoucher } from "@/lib/cashflow-storage";
import {
  ensureDebtId,
  type StoredDebtRecord,
} from "@/lib/debt-storage";
import { persistDebtsList } from "@/lib/debt-storage";

export type PaymentStatus = "Đã thanh toán" | "Chưa thanh toán";
export type PayableStatus = "Chưa nhập" | "Đang xử lý" | "Quá hạn" | "Hoàn tất";
export type DebtRecordType = "receivable" | "payable" | "cost";

export type CostBreakdown = Record<
  string,
  { amount: number; partyId: string }
>;

export type DebtItem = {
  orderId: string;
  waybill: string;
  amount: number;
  recordType: DebtRecordType;
  kind?: string;
  status?: PayableStatus;
  paymentStatus?: PaymentStatus;
  costBreakdown?: CostBreakdown;
};

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["Chưa thanh toán", "Đã thanh toán"];

export const paymentStatusBadge = (status: PaymentStatus) =>
  status === "Đã thanh toán"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-700 border-amber-200";

export const recordTypeBadge = (type: "receivable" | "payable") =>
  type === "receivable"
    ? "bg-sky-100 text-sky-700 border-sky-200"
    : "bg-violet-100 text-violet-700 border-violet-200";

const normalizePaymentStatus = (
  paymentStatus?: PaymentStatus,
  legacyStatus?: PayableStatus,
): PaymentStatus => {
  if (paymentStatus === "Đã thanh toán" || paymentStatus === "Chưa thanh toán") return paymentStatus;
  if (legacyStatus === "Hoàn tất") return "Đã thanh toán";
  return "Chưa thanh toán";
};

const normalizeStoredBreakdown = (raw?: unknown): CostBreakdown | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const result: CostBreakdown = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === "number") {
      result[key] = { amount: val, partyId: "" };
    } else if (val && typeof val === "object") {
      const line = val as { amount?: number; partyId?: string };
      result[key] = { amount: line.amount ?? 0, partyId: line.partyId ?? "" };
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export const inferRecordType = (
  item: Partial<DebtItem> & { kind?: string; costBreakdown?: CostBreakdown },
): DebtRecordType => {
  if (item.recordType) return item.recordType;
  if (item.kind === "Phải thu") return "receivable";
  if (item.kind === "Cập nhật chi phí") return "cost";
  if (item.kind === "Phải trả") {
    if (item.paymentStatus && !item.costBreakdown) return "payable";
    return "cost";
  }
  if (item.costBreakdown) return "cost";
  if (item.paymentStatus) return item.kind === "Phải thu" ? "receivable" : "payable";
  return "cost";
};

export const matchOrderDebt = (item: DebtItem, order: Order) =>
  item.orderId === order.id || item.waybill === order.code;

export const findDebtByType = (debts: DebtItem[], order: Order, recordType: DebtRecordType) =>
  debts.find((d) => d.recordType === recordType && matchOrderDebt(d, order));

export const sumBreakdownData = (data?: CostBreakdown) =>
  data
    ? Object.values(data).reduce((sum, line) => sum + (line?.amount ?? 0), 0)
    : 0;

export const getPayableAmount = (order: Order, costDebt?: DebtItem) => {
  const total = costDebt ? sumBreakdownData(costDebt.costBreakdown) : 0;
  return total > 0 ? total : costDebt?.amount ?? 0;
};

export const parseDebtItems = (records: StoredDebtRecord[]): DebtItem[] =>
  records
    .filter((item) => item.orderId || item.waybill)
    .map((item) => {
      const recordType = inferRecordType(
        item as Partial<DebtItem> & { kind?: string; costBreakdown?: CostBreakdown },
      );
      const breakdown =
        recordType === "cost" ? normalizeStoredBreakdown(item.costBreakdown) : undefined;
      const amount =
        item.amount ??
        (recordType === "cost"
          ? sumBreakdownData(breakdown)
          : typeof item.amount === "number"
            ? item.amount
            : 0);

      const base = {
        orderId: item.orderId ?? "",
        waybill: item.waybill ?? "",
        amount,
        recordType,
        costBreakdown: breakdown,
      };

      if (recordType === "receivable" || recordType === "payable") {
        return {
          ...base,
          kind: recordType === "receivable" ? "Phải thu" : "Phải trả",
          paymentStatus: normalizePaymentStatus(
            item.paymentStatus as PaymentStatus | undefined,
            (item as { status?: PayableStatus }).status,
          ),
        };
      }

      return {
        ...base,
        kind: "Cập nhật chi phí",
        status: ((item as { status?: PayableStatus }).status ?? "Đang xử lý") as PayableStatus,
      };
    });

export const saveStoredDebts = (items: DebtItem[]) => {
  const stored: StoredDebtRecord[] = items.map((item, index) => ({
    id: ensureDebtId(
      { orderId: item.orderId, waybill: item.waybill, recordType: item.recordType },
      index,
    ),
    orderId: item.orderId,
    waybill: item.waybill,
    amount: item.amount,
    recordType: item.recordType,
    kind: item.kind,
    paymentStatus: item.paymentStatus,
    costBreakdown: item.costBreakdown,
    ...(item.status ? { status: item.status } : {}),
  }));
  void persistDebtsList(stored);
};

export const getPartyName = (partyId: string) => {
  if (!partyId) return "—";
  return (
    vendors.find((vendor) => vendor.id === partyId)?.name ??
    clients.find((client) => client.id === partyId)?.name ??
    partyId
  );
};

export const getBreakdownSuppliersSummary = (data: CostBreakdown | undefined) => {
  if (!data) return "—";
  const ids = new Set<string>();
  for (const line of Object.values(data)) {
    if (line?.partyId && line.amount > 0) ids.add(line.partyId);
  }
  if (ids.size === 0) return "—";
  return [...ids].map((id) => getPartyName(id)).join(", ");
};

export type DebtBalance = {
  orderId: string;
  waybill: string;
  order: Order;
  recordType: "receivable" | "payable";
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  counterparty: string;
};

export const getDebtKey = (orderId: string, recordType: "receivable" | "payable") =>
  `${orderId}-${recordType}`;

export const getWaybillDebtKey = (waybill: string, recordType: "receivable" | "payable") =>
  `${waybill}::${recordType}`;

export function getPaidAmountForOrder(
  order: Order,
  recordType: "receivable" | "payable",
  vouchers: CashflowVoucher[],
): number {
  let paid = 0;
  for (const voucher of vouchers) {
    for (const line of voucher.allocations) {
      if (line.recordType !== recordType) continue;
      if (line.orderId === order.id || line.waybill === order.code) {
        paid += line.amount;
      }
    }
  }
  return paid;
}

export function computePaidByDebt(vouchers: CashflowVoucher[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const voucher of vouchers) {
    for (const allocation of voucher.allocations) {
      const idKey = getDebtKey(allocation.orderId, allocation.recordType);
      map.set(idKey, (map.get(idKey) ?? 0) + allocation.amount);
      if (allocation.waybill) {
        const waybillKey = getWaybillDebtKey(allocation.waybill, allocation.recordType);
        map.set(waybillKey, (map.get(waybillKey) ?? 0) + allocation.amount);
      }
    }
  }
  return map;
}

export function getDebtBalance(
  order: Order,
  recordType: "receivable" | "payable",
  debts: DebtItem[],
  paidMap: Map<string, number>,
  vouchers: CashflowVoucher[] = [],
): DebtBalance | null {
  const costDebt = findDebtByType(debts, order, "cost");
  const originalAmount =
    recordType === "receivable" ? order.fee : getPayableAmount(order, costDebt);
  if (originalAmount <= 0) return null;

  const paidFromVouchers = vouchers.length > 0 ? getPaidAmountForOrder(order, recordType, vouchers) : 0;
  const paidFromMap = Math.max(
    paidMap.get(getDebtKey(order.id, recordType)) ?? 0,
    paidMap.get(getWaybillDebtKey(order.code, recordType)) ?? 0,
  );
  const paidAmount = Math.max(paidFromVouchers, paidFromMap);
  const remainingAmount = Math.max(0, originalAmount - paidAmount);

  return {
    orderId: order.id,
    waybill: order.code,
    order,
    recordType,
    originalAmount,
    paidAmount,
    remainingAmount,
    paymentStatus: remainingAmount <= 0 ? "Đã thanh toán" : "Chưa thanh toán",
    counterparty:
      recordType === "receivable"
        ? order.client
        : getBreakdownSuppliersSummary(costDebt?.costBreakdown),
  };
}

export function buildDebtBalances(
  orders: Order[],
  debts: DebtItem[],
  vouchers: CashflowVoucher[],
): DebtBalance[] {
  const paidMap = computePaidByDebt(vouchers);
  const rows: DebtBalance[] = [];

  for (const order of orders) {
    const receivable = getDebtBalance(order, "receivable", debts, paidMap, vouchers);
    const payable = getDebtBalance(order, "payable", debts, paidMap, vouchers);
    if (receivable) rows.push(receivable);
    if (payable) rows.push(payable);
  }

  return rows;
}

export function buildOpenDebtsForVoucher(
  orders: Order[],
  debts: DebtItem[],
  vouchers: CashflowVoucher[],
  recordType: "receivable" | "payable",
): DebtBalance[] {
  return buildDebtBalances(orders, debts, vouchers).filter(
    (row) => row.recordType === recordType && row.remainingAmount > 0,
  );
}

export function buildAllOpenDebts(
  orders: Order[],
  debts: DebtItem[],
  vouchers: CashflowVoucher[],
): DebtBalance[] {
  return [
    ...buildOpenDebtsForVoucher(orders, debts, vouchers, "receivable"),
    ...buildOpenDebtsForVoucher(orders, debts, vouchers, "payable"),
  ];
}

export function syncDebtsFromVouchers(
  debts: DebtItem[],
  orders: Order[],
  vouchers: CashflowVoucher[],
): DebtItem[] {
  const paidMap = computePaidByDebt(vouchers);
  let updated = [...debts];

  for (const order of orders) {
    for (const recordType of ["receivable", "payable"] as const) {
      const balance = getDebtBalance(order, recordType, debts, paidMap, vouchers);
      if (!balance || balance.originalAmount <= 0) continue;
      updated = updatePaymentStatus(updated, order, recordType, balance.paymentStatus);
    }
  }

  return updated;
}

export function updatePaymentStatus(
  debts: DebtItem[],
  order: Order,
  recordType: "receivable" | "payable",
  paymentStatus: PaymentStatus,
): DebtItem[] {
  const existing = findDebtByType(debts, order, recordType);
  const costDebt = findDebtByType(debts, order, "cost");
  const amount = recordType === "receivable" ? order.fee : getPayableAmount(order, costDebt);

  const record: DebtItem = {
    orderId: order.id,
    waybill: order.code,
    amount,
    recordType,
    kind: recordType === "receivable" ? "Phải thu" : "Phải trả",
    paymentStatus,
  };

  return existing
    ? debts.map((d) => (d.recordType === recordType && matchOrderDebt(d, order) ? record : d))
    : [...debts, record];
}
