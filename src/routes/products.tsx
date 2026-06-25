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
import { Plus, Tag, Trash2, Search, Filter } from "lucide-react";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
  head: () => ({ meta: [{ title: "Quản lý sản phẩm — Quocviet JR" }] }),
});

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
};

const productCategories = ["Điện tử", "Phụ kiện", "Vật tư", "Hàng khác"];

const categoryBadge = (category: string) =>
  category === "Điện tử"
    ? "bg-blue-100 text-blue-700 border-blue-200"
    : category === "Phụ kiện"
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : category === "Vật tư"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

const demoProducts: Product[] = [
  { id: "SP001", name: "Tai nghe Bluetooth", category: "Điện tử", unit: "Cái" },
  { id: "SP002", name: "Cáp sạc Type-C", category: "Phụ kiện", unit: "Cái" },
  { id: "SP003", name: "Thùng carton", category: "Vật tư", unit: "Thùng" },
];

const getStoredProducts = () => {
  if (typeof window === "undefined") return demoProducts;
  const stored = localStorage.getItem("viet_thao_products");
  if (stored) {
    try {
      return JSON.parse(stored) as Product[];
    } catch {
      return demoProducts;
    }
  }
  localStorage.setItem("viet_thao_products", JSON.stringify(demoProducts));
  return demoProducts;
};

const saveStoredProducts = (items: Product[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("viet_thao_products", JSON.stringify(items));
};

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [form, setForm] = useState({
    name: "",
    category: "Điện tử",
    unit: "Cái",
  });

  useEffect(() => {
    setProducts(getStoredProducts());
  }, []);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      return;
    }

    const newProduct: Product = {
      id: `SP${String(products.length + 1).padStart(3, "0")}`,
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim() || "Cái",
    };

    const updated = [...products, newProduct];
    setProducts(updated);
    saveStoredProducts(updated);
    toast.success(`Đã thêm sản phẩm: ${newProduct.name}`);
    setForm({ name: "", category: "Điện tử", unit: "Cái" });
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = products.filter((item) => item.id !== id);
    setProducts(updated);
    saveStoredProducts(updated);
    toast.success(`Đã xoá sản phẩm: ${name}`);
  };

  const filteredProducts = products.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    const needle = q.trim().toLowerCase();
    if (
      needle &&
      !item.id.toLowerCase().includes(needle) &&
      !item.name.toLowerCase().includes(needle)
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
            <h2 className="text-xl font-bold text-slate-900">Quản lý sản phẩm</h2>
            <p className="text-sm text-slate-500">Danh mục sản phẩm, có tìm kiếm và bộ lọc theo danh mục.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white shadow-sm hover:bg-primary/95">
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="border-b pb-3">
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Thêm sản phẩm mới
                  </DialogTitle>
                  <DialogDescription>
                    Demo popup cấu hình sản phẩm để test luồng nhập liệu.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAddProduct} className="space-y-4 py-3 text-left">
                  <div className="space-y-1.5">
                    <Label htmlFor="product-name" className="text-xs font-semibold text-slate-700">
                      Tên sản phẩm *
                    </Label>
                    <Input
                      id="product-name"
                      placeholder="VD: Tai nghe Bluetooth"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-9 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="product-category" className="text-xs font-semibold text-slate-700">
                      Danh mục
                    </Label>
                    <Select
                      value={form.category}
                      onValueChange={(value) => setForm({ ...form, category: value })}
                    >
                      <SelectTrigger id="product-category" className="h-9 text-sm">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="product-unit" className="text-xs font-semibold text-slate-700">
                      Đơn vị tính
                    </Label>
                    <div className="relative">
                      <Input
                        id="product-unit"
                        placeholder="VD: Cái, Thùng, Bộ"
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        className="h-9 pl-9 text-sm"
                      />
                      <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
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
                      Lưu sản phẩm
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
                placeholder="Tìm theo mã hoặc tên sản phẩm..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 md:w-[200px]">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
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
                  <th className="px-4 py-3 text-left">Mã SP</th>
                  <th className="px-4 py-3 text-left">Tên sản phẩm</th>
                  <th className="px-4 py-3 text-left">Danh mục</th>
                  <th className="px-4 py-3 text-left">ĐVT</th>
                  <th className="px-4 py-3 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{item.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryBadge(item.category)}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{item.unit}</td>
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
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center text-sm text-slate-400">
                      Không tìm thấy sản phẩm phù hợp.
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
