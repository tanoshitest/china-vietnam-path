import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { vendors, formatVND } from "@/lib/mock-data";
import { Plus, Phone } from "lucide-react";

export const Route = createFileRoute("/vendors")({
  component: VendorsPage,
  head: () => ({ meta: [{ title: "Chi phí & Vendor — Quocviet JR" }] }),
});

const typeColors: Record<string, string> = {
  "Vendor vận chuyển TQ": "bg-blue-50 text-blue-700",
  "Vendor thông quan": "bg-purple-50 text-purple-700",
  "Nhà xe VN": "bg-green-50 text-green-700",
  "Phí bốc xếp": "bg-orange-50 text-orange-700",
};

function VendorsPage() {
  const totalSpent = vendors.reduce((s, v) => s + v.totalSpent, 0);
  const grouped = vendors.reduce<Record<string, typeof vendors>>((acc, v) => {
    (acc[v.type] ||= []).push(v);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Chi phí & Vendor</h2>
            <p className="text-sm text-slate-500">Quản lý nhà xe, hải quan, bốc xếp</p>
          </div>
          <Button><Plus className="w-4 h-4" /> Thêm Vendor</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="text-sm text-slate-500">Tổng vendor</div>
            <div className="text-2xl font-semibold mt-1">{vendors.length}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-slate-500">Tổng chi phí đã trả</div>
            <div className="text-2xl font-semibold mt-1">{formatVND(totalSpent)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-slate-500">Loại Vendor</div>
            <div className="text-2xl font-semibold mt-1">{Object.keys(grouped).length}</div>
          </Card>
        </div>

        {Object.entries(grouped).map(([type, list]) => (
          <Card key={type} className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[type]}`}>{type}</span>
              <span className="text-xs text-slate-500">{list.length} vendor</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Mã</th>
                  <th className="text-left px-5 py-3 font-medium">Tên Vendor</th>
                  <th className="text-left px-5 py-3 font-medium">Liên hệ</th>
                  <th className="text-right px-5 py-3 font-medium">Tổng chi phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {list.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{v.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{v.name}</td>
                    <td className="px-5 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />{v.contact}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{formatVND(v.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
