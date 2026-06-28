import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clients, formatVND, orders as mockOrders, vendors, type Order } from "@/lib/mock-data";
import { getLocalOrders, loadAllOrders } from "@/lib/order-storage";
import {
  ensureDebtId,
  getLocalDebts,
  loadAllDebts,
  persistDebtsList,
  type StoredDebtRecord,
} from "@/lib/debt-storage";
import { useTmsPageLoader } from "@/lib/use-tms-page-loader";
import { loadAllCashflowVouchers, getLocalCashflowVouchers, type CashflowVoucher } from "@/lib/cashflow-storage";
import {
  computePaidByDebt,
  getDebtBalance,
  type DebtBalance,
} from "@/lib/debt-payment";
import { cn } from "@/lib/utils";
import { Filter, Search } from "lucide-react";

type CostLineKey =
  | "packingAndVerification"
  | "loading"
  | "preCarriage"
  | "customsExport"
  | "handlingCustomsImportTax"
  | "onCarriage"
  | "unloadingLobbyFee"
  | "localAreaDelivery"
  | "laborFeeForLoading"
  | "outOfLocalDelivery"
  | "expressExpense"
  | "salary"
  | "purchasing"
  | "generalExpense";

type CostLine = { amount: number; partyId: string };
type CostBreakdown = Record<CostLineKey, CostLine>;
type CostLineForm = { amount: string; partyId: string };
type CostBreakdownForm = Record<CostLineKey, CostLineForm>;

const COST_LINE_KEYS: CostLineKey[] = [
  "packingAndVerification",
  "loading",
  "preCarriage",
  "customsExport",
  "handlingCustomsImportTax",
  "onCarriage",
  "unloadingLobbyFee",
  "localAreaDelivery",
  "laborFeeForLoading",
  "outOfLocalDelivery",
  "expressExpense",
  "salary",
  "purchasing",
  "generalExpense",
];

const COST_GROUPS: {
  title: string;
  columnLabel: string;
  bg: string;
  fields: { key: CostLineKey; label: string }[];
}[] = [
  {
    title: "Chi phí tại đầu xuất (Charges at origin)",
    columnLabel: "Charges at origin",
    bg: "bg-sky-50",
    fields: [
      { key: "packingAndVerification", label: "Packing and verification" },
      { key: "loading", label: "Loading" },
      { key: "preCarriage", label: "Pre-carriage" },
      { key: "customsExport", label: "Customs Export" },
    ],
  },
  {
    title: "Chi phí tại điểm đến (Charges at destination)",
    columnLabel: "Charges at destination",
    bg: "bg-slate-100",
    fields: [
      { key: "handlingCustomsImportTax", label: "Handling & Customs import & Import Tax" },
      { key: "onCarriage", label: "On-carriage" },
      { key: "unloadingLobbyFee", label: "Unloading & Lobby Fee" },
    ],
  },
  {
    title: "Giao hàng chặng cuối (Last-mile delivery)",
    columnLabel: "Last-mile delivery",
    bg: "bg-emerald-50",
    fields: [
      { key: "localAreaDelivery", label: "Local Area delivery" },
      { key: "laborFeeForLoading", label: "Labor fee for loading" },
      { key: "outOfLocalDelivery", label: "Out of local delivery" },
      { key: "expressExpense", label: "Express Expense" },
    ],
  },
  {
    title: "Chi phí vận hành (Operation Expense)",
    columnLabel: "Operation Expense",
    bg: "bg-amber-50",
    fields: [
      { key: "salary", label: "Salary" },
      { key: "purchasing", label: "Purchasing" },
      { key: "generalExpense", label: "General Expense" },
    ],
  },
];

const emptyCostLineForm = (): CostLineForm => ({ amount: "", partyId: "" });

const emptyCostBreakdownForm = (): CostBreakdownForm =>
  Object.fromEntries(COST_LINE_KEYS.map((key) => [key, emptyCostLineForm()])) as CostBreakdownForm;

const parseCostInput = (value: string) => Number(value.replace(/[^\d]/g, "")) || 0;

const formatCostDisplay = (value: number) => (value > 0 ? value.toLocaleString("en-US") : "");

const breakdownFormToData = (form: CostBreakdownForm): CostBreakdown =>
  Object.fromEntries(
    COST_LINE_KEYS.map((key) => [
      key,
      { amount: parseCostInput(form[key].amount), partyId: form[key].partyId },
    ])
  ) as CostBreakdown;

