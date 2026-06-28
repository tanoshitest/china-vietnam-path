import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getCloudStatus,
  isSupabaseConfigured,
  TMS_CLOUD_STATUS_EVENT,
  type CloudStatus,
} from "@/lib/supabase";
import { refreshAllTmsData } from "@/lib/tms-sync";

export function CloudSyncBanner() {
  const [status, setStatus] = useState<CloudStatus>(getCloudStatus);

  useEffect(() => {
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<CloudStatus>).detail;
      if (detail) setStatus(detail);
    };
    window.addEventListener(TMS_CLOUD_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(TMS_CLOUD_STATUS_EVENT, onStatus);
  }, []);

  if (!isSupabaseConfigured || status === "online") return null;

  const retry = () => {
    void refreshAllTmsData({ silent: false });
  };

  return (
    <div
      className={
        status === "syncing"
          ? "border-b border-blue-200 bg-blue-50 px-4 py-2 text-center text-xs text-blue-800"
          : "border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900"
      }
    >
      {status === "syncing" ? (
        "Đang kết nối Supabase…"
      ) : (
        <span className="inline-flex flex-wrap items-center justify-center gap-2">
          Chưa kết nối được Supabase — mỗi trình duyệt cần cloud để đồng bộ dữ liệu.
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={retry}>
            Thử lại
          </Button>
        </span>
      )}
    </div>
  );
}
