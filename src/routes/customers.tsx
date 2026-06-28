import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Phone, Trash2, Search } from "lucide-react";
import {
  formatLogDate,
  getOrderUpdatedAt,
  type Order,
} from "@/lib/mock-data";
import { loadAllOrders, getStoredOrders } from "@/lib/debt-storage";
import { getLocalCustomers, loadAllCustomers, normalizeCustomer, persistCustomersList, type Customer, type PriceUnit } from "@/lib/customer-storage";
import { useTmsPageLoader } from "@/lib/use-tms-page-loader";
export const Route = createFileRoute("/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Quản lý khách hàng — Quocviet JR" }] }),
});

const PRICE_UNITS: PriceUnit[] = ["Conts", "Sacks", "Bags", "Rolls"];
const DEFAULT_PRICE_UNIT: PriceUnit = "Rolls";

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailForm, setDetailForm] = useState({
    name: "",
    contact: "",
    address: "",
    unitPriceAmount: "",
    unitPriceUnit: DEFAULT_PRICE_UNIT as PriceUnit,
  });
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", contact: "" });

  const hydrateFromLocal = useCallback(() => {
    setCustomers(getLocalCustomers());
    setOrders(getStoredOrders());
  }, []);

  const syncFromRemote = useCallback(() => {
    return Promise.all([loadAllCustomers(), loadAllOrders()]).then(([nextCustomers, nextOrders]) => {
      setCustomers(nextCustomers);
      setOrders(nextOrders);
    });
  }, []);

  useTmsPageLoader(hydrateFromLocal, syncFromRemote);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      (order) =>
        order.clientId === selectedCustomer.id ||
        order.client.toLowerCase() === selectedCustomer.name.toLowerCase()
    );
  }, [orders, selectedCustomer]);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    const newCustomer: Customer = {
      id: `KH${String(customers.length + 1).padStart(3, "0")}`,
      name: form.name.trim(),
      contact: form.contact.trim() || "—",
      address: "—",
      unitPrice: 0,
      priceUnit: DEFAULT_PRICE_UNIT,
    };

    const updated = [...customers, newCustomer];
    setCustomers(updated);
    void persistCustomersList(updated);
    toast.success(`Đã thêm khách hàng: ${newCustomer.name}`);
    setForm({ name: "", contact: "" });
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = customers.filter((item) => item.id !== id);
    setCustomers(updated);
    void persistCustomersList(updated);
    toast.success(`Đã xoá khách hàng: ${name}`);
  };

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailForm({
      name: customer.name,
      contact: customer.contact === "—" ? "" : customer.contact,
      address: customer.address === "—" ? "" : customer.address,
      unitPriceAmount: customer.unitPrice > 0 ? String(customer.unitPrice) : "",
      unitPriceUnit: customer.priceUnit,
    });
    setDetailOpen(true);
  };

  const handleSaveCustomerDetail = () => {
    if (!selectedCustomer) return;
    if (!detailForm.name.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    const unitPrice = Number(detailForm.unitPriceAmount.replace(/\D/g, "")) || 0;
    const updatedCustomer: Customer = {
      ...selectedCustomer,
      name: detailForm.name.trim(),
      contact: detailForm.contact.trim() || "—",
      address: detailForm.address.trim() || "—",
      unitPrice,
      priceUnit: detailForm.unitPriceUnit,
    };

    const updated = customers.map((item) =>
      item.id === selectedCustomer.id ? updatedCustomer : item
    );
    setCustomers(updated);
    void persistCustomersList(updated);
    setSelectedCustomer(updatedCustomer);
    toast.success("Đã lưu thông tin khách hàng");
  };

  const filteredCustomers = customers.filter((item) => {
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
            <h2 className="text-xl font-bold text-slate-900">Quản lý khách hàng</h2>
            <p className="text-sm text-slate-500">
              Danh sách khách hàng — bấm vào từng dòng để xem chi tiết và lịch sử đơn hàng.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white shadow-sm hover:bg-primary/95">
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm khách hàng
              </Button>
            </DialogTrigger>
            <DialogContent className="p-6 sm:max-w-md">
              <DialogHeader className="border-b pb-3">
                <DialogTitle className="text-base font-bold text-slate-900">Thêm khách hàng mới</DialogTitle>
                <DialogDescription>Nhập thông tin khách hàng để dùng trong demo.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddCustomer} className="space-y-4 py-3 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="customer-name" className="text-xs font-semibold text-slate-700">
                    Tên khách hàng *
                  </Label>
                  <Input
                    id="customer-name"
                    placeholder="VD: NGUYEN TIEN MINH"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customer-contact" className="text-xs font-semibold text-slate-700">
                    Số điện thoại
                  </Label>
                  <div className="relative">
                    <Input
                      id="customer-contact"
                      placeholder="VD: 0903 111 222"
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
                    Lưu khách hàng
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
            if (!isOpen) setSelectedCustomer(null);
          }}
        >
          <DialogContent className="!flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-[1400px] flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
            <DialogHeader className="shrink-0 border-b px-6 pb-3 pt-6">
              <DialogTitle className="text-base font-bold text-slate-900">Chi tiết khách hàng</DialogTitle>
              <DialogDescription>
                {selectedCustomer ? `${selectedCustomer.id} · ${detailForm.name || selectedCustomer.name}` : ""}
              </DialogDescription>
            </DialogHeader>

            {selectedCustomer && (
              <>
                <div className="shrink-0 space-y-3 border-b border-slate-100 px-6 py-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-name" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Tên
                      </Label>
                      <Input
                        id="detail-name"
                        value={detailForm.name}
                        onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                        className="h-9 text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-contact" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Số điện thoại
                      </Label>
                      <Input
                        id="detail-contact"
                        value={detailForm.contact}
                        onChange={(e) => setDetailForm({ ...detailForm, contact: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                      <Label htmlFor="detail-address" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Địa chỉ
                      </Label>
                      <Input
                        id="detail-address"
                        value={detailForm.address}
                        onChange={(e) => setDetailForm({ ...detailForm, address: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Đơn giá
                      </Label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
                        <div className="space-y-1">
                          <Label htmlFor="detail-unit-amount" className="text-[10px] font-medium text-slate-400">
                            Số tiền (VND)
                          </Label>
                          <Input
                            id="detail-unit-amount"
                            inputMode="numeric"
                            placeholder="VD: 85000"
                            value={detailForm.unitPriceAmount}
                            onChange={(e) =>
                              setDetailForm({
                                ...detailForm,
                                unitPriceAmount: e.target.value.replace(/\D/g, ""),
                              })
                            }
                            className="h-9 text-sm font-semibold text-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="detail-unit-type" className="text-[10px] font-medium text-slate-400">
                            Đơn vị tính
                          </Label>
                          <Select
                            value={detailForm.unitPriceUnit}
                            onValueChange={(value) =>
                              setDetailForm({ ...detailForm, unitPriceUnit: value as PriceUnit })
                            }
                          >
                            <SelectTrigger id="detail-unit-type" className="h-9 bg-white text-sm">
                              <SelectValue placeholder="Chọn đơn vị" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRICE_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Lịch sử đơn hàng
                  </Label>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-3">
                  <div className="shrink-0 overflow-hidden rounded-t-lg border border-b-0 border-slate-200 bg-slate-50">
                    <table className="w-full table-fixed text-sm">
                      <OrderHistoryColGroup />
                      <thead className="text-xs font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Mã vận đơn</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Tên khách hàng</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Tổng số lượng</th>
                          <th className="whitespace-nowrap px-4 py-3 text-right">Thành tiền</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Ngày nhận</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Ngày cập nhật</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left">Trạng thái</th>
                        </tr>
                      </thead>
                    </table>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto rounded-b-lg border border-slate-200 bg-white">
                    <table className="w-full table-fixed text-sm">
                      <OrderHistoryColGroup />
                      <tbody className="divide-y divide-slate-100">
                        {customerOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50/60">
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className="font-mono text-xs font-semibold text-primary">{order.code}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-800">
                              {order.client}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600" title={order.weight}>
                              {order.weight || "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-900">
                              {order.fee.toLocaleString("en-US")} VND
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600">
                              {order.createdAt ? formatLogDate(order.createdAt) : "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600">
                              {formatLogDate(getOrderUpdatedAt(order)) || "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className="inline-flex min-w-[140px] justify-center rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm">
                                Đã hoàn thành
                              </span>
                            </td>
                          </tr>
                        ))}
                        {customerOrders.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                              Chưa có đơn hàng nào cho khách hàng này.
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
                onClick={handleSaveCustomerDetail}
                disabled={!selectedCustomer}
                className="h-8.5 bg-primary text-xs font-semibold text-white hover:bg-primary/95"
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm theo mã, tên hoặc liên hệ khách hàng..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 pl-9 text-sm"
            />
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Mã KH</th>
                  <th className="px-4 py-3 text-left">Tên khách hàng</th>
                  <th className="px-4 py-3 text-left">Liên hệ</th>
                  <th className="px-4 py-3 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-blue-50/40"
                    onClick={() => openCustomerDetail(item)}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{item.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
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
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-14 text-center text-sm text-slate-400">
                      Không tìm thấy khách hàng phù hợp.
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

function OrderHistoryColGroup() {
  return (
    <colgroup>
      <col className="w-[11%]" />
      <col className="w-[14%]" />
      <col className="w-[22%]" />
      <col className="w-[14%]" />
      <col className="w-[11%]" />
      <col className="w-[12%]" />
      <col className="w-[16%]" />
    </colgroup>
  );
}