const normalizeStoredBreakdown = (raw?: unknown): CostBreakdown | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const result = {} as CostBreakdown;
  for (const key of COST_LINE_KEYS) {
    const val = (raw as Record<string, unknown>)[key];
    if (typeof val === "number") {
      result[key] = { amount: val, partyId: "" };
    } else if (val && typeof val === "object") {
      const line = val as { amount?: number; partyId?: string };
      result[key] = { amount: line.amount ?? 0, partyId: line.partyId ?? "" };
    } else {
      result[key] = { amount: 0, partyId: "" };
    }
  }
  return result;
};

const breakdownDataToForm = (data?: CostBreakdown): CostBreakdownForm => {
  const empty = emptyCostBreakdownForm();
  if (!data) return empty;
  return Object.fromEntries(
    COST_LINE_KEYS.map((key) => [
      key,
      {
        amount: formatCostDisplay(data[key]?.amount ?? 0),
        partyId: data[key]?.partyId ?? "",
      },
    ])
  ) as CostBreakdownForm;
};

const sumBreakdownForm = (form: CostBreakdownForm) =>
  COST_LINE_KEYS.reduce((sum, key) => sum + parseCostInput(form[key].amount), 0);

const sumBreakdownData = (data?: CostBreakdown) =>
  data ? COST_LINE_KEYS.reduce((sum, key) => sum + (data[key]?.amount ?? 0), 0) : 0;

const sumGroupBreakdown = (data: CostBreakdown | undefined, group: (typeof COST_GROUPS)[number]) =>
  data ? group.fields.reduce((sum, field) => sum + (data[field.key]?.amount ?? 0), 0) : 0;

const findCostLineLabel = (key: CostLineKey) => {
  for (const group of COST_GROUPS) {
    const field = group.fields.find((f) => f.key === key);
    if (field) return field.label;
  }
  return key;
};

type DebtRecordType = "receivable" | "payable" | "cost";
type VendorPageKind = "Phải thu" | "Phải trả" | "Cập nhật chi phí";
type PaymentStatus = "Đã thanh toán" | "Chưa thanh toán";
type PayableStatus = "Chưa nhập" | "Đang xử lý" | "Quá hạn" | "Hoàn tất";

type DebtItem = {
  orderId: string;
  waybill: string;
  amount: number;
  recordType: DebtRecordType;
  kind?: VendorPageKind;
  status?: PayableStatus;
  paymentStatus?: PaymentStatus;
  costBreakdown?: CostBreakdown;
};

const VENDOR_PAGE_KINDS: VendorPageKind[] = ["Phải thu", "Phải trả", "Cập nhật chi phí"];
const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["Chưa thanh toán", "Đã thanh toán"];

const paymentStatusBadge = (status: PaymentStatus) =>
  status === "Đã thanh toán"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-700 border-amber-200";

const normalizePaymentStatus = (
  paymentStatus?: PaymentStatus,
  legacyStatus?: PayableStatus
): PaymentStatus => {
  if (paymentStatus === "Đã thanh toán" || paymentStatus === "Chưa thanh toán") return paymentStatus;
  if (legacyStatus === "Hoàn tất") return "Đã thanh toán";
  return "Chưa thanh toán";
};

const inferRecordType = (
  item: Partial<DebtItem> & { kind?: string; costBreakdown?: CostBreakdown }
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

const matchOrderDebt = (item: DebtItem, order: Order) =>
  item.orderId === order.id || item.waybill === order.code;

const findDebtByType = (debts: DebtItem[], order: Order, recordType: DebtRecordType) =>
  debts.find((d) => d.recordType === recordType && matchOrderDebt(d, order));

const parseDebtItems = (records: StoredDebtRecord[]): DebtItem[] =>
  records
    .filter((item) => item.orderId || item.waybill)
    .map((item) => {
      const recordType = inferRecordType(
        item as Partial<DebtItem> & { kind?: string; costBreakdown?: CostBreakdown },
      );
      const breakdown =
        recordType === "cost" ? normalizeStoredBreakdown(item.costBreakdown) : undefined;
      const amount =
        item.amount ?? (recordType === "cost" ? sumBreakdownData(breakdown) : item.amount ?? 0);

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
          kind: recordType === "receivable" ? ("Phải thu" as const) : ("Phải trả" as const),
          paymentStatus: normalizePaymentStatus(
            item.paymentStatus as PaymentStatus | undefined,
            (item as { status?: PayableStatus }).status,
          ),
        };
      }

      return {
        ...base,
        kind: "Cập nhật chi phí" as const,
        status: ((item as { status?: PayableStatus }).status ?? "Đang xử lý") as PayableStatus,
      };
    });

