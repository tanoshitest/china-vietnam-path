import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clients, formatVND, vendors } from "@/lib/mock-data";
import { Plus, Trash2, Filter, Search, Calendar as CalendarIcon } from "lucide-react";

type DebtKind = "Phải thu" | "Phải trả";
type DebtStatus = "Đang xử lý" | "Quá hạn" | "Hoàn tất";

type DebtItem = {
  id: string;
  waybill: string;
  partyId: string;
  amount: number;
  dueDate: string;
  kind: DebtKind;
  status: DebtStatus;
};

const kindOptions: DebtKind[] = ["Phải thu", "Phải trả"];
const statusOptions: DebtStatus[] = ["Đang xử lý", "Quá hạn", "Hoàn tất"];

const demoDebts: DebtItem[] = [
  { id: "CN001", waybill: "CRTO-2511025-01", partyId: "KH001", amount: 150000000, dueDate: "2026-07-30", kind: "Phải thu", status: "Hoàn tất" },
  { id: "CN002", waybill: "CRTO-2511025-02", partyId: "KH001", amount: 36000000, dueDate: "2026-07-28", kind: "Phải thu", status: "Đang xử lý" },
  { id: "CN003", waybill: "CRTO-2511025-03", partyId: "KH002", amount: 120000000, dueDate: "2026-07-25", kind: "Phải thu", status: "Quá hạn" },
  { id: "CN004", waybill: "CRTO-2511025-04", partyId: "V07", amount: 22000000, dueDate: "2026-07-29", kind: "Phải trả", status: "Đang xử lý" },
  { id: "CN005", waybill: "CRTO-2511025-05", partyId: "KH001", amount: 100000000, dueDate: "2026-07-20", kind: "Phải thu", status: "Hoàn tất" },
  { id: "CN006", waybill: "CRTO-2511025-06", partyId: "V06", amount: 18000000, dueDate: "2026-07-27", kind: "Phải trả", status: "Đang xử lý" },
  { id: "CN007", waybill: "CRTO-2511025-07", partyId: "KH003", amount: 54000000, dueDate: "2026-07-31", kind: "Phải thu", status: "Đang xử lý" },
  { id: "CN008", waybill: "CRTO-2511025-08", partyId: "V08", amount: 7600000, dueDate: "2026-07-22", kind: "Phải trả", status: "Quá hạn" },
];

const getStoredDebts = () => {
  if (typeof window === "undefined") return demoDebts;
  const stored = localStorage.getItem("viet_thao_debts");
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as DebtItem[];
      const normalized = parsed.map((item, index) => ({
        ...item,
        kind: item.kind || kindOptions[index % kindOptions.length],
        status: item.status || statusOptions[index % statusOptions.length],
      }));
      if (normalized.some((item, idx) => item.kind !== parsed[idx]?.kind || item.status !== parsed[idx]?.status)) {
        localStorage.setItem("viet_thao_debts", JSON.stringify(normalized));
      }
      return normalized;
    } catch {
      return demoDebts;
    }
  }
  localStorage.setItem("viet_thao_debts", JSON.stringify(demoDebts));
  return demoDebts;
};

const saveStoredDebts = (items: DebtItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("viet_thao_debts", JSON.stringify(items));
};

const getPartyName = (item: DebtItem) => {
  if (item.kind === "Phải thu") {
    return clients.find((client) => client.id === item.partyId)?.name ?? item.partyId;
  }
  return vendors.find((vendor) => vendor.id === item.partyId)?.name ?? item.partyId;
};

const kindBadge = (kind: DebtKind) =>
  kind === "Phải thu"
    ? "bg-blue-100 text-blue-700 border-blue-200"
    : "bg-purple-100 text-purple-700 border-purple-200";

const statusBadge = (status: DebtStatus) =>
  status === "Hoàn tất"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : status === "Quá hạn"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

export const Route = createFileRoute("/vendors")({
  validateSearch: (search: Record<string, unknown>) => {
    const kind = search.kind;
    return {
      kind: kind === "Phải thu" || kind === "Phải trả" ? kind : undefined,
    };
  },
  component: DebtManagementPage,
  head: () => ({ meta: [{ title: "Quản lý công nợ — Quocviet JR" }] }),
});

