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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Phone, Trash2, Search, Filter } from "lucide-react";

export const Route = createFileRoute("/suppliers")({
  component: SuppliersPage,
  head: () => ({ meta: [{ title: "Quản lý nhà cung cấp — Quocviet JR" }] }),
});

type SupplierType =
  | "Nhà cung cấp Thông Quan"
  | "Nhà cung cấp Vận chuyển"
  | "Nhà Xe"
  | "Bốc Xếp";

type Supplier = {
  id: string;
  name: string;
  type: SupplierType;
  contact: string;
};

const supplierTypes: SupplierType[] = [
  "Nhà cung cấp Thông Quan",
  "Nhà cung cấp Vận chuyển",
  "Nhà Xe",
  "Bốc Xếp",
];

const typeBadge = (type: SupplierType) =>
  type === "Nhà cung cấp Thông Quan"
    ? "bg-red-100 text-red-700 border-red-200"
    : type === "Nhà cung cấp Vận chuyển"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : type === "Nhà Xe"
        ? "bg-purple-100 text-purple-700 border-purple-200"
        : "bg-amber-100 text-amber-700 border-amber-200";

const demoSuppliers: Supplier[] = [
  {
    id: "NCC01",
    name: "Hải Quan Hữu Nghị",
    type: "Nhà cung cấp Thông Quan",
    contact: "0205 123 456",
  },
  {
    id: "NCC02",
    name: "GZ Express",
    type: "Nhà cung cấp Vận chuyển",
    contact: "+86 138 0000 1111",
  },
  {
    id: "NCC03",
    name: "Nhà Xe An Phát",
    type: "Nhà Xe",
    contact: "0988 111 222",
  },
  {
    id: "NCC04",
    name: "Bốc Xếp Móng Cái",
    type: "Bốc Xếp",
    contact: "0912 333 444",
  },
];

const getStoredSuppliers = () => {
  if (typeof window === "undefined") return demoSuppliers;
  const stored = localStorage.getItem("viet_thao_suppliers");
  if (stored) {
    try {
      return JSON.parse(stored) as Supplier[];
    } catch {
      return demoSuppliers;
    }
  }
  localStorage.setItem("viet_thao_suppliers", JSON.stringify(demoSuppliers));
  return demoSuppliers;
};

const saveStoredSuppliers = (items: Supplier[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("viet_thao_suppliers", JSON.stringify(items));
};

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [form, setForm] = useState({
    name: "",
    type: "Nhà cung cấp Thông Quan" as SupplierType,
    contact: "",
  });

  useEffect(() => {
    setSuppliers(getStoredSuppliers());
  }, []);

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
    };

    const updated = [...suppliers, newSupplier];
    setSuppliers(updated);
    saveStoredSuppliers(updated);
    toast.success(`Đã thêm nhà cung cấp: ${newSupplier.name}`);
    setForm({ name: "", type: "Nhà cung cấp Thông Quan", contact: "" });
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = suppliers.filter((item) => item.id !== id);
    setSuppliers(updated);
    saveStoredSuppliers(updated);
    toast.success(`Đã xoá nhà cung cấp: ${name}`);
  };

  const filteredSuppliers = suppliers.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
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
            <p className="text-sm text-slate-500">Danh sách nhà cung cấp theo loại dịch vụ, có tìm kiếm và bộ lọc.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white shadow-sm hover:bg-primary/95">
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm nhà cung cấp
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-md p-6">
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
              <SelectTrigger className="h-10 md:w-[230px]">
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
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{item.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${typeBadge(item.type)}`}>
                        {item.type}
                      </span>
                    </td>
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
