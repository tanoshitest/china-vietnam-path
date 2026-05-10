import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { users } from "@/lib/mock-data";
import { Plus, Shield } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Cài đặt — Quocviet JR" }] }),
});

const roleColors: Record<string, string> = {
  "Quản trị viên": "bg-purple-100 text-purple-700 border-purple-200",
  "Điều phối": "bg-blue-100 text-blue-700 border-blue-200",
  "Kế toán": "bg-green-100 text-green-700 border-green-200",
  "Nhân viên kho": "bg-slate-100 text-slate-700 border-slate-200",
};

function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Cài đặt</h2>
          <p className="text-sm text-slate-500">Quản lý phân quyền nhân sự</p>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-slate-900">Người dùng & Phân quyền</h3>
            </div>
            <Button size="sm"><Plus className="w-4 h-4" /> Thêm người dùng</Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Họ tên</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Vai trò</th>
                <th className="text-right px-5 py-3 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {u.name.split(" ").pop()?.[0]}
                      </div>
                      <span className="font-medium text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs border ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm">Chỉnh sửa</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Thông tin công ty</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Tên</dt><dd>Quocviet JR Co., Ltd.</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Mã số thuế</dt><dd>0312345678</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Trụ sở</dt><dd>Hà Nội, Việt Nam</dd></div>
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Tùy chọn hệ thống</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Đơn vị tiền tệ</dt><dd>VND</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Múi giờ</dt><dd>GMT+7</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Ngôn ngữ</dt><dd>Tiếng Việt</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