function DebtManagementPage() {
  const { kind } = Route.useSearch();
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [form, setForm] = useState({
    waybill: "",
    partyId: "",
    amount: "",
    dueDate: "",
    kind: (kind ?? "Phải thu") as DebtKind,
  });

  useEffect(() => {
    setDebts(getStoredDebts());
  }, []);

  useEffect(() => {
    if (kind) {
      setForm((current) => ({ ...current, kind: kind as DebtKind }));
    }
  }, [kind]);

  const activeKind: DebtKind = (kind ?? "Phải thu") as DebtKind;

  const filteredDebts = useMemo(
    () =>
      debts.filter((item) => {
        if (item.kind !== activeKind) return false;
        if (statusFilter !== "all" && item.status !== statusFilter) return false;

        const needle = q.trim().toLowerCase();
        if (
          needle &&
          !item.id.toLowerCase().includes(needle) &&
          !item.waybill.toLowerCase().includes(needle) &&
          !getPartyName(item).toLowerCase().includes(needle)
        ) {
          return false;
        }

        if (startDate && item.dueDate < startDate) return false;
        if (endDate && item.dueDate > endDate) return false;

        return true;
      }),
    [debts, activeKind, statusFilter, q, startDate, endDate]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.waybill.trim() || !form.partyId.trim() || !form.amount || !form.dueDate) {
      toast.error("Vui lòng nhập đủ thông tin công nợ");
      return;
    }

    const newDebt: DebtItem = {
      id: `CN${String(debts.length + 1).padStart(3, "0")}`,
      waybill: form.waybill.trim(),
      partyId: form.partyId.trim(),
      amount: Number(form.amount),
      dueDate: form.dueDate,
      kind: (kind ?? form.kind) as DebtKind,
      status: "Đang xử lý",
    };

    const updated = [...debts, newDebt];
    setDebts(updated);
    saveStoredDebts(updated);
    toast.success(`Đã thêm công nợ ${newDebt.kind.toLowerCase()} cho vận đơn ${newDebt.waybill}`);
    setForm({ waybill: "", partyId: "", amount: "", dueDate: "", kind: (kind ?? "Phải thu") as DebtKind });
    setOpen(false);
  };

  const toggleStatus = (id: string) => {
    const updated: DebtItem[] = debts.map((item) => {
      if (item.id !== id) return item;
      const next: DebtStatus =
        item.status === "Đang xử lý" ? "Quá hạn" : item.status === "Quá hạn" ? "Hoàn tất" : "Đang xử lý";
      return { ...item, status: next };
    });
    setDebts(updated);
    saveStoredDebts(updated);
  };

  const deleteRow = (id: string) => {
    const updated = debts.filter((item) => item.id !== id);
    setDebts(updated);
    saveStoredDebts(updated);
    toast.success("Đã xoá công nợ");
  };

  return (
    <AppLayout>
      <div className="space-y-5 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Quản lý công nợ</h2>
            <p className="text-sm text-slate-500">
              {kind === "Phải trả"
                ? "Bảng công nợ phải trả cho nhà cung cấp, có bộ lọc theo tình trạng thanh toán."
                : "Bảng công nợ phải thu từ khách hàng, có bộ lọc theo tình trạng thanh toán."}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white shadow-sm hover:bg-primary/95">
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm công nợ
              </Button>
            </DialogTrigger>
            <DialogContent className="p-6 sm:max-w-lg">
              <DialogHeader className="border-b pb-3">
                <DialogTitle className="text-base font-bold text-slate-900">Thêm công nợ mới</DialogTitle>
                <DialogDescription>Nhập vận đơn, khách hàng, số tiền, ngày đến hạn và loại công nợ.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-3 text-left">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Vận đơn *</Label>
                  <Input
                    value={form.waybill}
                    onChange={(e) => setForm({ ...form, waybill: e.target.value })}
                    placeholder="VD: CRTO-2511025-01"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    {kind === "Phải trả" ? "Nhà cung cấp *" : "Khách hàng *"}
                  </Label>
                  <Input
                    value={form.partyId}
                    onChange={(e) => setForm({ ...form, partyId: e.target.value })}
                    placeholder={kind === "Phải trả" ? "VD: V07" : "VD: KH001"}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Số tiền *</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="VD: 150000000"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Ngày đến hạn *</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Loại công nợ *</Label>
                  <Input value={kind ?? form.kind} readOnly className="h-9 bg-slate-50 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    {kind === "Phải trả" ? "Mã nhà cung cấp / tên nhà cung cấp" : "Mã khách hàng / tên khách hàng"}
                  </Label>
                  <Select
                    value={form.partyId}
                    onValueChange={(value) => setForm({ ...form, partyId: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={kind === "Phải trả" ? "Chọn nhà cung cấp" : "Chọn khách hàng"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(kind === "Phải trả" ? vendors : clients).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.id} - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="gap-2 border-t pt-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8.5 text-xs font-semibold">
                    Hủy
                  </Button>
                  <Button type="submit" size="sm" className="h-8.5 bg-primary text-xs font-semibold text-white hover:bg-primary/95">
                    Lưu công nợ
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Tìm theo mã công nợ, vận đơn hoặc tên..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>

            {/* Due date range filter */}
            <div className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm md:w-[280px]">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <div className="flex flex-1 items-center justify-between gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[85px] cursor-pointer select-none border-none bg-transparent p-0 text-[11px] text-slate-700 outline-none"
                  title="Hạn từ ngày"
                />
                <span className="font-light text-slate-300">đến</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[85px] cursor-pointer select-none border-none bg-transparent p-0 text-[11px] text-slate-700 outline-none"
                  title="Hạn đến ngày"
                />
              </div>
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 md:w-[210px]">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Tình trạng thanh toán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tình trạng</SelectItem>
                {statusOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table — sticky header, only the rows scroll (~7 visible) */}
        <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Mã</th>
                  <th className="px-4 py-3 text-left">Vận đơn</th>
                  <th className="px-4 py-3 text-left">{activeKind === "Phải trả" ? "Nhà cung cấp" : "Khách hàng"}</th>
                  <th className="px-4 py-3 text-left">Loại công nợ</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3 text-left">Tình trạng</th>
                  <th className="px-4 py-3 text-left">Đến hạn</th>
                  <th className="px-4 py-3 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{item.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.waybill}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{getPartyName(item)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${kindBadge(item.kind)}`}>
                        {item.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatVND(item.amount)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(item.id)}
                        className={`inline-flex min-w-[120px] justify-center rounded-full border px-3 py-1 text-[11px] font-semibold leading-none whitespace-nowrap transition-colors ${statusBadge(item.status)}`}
                        title="Bấm để đổi tình trạng"
                      >
                        {item.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-slate-600">{item.dueDate}</td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteRow(item.id)}
                        className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredDebts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                      Không có dữ liệu công nợ phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
