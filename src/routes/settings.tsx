import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostTypesPanel } from "@/components/settings/CostTypesPanel";
import { UsersPanel } from "@/components/settings/UsersPanel";
import { LogsPanel } from "@/components/settings/LogsPanel";
import { Settings2, UserCog, History } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Cấu hình — Quocviet JR" }] }),
});

function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-5 text-left">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cấu hình</h2>
          <p className="text-sm text-slate-500">Cấu hình chi phí, quản lý người dùng và nhật ký hệ thống.</p>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-slate-100 p-1">
            <TabsTrigger value="config" className="gap-1.5 px-3.5 py-1.5 text-sm">
              <Settings2 className="h-4 w-4" />
              Cấu hình chi phí
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 px-3.5 py-1.5 text-sm">
              <UserCog className="h-4 w-4" />
              Quản lý người dùng
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 px-3.5 py-1.5 text-sm">
              <History className="h-4 w-4" />
              Lịch sử hệ thống
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-0">
            <CostTypesPanel />
          </TabsContent>
          <TabsContent value="users" className="mt-0">
            <UsersPanel />
          </TabsContent>
          <TabsContent value="logs" className="mt-0">
            <LogsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
