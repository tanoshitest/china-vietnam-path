import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatVND, type Order } from "@/lib/mock-data";
import { loadAllOrders, getLocalOrders } from "@/lib/order-storage";
import { getLocalDebts, loadAllDebts } from "@/lib/debt-storage";
import {
  appendCashflowVoucher,
  generateVoucherCode,
  getLocalCashflowVouchers,
  loadAllCashflowVouchers,
  removeCashflowVoucher,
  type CashflowAllocation,
  type CashflowVoucher,
  type CashflowVoucherType,
} from "@/lib/cashflow-storage";
import {
  buildAllOpenDebts,
  computePaidByDebt,
  getDebtBalance,
  getDebtKey,
  parseDebtItems,
  recordTypeBadge,
  saveStoredDebts,
  syncDebtsFromVouchers,
  type DebtBalance,
  type DebtItem,
} from "@/lib/debt-payment";
import { notifyTmsDataUpdated } from "@/lib/tms-sync";
import { useTmsPageLoader } from "@/lib/use-tms-page-loader";
import { cn } from "@/lib/utils";
import { Filter, Plus, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/cashflow")({
  component: CashflowPage,
  head: () => ({ meta: [{ title: "Quản lý thu chi — Quocviet JR" }] }),
});

const parseAmountInput = (value: string) => Number(value.replace(/[^\d]/g, "")) || 0;

function CashflowPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [vouchers, setVouchers] = useState<CashflowVoucher[]>([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<CashflowVoucher | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDebt, setSelectedDebt] = useState<DebtBalance | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const voucherSource = useMemo(() => {
    const byId = new Map<string, CashflowVoucher>();
    for (const voucher of vouchers) byId.set(voucher.id, voucher);
    if (typeof window !== "undefined") {
      for (const voucher of getLocalCashflowVouchers()) byId.set(voucher.id, voucher);
    }
    return [...byId.values()];
  }, [vouchers, createOpen]);

  const filteredVouchers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...voucherSource]
      .filter((voucher) => {
        if (typeFilter !== "all" && voucher.type !== typeFilter) return false;
        if (!needle) return true;
        return (
          voucher.code.toLowerCase().includes(needle) ||
          (voucher.note ?? "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [voucherSource, q, typeFilter]);

  const allOpenDebts = useMemo(
    () => buildAllOpenDebts(orders, debts, voucherSource),
    [orders, debts, voucherSource],
  );

  const searchResults = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return [];
    return allOpenDebts.filter(
      (debt) =>
        debt.waybill.toLowerCase().includes(needle) ||
        debt.order.client.toLowerCase().includes(needle) ||
        debt.counterparty.toLowerCase().includes(needle),
    );
  }, [allOpenDebts, searchQuery]);

  const activeDebt = useMemo(() => {
    if (!selectedDebt) return null;
    const key = getDebtKey(selectedDebt.orderId, selectedDebt.recordType);
    return (
      allOpenDebts.find((debt) => getDebtKey(debt.orderId, debt.recordType) === key) ?? selectedDebt
    );
  }, [selectedDebt, allOpenDebts]);

  const openCreate = () => {
    setVouchers(getLocalCashflowVouchers());
    hydrateFromLocal();
    void syncFromRemote();
    setSearchQuery("");
    setSelectedDebt(null);
    setAmountInput("");
    setNote("");
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setSearchQuery("");
    setSelectedDebt(null);
    setAmountInput("");
    setNote("");
  };

  const selectDebt = (debt: DebtBalance) => {
    setSelectedDebt(debt);
    setAmountInput("");
  };

  const clearSelection = () => {
    setSelectedDebt(null);
    setAmountInput("");
  };

  const paymentAmount = parseAmountInput(amountInput);
  const afterPaymentRemaining = activeDebt
    ? Math.max(0, activeDebt.remainingAmount - paymentAmount)
    : 0;

  const handleCreateVoucher = async () => {
    if (!selectedDebt || !activeDebt) {
      toast.error("Vui lòng chọn vận đơn cần cập nhật thu chi");
      return;
    }

    const amount = parseAmountInput(amountInput);
    if (amount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    const localVouchers = getLocalCashflowVouchers();
    const paidMap = computePaidByDebt(localVouchers);
    const currentBalance = getDebtBalance(
      activeDebt.order,
      activeDebt.recordType,
      debts,
      paidMap,
      localVouchers,
    );

    if (!currentBalance || currentBalance.remainingAmount <= 0) {
      toast.error("Công nợ vận đơn này đã được thanh toán hết");
      return;
    }

    if (amount > currentBalance.remainingAmount) {
      toast.error(`Số tiền vượt công nợ còn lại (${formatVND(currentBalance.remainingAmount)})`);
      return;
    }

    setSaving(true);
    try {
      const createType: CashflowVoucherType =
        currentBalance.recordType === "receivable" ? "receipt" : "payment";

      const debtBefore = currentBalance.remainingAmount;
      const debtAfter = Math.max(0, debtBefore - amount);

      const allocations: CashflowAllocation[] = [
        {
          orderId: currentBalance.orderId,
          waybill: currentBalance.waybill,
          recordType: currentBalance.recordType,
          amount,
          counterparty: currentBalance.counterparty,
          debtBefore,
          debtAfter,
        },
      ];

      const voucher: CashflowVoucher = {
        id: crypto.randomUUID(),
        code: generateVoucherCode(createType, localVouchers),
        type: createType,
        date: new Date().toISOString().slice(0, 10),
        note: note.trim() || undefined,
        totalAmount: amount,
        allocations,
        createdAt: new Date().toISOString(),
      };

      const nextVouchers = await appendCashflowVoucher(voucher);
      const nextDebts = syncDebtsFromVouchers(debts, orders, nextVouchers);

      setVouchers(nextVouchers);
      setDebts(nextDebts);
      saveStoredDebts(nextDebts);
      notifyTmsDataUpdated();

      toast.success(
        createType === "receipt"
          ? `Đã tạo phiếu thu ${voucher.code} — còn lại ${formatVND(debtAfter)}`
          : `Đã tạo phiếu chi ${voucher.code} — còn lại ${formatVND(debtAfter)}`,
      );
      closeCreate();
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (voucher: CashflowVoucher) => {
    setActiveVoucher(voucher);
    setDetailOpen(true);
  };

  const handleDeleteVoucher = async (voucher: CashflowVoucher) => {
    const label = voucher.type === "receipt" ? "phiếu thu" : "phiếu chi";
    const confirmed = window.confirm(
      `Xoá ${label} ${voucher.code}?\nCông nợ phải thu/trả sẽ được tính lại theo các phiếu còn lại.`,
    );
    if (!confirmed) return;

    setDeletingId(voucher.id);
    try {
      const nextVouchers = await removeCashflowVoucher(voucher.id);
      const nextDebts = syncDebtsFromVouchers(debts, orders, nextVouchers);
      setVouchers(nextVouchers);
      setDebts(nextDebts);
      saveStoredDebts(nextDebts);
      if (activeVoucher?.id === voucher.id) {
        setDetailOpen(false);
        setActiveVoucher(null);
      }
      toast.success(`Đã xoá ${voucher.code}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 text-left">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Quản lý thu chi</h2>
            <p className="text-sm text-slate-500">
              Tạo phiếu, tìm vận đơn theo mã hoặc tên khách hàng/nhà cung cấp — nhập số tiền thu/chi để cập nhật công nợ.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Tạo phiếu
          </Button>
        </div>

        <Dialog open={createOpen} onOpenChange={(isOpen) => !isOpen && closeCreate()}>
          <DialogContent className="flex max-h-[92vh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden border-slate-200 p-0 sm:rounded-xl">
            <DialogHeader className="border-b px-6 pb-3 pt-6">
              <DialogTitle className="text-base font-bold text-slate-900">Tạo phiếu thu chi</DialogTitle>
              <DialogDescription>
                Tìm vận đơn, chọn khoản cần cập nhật và nhập số tiền thu hoặc chi.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {!selectedDebt && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    autoFocus
                    placeholder="Mã vận đơn, tên khách hàng hoặc nhà cung cấp..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setAmountInput("");
                    }}
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              )}

              {!selectedDebt && !searchQuery.trim() && (
                <p className="py-6 text-center text-sm text-slate-400">
                  Nhập mã vận đơn hoặc tên để hiện danh sách công nợ chưa thanh toán.
                </p>
              )}

              {!selectedDebt && searchQuery.trim() && searchResults.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">
                  Không tìm thấy vận đơn phù hợp hoặc công nợ đã thanh toán hết.
                </p>
              )}

              {!selectedDebt && searchResults.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="w-10 px-3 py-2.5" />
                        <th className="px-3 py-2.5 text-left">Loại</th>
                        <th className="px-3 py-2.5 text-left">Vận đơn</th>
                        <th className="px-3 py-2.5 text-left">Khách hàng / Đối tác</th>
                        <th className="px-3 py-2.5 text-right">Công nợ hiện tại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {searchResults.map((debt) => {
                        const key = getDebtKey(debt.orderId, debt.recordType);
                        return (
                          <tr
                            key={key}
                            className="cursor-pointer transition-colors hover:bg-slate-50/60"
                            onClick={() => selectDebt(debt)}
                          >
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={false}
                                onCheckedChange={(checked) => {
                                  if (checked) selectDebt(debt);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                                  recordTypeBadge(debt.recordType),
                                )}
                              >
                                {debt.recordType === "receivable" ? "Phải thu" : "Phải trả"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs font-bold text-primary">
                              {debt.waybill}
                            </td>
                            <td className="max-w-[220px] truncate px-3 py-2.5 font-semibold text-slate-800">
                              {debt.counterparty}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                              {formatVND(debt.remainingAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedDebt && (
                <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Vận đơn đã chọn:</span>
                      <span className="font-mono text-xs font-bold text-primary">{selectedDebt.waybill}</span>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                          recordTypeBadge(selectedDebt.recordType),
                        )}
                      >
                        {selectedDebt.recordType === "receivable" ? "Phiếu thu" : "Phiếu chi"}
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={clearSelection}>
                      Chọn lại
                    </Button>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-500">Khách hàng / Đối tác</p>
                      <p className="font-semibold text-slate-800">{selectedDebt.counterparty}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-500">Công nợ hiện tại</p>
                      <p className="font-bold tabular-nums text-slate-900">
                        {formatVND(activeDebt?.remainingAmount ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Số tiền thu/chi</Label>
                      <Input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={amountInput}
                        onChange={(e) => {
                          const numeric = e.target.value.replace(/[^\d]/g, "");
                          setAmountInput(numeric ? Number(numeric).toLocaleString("en-US") : "");
                        }}
                        className="h-9 text-right text-sm font-semibold tabular-nums"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Còn lại sau phiếu</Label>
                      <Input
                        readOnly
                        value={formatVND(afterPaymentRemaining)}
                        className={cn(
                          "h-9 bg-white text-right text-sm font-bold tabular-nums",
                          afterPaymentRemaining <= 0 && paymentAmount > 0
                            ? "text-emerald-700"
                            : "text-slate-900",
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Ghi chú</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nội dung phiếu (tuỳ chọn)"
                  className="min-h-[64px] text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 border-t bg-white px-6 py-3">
              <Button type="button" variant="outline" size="sm" onClick={closeCreate}>
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleCreateVoucher()}
                disabled={!activeDebt || saving}
              >
                {saving ? "Đang lưu..." : "Lưu phiếu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl border-slate-200 sm:rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {activeVoucher?.code}
              </DialogTitle>
              <DialogDescription>
                {activeVoucher?.type === "receipt" ? "Phiếu thu" : "Phiếu chi"} —{" "}
                {activeVoucher?.date}
              </DialogDescription>
            </DialogHeader>

            {activeVoucher && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">Tổng tiền</span>
                  <span className="text-base font-bold tabular-nums text-primary">
                    {formatVND(activeVoucher.totalAmount)}
                  </span>
                </div>
                {activeVoucher.note && (
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">Ghi chú:</span> {activeVoucher.note}
                  </p>
                )}
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Vận đơn</th>
                        <th className="px-3 py-2 text-left">Loại</th>
                        <th className="px-3 py-2 text-left">Đối tác</th>
                        <th className="px-3 py-2 text-right">Công nợ trước</th>
                        <th className="px-3 py-2 text-right">Thu/chi</th>
                        <th className="px-3 py-2 text-right">Còn lại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeVoucher.allocations.map((line) => (
                        <tr key={`${line.orderId}-${line.recordType}`}>
                          <td className="px-3 py-2 font-mono text-xs font-bold text-primary">
                            {line.waybill}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                                recordTypeBadge(line.recordType),
                              )}
                            >
                              {line.recordType === "receivable" ? "Phải thu" : "Phải trả"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{line.counterparty}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                            {formatVND(line.debtBefore)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">
                            {formatVND(line.amount)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700">
                            {formatVND(line.debtAfter)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Tìm theo mã phiếu hoặc ghi chú..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 md:w-[180px]">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Loại phiếu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="receipt">Phiếu thu</SelectItem>
                <SelectItem value="payment">Phiếu chi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
          <div className="overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Mã phiếu</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Loại</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Ngày</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Số tiền</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Vận đơn</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Còn lại</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Ghi chú</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVouchers.map((voucher) => (
                    <tr
                      key={voucher.id}
                      className="cursor-pointer transition-colors hover:bg-blue-50/40"
                      onClick={() => openDetail(voucher)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-primary">
                        {voucher.code}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                            voucher.type === "receipt"
                              ? "bg-sky-100 text-sky-700 border-sky-200"
                              : "bg-violet-100 text-violet-700 border-violet-200",
                          )}
                        >
                          {voucher.type === "receipt" ? "Phiếu thu" : "Phiếu chi"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{voucher.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                        {formatVND(voucher.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                        {voucher.allocations.map((line) => line.waybill).join(", ")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-700">
                        {voucher.allocations.length === 1
                          ? formatVND(voucher.allocations[0].debtAfter)
                          : "—"}
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-slate-500">
                        {voucher.note || "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-center">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={deletingId === voucher.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteVoucher(voucher);
                          }}
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                          title="Xoá phiếu"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredVouchers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                        Chưa có phiếu thu/chi. Bấm &quot;Tạo phiếu&quot; để bắt đầu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
