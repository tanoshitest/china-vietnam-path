import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Plus, Phone, Trash2, Search, Filter } from "lucide-react";
import {
  formatLogDate,
  vendors as legacyVendors,
  type Order,
} from "@/lib/mock-data";
import {
  getCostBreakdownEntryAmount,
  getStoredDebts,
  getStoredOrders,
  inferDebtRecordType,
  loadAllDebts,
  loadAllOrders,
  type StoredDebtRecord,
} from "@/lib/debt-storage";
import { getLocalSuppliers, loadAllSuppliers, persistSuppliersList } from "@/lib/supplier-storage";
import { useTmsPageLoader } from "@/lib/use-tms-page-loader";

export const Route = createFileRoute("/suppliers")({
  component: SuppliersPage,
  head: () => ({ meta: [{ title: "Quản lý nhà cung cấp — Quocviet JR" }] }),
});

type SupplierType =
  | "Export Handling Agent"
  | "Import Handling Agent"
  | "Freight Handling Agent"
  | "Unloading Handling Agent"
  | "Last-mile Carrier"
  | "Outsourced Unit"
  | "Others";

type Supplier = {
  id: string;
  name: string;
  type: SupplierType;
  contact: string;
  address: string;
};

const supplierTypes: SupplierType[] = [
  "Export Handling Agent",
  "Import Handling Agent",
  "Freight Handling Agent",
  "Unloading Handling Agent",
  "Last-mile Carrier",
  "Outsourced Unit",
  "Others",
];

const LEGACY_SUPPLIER_TYPE_MAP: Record<string, SupplierType> = {
  "Nhà cung cấp Thông Quan": "Import Handling Agent",
  "Nhà cung cấp Vận chuyển": "Freight Handling Agent",
  "Nhà Xe": "Last-mile Carrier",
  "Bốc Xếp": "Unloading Handling Agent",
};

const normalizeSupplierType = (type: string): SupplierType => {
  if (supplierTypes.includes(type as SupplierType)) return type as SupplierType;
  return LEGACY_SUPPLIER_TYPE_MAP[type] ?? "Others";
};

const typeBadgeColors: Record<SupplierType, string> = {
  "Export Handling Agent": "bg-orange-100 text-orange-700 border-orange-200",
  "Import Handling Agent": "bg-red-100 text-red-700 border-red-200",
  "Freight Handling Agent": "bg-blue-100 text-blue-700 border-blue-200",
  "Unloading Handling Agent": "bg-amber-100 text-amber-700 border-amber-200",
  "Last-mile Carrier": "bg-purple-100 text-purple-700 border-purple-200",
  "Outsourced Unit": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Others": "bg-slate-100 text-slate-700 border-slate-200",
};

const typeBadge = (type: SupplierType) => typeBadgeColors[type];

const demoSuppliers: Supplier[] = [
  {
    id: "NCC01",
    name: "Hải Quan Hữu Nghị",
    type: "Import Handling Agent",
    contact: "0205 123 456",
    address: "Cửa khẩu Hữu Nghị, Lạng Sơn",
  },
  {
    id: "NCC02",
    name: "GZ Express",
    type: "Freight Handling Agent",
    contact: "+86 138 0000 1111",
    address: "Guangzhou, Guangdong, China",
  },
  {
    id: "NCC03",
    name: "Nhà Xe An Phát",
    type: "Last-mile Carrier",
    contact: "0988 111 222",
    address: "Km 15, Quốc lộ 1A, Hà Nội",
  },
  {
    id: "NCC04",
    name: "Bốc Xếp Móng Cái",
    type: "Unloading Handling Agent",
    contact: "0912 333 444",
    address: "Cửa khẩu Móng Cái, Quảng Ninh",
  },
  {
    id: "NCC05",
    name: "SZ Export Services",
    type: "Export Handling Agent",
    contact: "+86 755 888 9999",
    address: "Shenzhen, Guangdong, China",
  },
  {
    id: "NCC06",
    name: "Logistics Partner Co.",
    type: "Outsourced Unit",
    contact: "0909 555 666",
    address: "KCN VSIP, Thuận An, Bình Dương",
  },
];

