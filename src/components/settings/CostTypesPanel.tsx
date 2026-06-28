import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Plus, Trash2, PencilLine, Search } from "lucide-react";
import {
  getLocalCostTypes,
  loadAllCostTypes,
  persistCostTypesList,
  type CostType,
} from "@/lib/cost-type-storage";
import { useTmsDataRefresh } from "@/lib/use-tms-data-refresh";

export function CostTypesPanel() {
  const [costTypes, setCostTypes] = useState<CostType[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", note: "" });
  const [q, setQ] = useState("");

  const reload = useCallback(() => {
    void loadAllCostTypes().then(setCostTypes);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useTmsDataRefresh(reload);

  const resetForm = () => {
    setForm({ name: "", note: "" });
    setEditingId(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên loại chi phí");
      return;
    }

    const cleanedName = form.name.trim();

    if (editingId) {
      const updated = costTypes.map((item) =>
        item.id === editingId ? { ...item, name: cleanedName, note: form.note.trim() } : item
      );
      setCostTypes(updated);
      void persistCostTypesList(updated);
      toast.success(`Đã cập nhật loại chi phí: ${cleanedName}`);
    } else {
      const newType: CostType = {
        id: `CT${String(costTypes.length + 1).padStart(2, "0")}`,
        name: cleanedName,
        note: form.note.trim(),
      };
      const updated = [...costTypes, newType];
      setCostTypes(updated);
      void persistCostTypesList(updated);
      toast.success(`Đã thêm loại chi phí: ${cleanedName}`);
    }

    handleOpenChange(false);
  };

  const handleEdit = (item: CostType) => {
    setEditingId(item.id);
    setForm({ name: item.name, note: item.note ?? "" });
    setOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = costTypes.filter((item) => item.id !== id);
    setCostTypes(updated);
    void persistCostTypesList(updated);
    toast.success(`Đã xóa loại chi phí: ${name}`);
  };

  const filtered = costTypes.filter((item) => {
    const needle = q.trim().toLowerCase();
    if (
      needle &&
      !item.id.toLowerCase().includes(needle) &&
      !item.name.toLowerCase().includes(needle) &&
      !(item.note ?? "").toLowerCase().includes(needle)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cấu hình chi phí</h2>
          <p className="text-sm text-slate-500">Cấu hình các loại chi phí: vận chuyển, thông quan, bốc xếp...</p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white shadow-sm hover:bg-primary/95">
              <Plus className="mr-1.5 h-4 w-4" />
              Thêm loại chi phí
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingId ? "Sửa loại chi phí" : "Thêm loại chi phí mới"}
              </DialogTitle>
              <DialogDescription>Cấu hình các nhóm chi phí dùng trong toàn hệ thống.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-3 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="cost-type-name" className="text-xs font-semibold text-slate-700">
                  Tên loại chi phí *
                </Label>
                <Input
                  id="cost-type-name"
                  placeholder="VD: Vận chuyển"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cost-type-note" className="text-xs font-semibold text-slate-700">
                  Ghi chú
                </Label>
                <Input
                  id="cost-type-note"
                  placeholder="VD: Chi phí vận chuyển hàng hóa"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <DialogFooter className="gap-2 border-t pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)} className="h-8.5 text-xs font-semibold">
                  Hủy
                </Button>
                <Button type="submit" size="sm" className="h-8.5 bg-primary text-xs font-semibold text-white hover:bg-primary/95">
                  {editingId ? "Lưu thay đổi" : "Lưu loại chi phí"}
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
            placeholder="Tìm theo mã, tên hoặc ghi chú loại chi phí..."
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
                <th className="px-4 py-3 text-left">Mã</th>
                <th className="px-4 py-3 text-left">Tên loại chi phí</th>
                <th className="px-4 py-3 text-left">Ghi chú</th>
                <th className="px-4 py-3 text-center">Sửa</th>
                <th className="px-4 py-3 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono font-bold text-slate-500">{item.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.note || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                      className="h-7 w-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </Button>
                  </td>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    Không tìm thấy loại chi phí phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
