import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { CostTypesPanel } from "@/components/settings/CostTypesPanel";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Cấu hình chi phí — Quocviet JR" }] }),
});

function SettingsPage() {
  return (
    <AppLayout>
      <CostTypesPanel />
    </AppLayout>
  );
}