const normalizeSupplier = (item: Partial<Supplier>): Supplier => ({
  id: item.id ?? "",
  name: item.name ?? "",
  type: normalizeSupplierType(item.type ?? "Others"),
  contact: item.contact ?? "—",
  address: item.address ?? "—",
});

const normalizeNameKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const supplierMatchesPartyId = (
  supplier: Supplier,
  partyId: string,
  supplierList: Supplier[]
): boolean => {
  if (!partyId) return false;
  if (partyId === supplier.id) return true;

  const matchedSupplier = supplierList.find((item) => item.id === partyId);
  if (matchedSupplier && normalizeNameKey(matchedSupplier.name) === normalizeNameKey(supplier.name)) {
    return true;
  }

  const legacyVendor = legacyVendors.find((item) => item.id === partyId);
  if (legacyVendor && normalizeNameKey(legacyVendor.name) === normalizeNameKey(supplier.name)) {
    return true;
  }

  return false;
};

const getSupplierAmountFromBreakdown = (
  breakdown: StoredDebtRecord["costBreakdown"],
  supplier: Supplier,
  supplierList: Supplier[]
): number => {
  if (!breakdown) return 0;
  return Object.values(breakdown).reduce<number>((sum, value) => {
    if (typeof value === "number") return sum;
    const amount = getCostBreakdownEntryAmount(value);
    const partyId = typeof value === "object" && value ? value.partyId ?? "" : "";
    if (amount <= 0 || !supplierMatchesPartyId(supplier, partyId, supplierList)) return sum;
    return sum + amount;
  }, 0);
};