const getStoredOrders = (): Order[] => getLocalOrders();

const getStoredDebts = (): DebtItem[] => parseDebtItems(getLocalDebts());

const saveStoredDebts = (items: DebtItem[]) => {
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

const getPartyName = (partyId: string) => {
  if (!partyId) return "—";
  return (
    vendors.find((vendor) => vendor.id === partyId)?.name ??
    clients.find((client) => client.id === partyId)?.name ??
    partyId
  );
};

const getBreakdownSuppliersSummary = (data: CostBreakdown | undefined) => {
  if (!data) return "—";
  const ids = new Set<string>();
  for (const key of COST_LINE_KEYS) {
    const line = data[key];
    if (line?.partyId && line.amount > 0) ids.add(line.partyId);
  }
  if (ids.size === 0) return "—";
  return [...ids].map((id) => getPartyName(id)).join(", ");
};

type OrderDebtRow = {
  order: Order;
  debt?: DebtItem;
  costDebt?: DebtItem;
};

export const Route = createFileRoute("/vendors")({
  validateSearch: (search: Record<string, unknown>) => {
    const kind = search.kind;
    return {
      kind: VENDOR_PAGE_KINDS.includes(kind as VendorPageKind) ? (kind as VendorPageKind) : undefined,
    };
  },
  component: DebtManagementPage,
  head: () => ({ meta: [{ title: "Quản lý công nợ — Quocviet JR" }] }),
});

function DebtManagementPage() {
  const { kind } = Route.useSearch();
  const pageKind: VendorPageKind = kind ?? "Cập nhật chi phí";

  const isCostUpdate = pageKind === "Cập nhật chi phí";
  const isReceivable = pageKind === "Phải thu";
  const isPayableDebt = pageKind === "Phải trả";
  const isPaymentPage = isReceivable || isPayableDebt;
  const listRecordType: DebtRecordType = isCostUpdate
    ? "cost"
    : isReceivable
      ? "receivable"
      : "payable";

  const [orders, setOrders] = useState<Order[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [vouchers, setVouchers] = useState<CashflowVoucher[]>([]);
  const [open, setOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [q, setQ] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [form, setForm] = useState<CostBreakdownForm>(emptyCostBreakdownForm());

  const totalCost = useMemo(() => sumBreakdownForm(form), [form]);

  const hydrateFromLocal = useCallback(() => {
    setOrders(getLocalOrders());
    setDebts(parseDebtItems(getLocalDebts()));
    setVouchers(getLocalCashflowVouchers());
  }, []);

  const syncFromRemote = useCallback(() => {
    return Promise.all([loadAllOrders(), loadAllDebts(), loadAllCashflowVouchers()]).then(
      ([nextOrders, nextDebts, nextVouchers]) => {
        setOrders(nextOrders);
        setDebts(parseDebtItems(nextDebts));
        setVouchers(nextVouchers);
      },
    );
  }, []);

  useTmsPageLoader(hydrateFromLocal, syncFromRemote);

  const rows: OrderDebtRow[] = useMemo(
    () =>
      orders.map((order) => {
        const debt = findDebtByType(debts, order, listRecordType);
        const costDebt = findDebtByType(debts, order, "cost");
        return { order, debt, costDebt };
      }),
    [orders, debts, listRecordType]
  );

  const paidMap = useMemo(() => computePaidByDebt(vouchers), [vouchers]);

  const getOrderBalance = useCallback(
    (order: Order, recordType: "receivable" | "payable"): DebtBalance | null =>
      getDebtBalance(order, recordType, debts, paidMap, vouchers),
    [debts, paidMap, vouchers],
  );


  const filteredRows = useMemo(
    () =>
      rows.filter(({ order, costDebt }) => {
        if (isPaymentPage) {
          const recordType = isReceivable ? "receivable" : "payable";
          const balance = getOrderBalance(order, recordType);
          if (!balance || balance.originalAmount <= 0) return false;
          const paymentStatus = balance.paymentStatus;
          if (paymentStatusFilter !== "all" && paymentStatus !== paymentStatusFilter) return false;
        }

        const needle = q.trim().toLowerCase();
        if (!needle) return true;

        if (isCostUpdate) {
          const supplierSummary = costDebt ? getBreakdownSuppliersSummary(costDebt.costBreakdown) : "";
          return (
            order.code.toLowerCase().includes(needle) ||
            order.client.toLowerCase().includes(needle) ||
            supplierSummary.toLowerCase().includes(needle)
          );
        }

        if (isPayableDebt) {
          const supplierSummary = costDebt ? getBreakdownSuppliersSummary(costDebt.costBreakdown) : "";
          return (
            order.code.toLowerCase().includes(needle) ||
            order.client.toLowerCase().includes(needle) ||
            supplierSummary.toLowerCase().includes(needle)
          );
        }

        return (
          order.code.toLowerCase().includes(needle) || order.client.toLowerCase().includes(needle)
        );
      }),
    [rows, q, isCostUpdate, isPayableDebt, isPaymentPage, paymentStatusFilter, getOrderBalance, isReceivable]
  );

  const updateBreakdownAmount = (key: CostLineKey, raw: string) => {
    const numeric = raw.replace(/[^\d]/g, "");
    const display = numeric ? Number(numeric).toLocaleString("en-US") : "";
    setForm((current) => ({
      ...current,
      [key]: { ...current[key], amount: display },
    }));
  };

  const updateBreakdownParty = (key: CostLineKey, partyId: string) => {
    setForm((current) => ({
      ...current,
      [key]: { ...current[key], partyId },
    }));
  };

  const openOrderModal = (order: Order) => {
    if (!isCostUpdate) return;
    const costDebt = findDebtByType(debts, order, "cost");
    setActiveOrder(order);
    setForm(breakdownDataToForm(costDebt?.costBreakdown));
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setActiveOrder(null);
    setForm(emptyCostBreakdownForm());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    if (totalCost <= 0) {
      toast.error("Vui lòng nhập ít nhất một khoản chi phí");
      return;
    }

    const linesWithAmount = COST_LINE_KEYS.filter((key) => parseCostInput(form[key].amount) > 0);
    const missingParty = linesWithAmount.find((key) => !form[key].partyId.trim());
    if (missingParty) {
      toast.error(`Vui lòng chọn nhà cung cấp cho hạng mục "${findCostLineLabel(missingParty)}"`);
      return;
    }

    const breakdown = breakdownFormToData(form);
    const existing = findDebtByType(debts, activeOrder, "cost");

    const record: DebtItem = {
      orderId: activeOrder.id,
      waybill: activeOrder.code,
      amount: totalCost,
      recordType: "cost",
      kind: "Cập nhật chi phí",
      status: existing?.status && existing.status !== "Chưa nhập" ? existing.status : "Đang xử lý",
      costBreakdown: breakdown,
    };

    const updated = existing
      ? debts.map((d) => (d.recordType === "cost" && matchOrderDebt(d, activeOrder) ? record : d))
      : [...debts, record];

    setDebts(updated);
    saveStoredDebts(updated);
    toast.success(`Đã lưu chi phí cho vận đơn ${activeOrder.code}`);
    closeModal();
  };

  return (
    <AppLayout>
      <div className="space-y-5 text-left">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isCostUpdate
              ? "Cập nhật chi phí"
              : isReceivable
                ? "Công nợ phải thu khách hàng"
                : "Công nợ phải trả đối tác"}
          </h2>
          <p className="text-sm text-slate-500">
            {isCostUpdate
              ? "Danh sách vận đơn đồng bộ từ quản lý đơn hàng — bấm vào từng dòng để chọn nhà cung cấp và nhập chi phí."
              : isReceivable
                ? "Công nợ phải thu theo vận đơn — cập nhật qua phiếu thu tại Quản lý thu chi."
                : "Công nợ phải trả theo vận đơn — cập nhật qua phiếu chi tại Quản lý thu chi."}
          </p>
        </div>

        {isCostUpdate && (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && closeModal()}>
          <DialogContent className="!flex max-h-[92vh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden border-slate-200 p-0 sm:rounded-xl">
            <DialogHeader className="border-b px-6 pb-3 pt-6">
              <DialogTitle className="text-base font-bold text-slate-900">Nhập chi phí công nợ</DialogTitle>
              <DialogDescription>
                Chọn nhà cung cấp và nhập số tiền cho từng hạng mục — tổng chi phí tự động cập nhật.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col text-left">
              <div className="space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Vận đơn</Label>
                    <Input
                      value={activeOrder?.code ?? ""}
                      readOnly
                      className="h-9 bg-slate-50 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Khách hàng</Label>
                    <Input
                      value={activeOrder?.client ?? ""}
                      readOnly
                      className="h-9 bg-slate-50 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Bảng phân rã chi phí (Cost Breakdown)
                  </Label>
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <table className="w-full border-collapse text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-semibold">Hạng mục</th>
                          <th className="w-[200px] px-3 py-2.5 text-left font-semibold">Nhà cung cấp</th>
                          <th className="w-[140px] px-3 py-2.5 text-right font-semibold">Số tiền (VND)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COST_GROUPS.map((group) => (
                          <Fragment key={group.title}>
                            <tr className={cn(group.bg, "border-y border-slate-200")}>
                              <td colSpan={3} className="px-3 py-2 font-bold text-slate-800">
                                {group.title}
                              </td>
                            </tr>
                            {group.fields.map((field) => (
                              <tr key={field.key} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="px-3 py-2 pl-5 text-slate-700">{field.label}</td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={form[field.key].partyId}
                                    onValueChange={(value) => updateBreakdownParty(field.key, value)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Chọn NCC" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {vendors.map((item) => (
                                        <SelectItem key={item.id} value={item.id} className="text-xs">
                                          {item.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={form[field.key].amount}
                                    onChange={(e) => updateBreakdownAmount(field.key, e.target.value)}
                                    className="h-8 border-slate-200 text-right text-xs tabular-nums"
                                  />
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                        <tr className="border-t-2 border-primary/20 bg-primary/5">
                          <td colSpan={2} className="px-3 py-3 text-sm font-bold text-slate-900">
                            Tổng chi phí (Total Cost)
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-primary">
                            {formatVND(totalCost)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 border-t bg-white px-6 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  className="h-8.5 text-xs font-semibold"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8.5 bg-primary text-xs font-semibold text-white hover:bg-primary/95"
                >
                  Lưu chi phí
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}

        <Card className="p-4">
          <div className={cn("flex flex-col gap-3", isPaymentPage && "md:flex-row")}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Tìm theo mã vận đơn hoặc khách hàng..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>
            {isPaymentPage && (
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="h-10 md:w-[220px]">
                  <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="Trạng thái thanh toán" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
          <div className="overflow-x-auto">
          <div className="max-h-[440px] overflow-y-auto">
            {isCostUpdate ? (
            <table className="w-full min-w-[960px] text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Vận đơn</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Khách hàng</th>
                  {COST_GROUPS.map((group) => (
                    <th key={group.columnLabel} className="whitespace-nowrap px-4 py-3 text-right">
                      {group.columnLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(({ order, costDebt }) => (
                  <tr
                    key={order.id}
                    className="cursor-pointer transition-colors hover:bg-blue-50/40"
                    onClick={() => openOrderModal(order)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-primary">
                      {order.code}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{order.client}</td>
                    {COST_GROUPS.map((group) => {
                      const groupTotal = sumGroupBreakdown(costDebt?.costBreakdown, group);
                      return (
                        <td
                          key={group.columnLabel}
                          className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900"
                        >
                          {groupTotal > 0 ? formatVND(groupTotal) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                      {orders.length === 0
                        ? "Chưa có vận đơn. Tạo đơn hàng tại Quản lý Vận đơn để đồng bộ sang đây."
                        : "Không có dữ liệu phù hợp."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            ) : (
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Vận đơn</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Khách hàng</th>
                  {isPayableDebt && (
                    <th className="whitespace-nowrap px-4 py-3 text-left">Đối tác</th>
                  )}
                  <th className="whitespace-nowrap px-4 py-3 text-right">
                    {isReceivable ? "Phải thu" : "Phải trả"}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">
                    {isReceivable ? "Đã thu" : "Đã chi"}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Còn lại</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(({ order, costDebt }) => {
                  const recordType = isReceivable ? "receivable" : "payable";
                  const balance = getOrderBalance(order, recordType);
                  if (!balance || balance.originalAmount <= 0) return null;
                  const paymentStatus = balance.paymentStatus;
                  return (
                    <tr key={order.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-primary">
                        {order.code}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{order.client}</td>
                      {isPayableDebt && (
                        <td
                          className="max-w-[200px] truncate px-4 py-3 text-xs font-semibold text-slate-600"
                          title={getBreakdownSuppliersSummary(costDebt?.costBreakdown)}
                        >
                          {getBreakdownSuppliersSummary(costDebt?.costBreakdown)}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                        {formatVND(balance.originalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-emerald-700">
                        {balance.paidAmount > 0 ? formatVND(balance.paidAmount) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                        {formatVND(balance.remainingAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                            paymentStatusBadge(paymentStatus),
                          )}
                        >
                          {paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={isPayableDebt ? 7 : 6} className="px-4 py-12 text-center text-sm text-slate-400">
                      {orders.length === 0
                        ? "Chưa có vận đơn. Tạo đơn hàng tại Quản lý Vận đơn để đồng bộ sang đây."
                        : "Không có dữ liệu phù hợp."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
