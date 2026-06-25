import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { LogsPanel } from "@/components/settings/LogsPanel";

export const Route = createFileRoute("/logs")({
  component: LogsPage,
  head: () => ({ meta: [{ title: "Lịch sử hệ thống — Quocviet JR" }] }),
});

function LogsPage() {
  return (
    <AppLayout>
      <LogsPanel />
    </AppLayout>
  );
}
