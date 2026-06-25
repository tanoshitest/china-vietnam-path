import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Plus, Phone, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Quản lý khách hàng — Quocviet JR" }] }),
});

type Customer = {
  id: string;
  name: string;
  contact: string;
};

const demoCustomers: Customer[] = [
  { id: "KH001", name: "NGUYEN TIEN MINH", contact: "0903 111 222" },
  { id: "KH002", name: "NGUYEN THI HANH", contact: "0912 333 444" },
  { id: "KH003", name: "Điện Tử Phú Quý", contact: "028 8888 9999" },
];

const getStoredCustomers = () => {
  if (typeof window === "undefined") return demoCustomers;
  const stored = localStorage.getItem("viet_thao_customers");
  if (stored) {
    try {
      return JSON.parse(stored) as Customer[];
    } catch {
      return demoCustomers;
    }
  }
  localStorage.setItem("viet_thao_customers", JSON.stringify(demoCustomers));
  return demoCustomers;
};

const saveStoredCustomers = (items: Customer[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("viet_thao_customers", JSON.stringify(items));
};

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", contact: "" });

  useEffect(() => {
    setCustomers(getStoredCustomers());
  }, []);

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
    };

    const updated = [...customers, newCustomer];
    setCustomers(updated);
    saveStoredCustomers(updated);
    toast.success(`Đã thêm khách hàng: ${newCustomer.name}`);
    setForm({ name: "", contact: "" });
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = customers.filter((item) => item.id !== id);
    setCustomers(updated);
    saveStoredCustomers(updated);
    toast.success(`Đã xoá khách hàng: ${name}`);
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
            <p className="text-sm text-slate-500">Danh sách khách hàng, tìm kiếm nhanh theo mã, tên hoặc liên hệ.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white shadow-sm hover:bg-primary/95">
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm khách hàng
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="border-b pb-3">
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Thêm khách hàng mới
                  </DialogTitle>
                  <DialogDescription>
                    Nhập thông tin khách hàng để dùng trong demo.
                  </DialogDescription>
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
                      Thông tin liên hệ
                    </Label>
                    <div className="relative">
                      <Input
                        id="customer-contact"
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
                      Lưu khách hàng
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </div>

        {/* Filters */}
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

        {/* Table — sticky header, only the rows scroll (~7 visible) */}
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
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{item.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{item.contact}</td>
                    <td className="px-4 py-3 text-center">
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
