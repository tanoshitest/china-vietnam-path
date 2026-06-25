import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { UsersPanel } from "@/components/settings/UsersPanel";

export const Route = createFileRoute("/users")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "Quản lý người dùng — Quocviet JR" }] }),
});

function UsersPage() {
  return (
    <AppLayout>
      <UsersPanel />
    </AppLayout>
  );
}