type SupplierOrderRow = {
  order: Order;
  supplierAmount: number;
};

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [debts, setDebts] = useState<StoredDebtRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailForm, setDetailForm] = useState({
    name: "",
    type: "Export Handling Agent" as SupplierType,
    contact: "",
    address: "",
  });
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [form, setForm] = useState({
    name: "",
    type: "Export Handling Agent" as SupplierType,
    contact: "",
  });

  const hydrateFromLocal = useCallback(() => {
    setSuppliers(getLocalSuppliers());
    setOrders(getStoredOrders());
    setDebts(getStoredDebts());
  }, []);

  const syncFromRemote = useCallback(() => {
    return Promise.all([loadAllSuppliers(), loadAllOrders(), loadAllDebts()]).then(
      ([nextSuppliers, nextOrders, nextDebts]) => {
        setSuppliers(nextSuppliers);
        setOrders(nextOrders);
        setDebts(nextDebts);
      },
    );
  }, []);

  useTmsPageLoader(hydrateFromLocal, syncFromRemote);

  useEffect(() => {
    if (!detailOpen) return;
    void Promise.all([loadAllOrders(), loadAllDebts()]).then(([nextOrders, nextDebts]) => {
      setOrders(nextOrders);
      setDebts(nextDebts);
    });
  }, [detailOpen]);

  const supplierOrders = useMemo((): SupplierOrderRow[] => {
    if (!selectedSupplier) return [];

    const rows: SupplierOrderRow[] = [];
    for (const order of orders) {
      const costDebt = debts.find(
        (debt) =>
          inferDebtRecordType(debt) === "cost" &&
          (debt.orderId === order.id || debt.waybill === order.code)
      );
      const supplierAmount = getSupplierAmountFromBreakdown(
        costDebt?.costBreakdown,
        selectedSupplier,
        suppliers
      );
      if (supplierAmount > 0) {
        rows.push({ order, supplierAmount });
      }
    }
    return rows;
  }, [orders, debts, selectedSupplier, suppliers]);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên nhà cung cấp");
      return;
    }

    const newSupplier: Supplier = {
      id: `NCC${String(suppliers.length + 1).padStart(2, "0")}`,
      name: form.name.trim(),
      type: form.type,
      contact: form.contact.trim() || "—",
      address: "—",
    };

    const updated = [...suppliers, newSupplier];
    setSuppliers(updated);
    void persistSuppliersList(updated);
    toast.success(`Đã thêm nhà cung cấp: ${newSupplier.name}`);
    setForm({ name: "", type: "Export Handling Agent", contact: "" });
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = suppliers.filter((item) => item.id !== id);
    setSuppliers(updated);
    void persistSuppliersList(updated);
    toast.success(`Đã xoá nhà cung cấp: ${name}`);
  };

  const openSupplierDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailForm({
      name: supplier.name,
      type: normalizeSupplierType(supplier.type),
      contact: supplier.contact === "—" ? "" : supplier.contact,
      address: supplier.address === "—" ? "" : supplier.address,
    });
    setDetailOpen(true);
  };

  const handleSaveSupplierDetail = () => {
    if (!selectedSupplier) return;
    if (!detailForm.name.trim()) {
      toast.error("Vui lòng nhập tên nhà cung cấp");
      return;
    }

    const updatedSupplier: Supplier = {
      ...selectedSupplier,
      name: detailForm.name.trim(),
      type: detailForm.type,
      contact: detailForm.contact.trim() || "—",
      address: detailForm.address.trim() || "—",
    };

    const updated = suppliers.map((item) =>
      item.id === selectedSupplier.id ? updatedSupplier : item
    );
    setSuppliers(updated);
    void persistSuppliersList(updated);
    setSelectedSupplier(updatedSupplier);
    toast.success("Đã lưu thông tin nhà cung cấp");
  };

  const filteredSuppliers = suppliers.filter((item) => {
    if (typeFilter !== "all" && normalizeSupplierType(item.type) !== typeFilter) return false;
    const needle = q.trim().toLowerCase();
    if (
      needle &&
      !item.id.toLowerCase().includes(needle) &&
      !item.name.toLowerCase().includes(needle) &&
      !item.contact.toLowerCase().includes(needle)
    ) {
      return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-5 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quản lý nhà cung cấp</h2>
            <p className="text-sm text-slate-500">
              Danh sách nhà cung cấp — bấm vào từng dòng để xem chi tiết và lịch sử đơn hàng dịch vụ.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white shadow-sm hover:bg-primary/95">
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm nhà cung cấp
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-6">
                <DialogHeader className="border-b pb-3">
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Thêm nhà cung cấp mới
                  </DialogTitle>
                  <DialogDescription>
                    Chọn loại nhà cung cấp và nhập thông tin cơ bản.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAddSupplier} className="space-y-4 py-3 text-left">
                  <div className="space-y-1.5">
                    <Label htmlFor="supplier-name" className="text-xs font-semibold text-slate-700">
                      Tên nhà cung cấp *
                    </Label>
                    <Input
                      id="supplier-name"
                      placeholder="VD: GZ Express"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-9 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="supplier-type" className="text-xs font-semibold text-slate-700">
                      Loại nhà cung cấp *
                    </Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) => setForm({ ...form, type: value as SupplierType })}
                    >
                      <SelectTrigger id="supplier-type" className="h-9 text-sm">
                        <SelectValue placeholder="Chọn loại nhà cung cấp" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="supplier-contact" className="text-xs font-semibold text-slate-700">
                      Thông tin liên hệ
                    </Label>
                    <div className="relative">
                      <Input
                        id="supplier-contact"
                        placeholder="SĐT hoặc địa chỉ liên hệ..."
                        value={form.contact}
                        onChange={(e) => setForm({ ...form, contact: e.target.value })}
                        className="h-9 pl-9 text-sm"
                      />
                      <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <DialogFooter className="gap-2 border-t pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpen(false)}
                      className="h-8.5 text-xs font-semibold"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8.5 bg-primary text-xs font-semibold text-white hover:bg-primary/95"
                    >
                      Lưu nhà cung cấp
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </div>

        <Dialog
          open={detailOpen}
          onOpenChange={(isOpen) => {
            setDetailOpen(isOpen);
            if (!isOpen) setSelectedSupplier(null);
          }}
        >
          <DialogContent className="!flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-[1400px] flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
            <DialogHeader className="shrink-0 border-b px-6 pb-3 pt-6">
              <DialogTitle className="text-base font-bold text-slate-900">Chi tiết nhà cung cấp</DialogTitle>
              <DialogDescription>
                {selectedSupplier ? `${selectedSupplier.id} · ${detailForm.name || selectedSupplier.name}` : ""}
              </DialogDescription>
            </DialogHeader>

            {selectedSupplier && (
              <>
                <div className="shrink-0 space-y-3 border-b border-slate-100 px-6 py-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label htmlFor="detail-supplier-name" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Tên nhà cung cấp
                      </Label>
                      <Input
                        id="detail-supplier-name"
                        value={detailForm.name}
                        onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                        className="h-9 text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label htmlFor="detail-supplier-type" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Loại nhà cung cấp
                      </Label>
                      <Select
                        value={detailForm.type}
                        onValueChange={(value) =>
                          setDetailForm({ ...detailForm, type: value as SupplierType })
                        }
                      >
                        <SelectTrigger id="detail-supplier-type" className="h-9 bg-white text-sm">
                          <SelectValue placeholder="Chọn loại" />
                        </SelectTrigger>
                        <SelectContent>
                          {supplierTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-supplier-contact" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Số điện thoại
                      </Label>
                      <Input
                        id="detail-supplier-contact"
                        value={detailForm.contact}
                        onChange={(e) => setDetailForm({ ...detailForm, contact: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <Label htmlFor="detail-supplier-address" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Địa chỉ
                      </Label>
                      <Input
                        id="detail-supplier-address"
                        value={detailForm.address}
                        onChange={(e) => setDetailForm({ ...detailForm, address: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Lịch sử đơn hàng dịch vụ
                  </Label>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-3">
                  <div className="shrink-0 overflow-hidden rounded-t-lg border border-b-0 border-slate-200 bg-slate-50">
                    <table className="w-full table-fixed text-sm">
                      <SupplierOrderColGroup />
                      <thead className="text-xs font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Mã đơn</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Khách hàng</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Ngày phát sinh</th>
                          <th className="whitespace-nowrap px-4 py-3 text-right">Số tiền</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Tình trạng</th>
                        </tr>
                      </thead>
                    </table>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto rounded-b-lg border border-slate-200 bg-white">
                    <table className="w-full table-fixed text-sm">
                      <SupplierOrderColGroup />
                      <tbody className="divide-y divide-slate-100">
                        {supplierOrders.map(({ order, supplierAmount }) => (
                          <tr key={order.id} className="hover:bg-slate-50/60">
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className="font-mono text-xs font-semibold text-primary">{order.code}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-800">
                              {order.client}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600">
                              {order.createdAt ? formatLogDate(order.createdAt) : "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-900">
                              {supplierAmount.toLocaleString("en-US")} VND
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className="inline-flex min-w-[140px] justify-center rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm">
                                Đã hoàn thành
                              </span>
                            </td>
                          </tr>
                        ))}
                        {supplierOrders.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                              Chưa có đơn hàng dịch vụ nào với nhà cung cấp này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="shrink-0 gap-2 border-t bg-white px-6 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDetailOpen(false)}
                className="h-8.5 text-xs font-semibold"
              >
                Đóng
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveSupplierDetail}
                disabled={!selectedSupplier}
                className="h-8.5 bg-primary text-xs font-semibold text-white hover:bg-primary/95"
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Tìm theo mã, tên hoặc liên hệ nhà cung cấp..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 md:w-[280px]">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Loại nhà cung cấp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {supplierTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
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
                  <th className="px-4 py-3 text-left">Tên nhà cung cấp</th>
                  <th className="px-4 py-3 text-left">Loại</th>
                  <th className="px-4 py-3 text-left">Liên hệ</th>
                  <th className="px-4 py-3 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-blue-50/40"
                    onClick={() => openSupplierDetail(item)}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{item.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${typeBadge(normalizeSupplierType(item.type))}`}>
                        {normalizeSupplierType(item.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{item.contact}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item.id, item.name)}
                        className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center text-sm text-slate-400">
                      Không tìm thấy nhà cung cấp phù hợp.
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

function SupplierOrderColGroup() {
  return (
    <colgroup>
      <col className="w-[18%]" />
      <col className="w-[24%]" />
      <col className="w-[16%]" />
      <col className="w-[22%]" />
      <col className="w-[20%]" />
    </colgroup>
  );
}
