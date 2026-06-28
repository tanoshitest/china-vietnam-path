import { useCallback, useEffect } from "react";
import { useTmsDataRefresh } from "@/lib/use-tms-data-refresh";

/** Hiển thị local ngay, đồng bộ cloud ở nền; tránh gọi load trùng khi mount. */
export function useTmsPageLoader(
  hydrateFromLocal: () => void,
  syncFromRemote: () => void | Promise<void>,
): void {
  const reload = useCallback(() => {
    hydrateFromLocal();
    void syncFromRemote();
  }, [hydrateFromLocal, syncFromRemote]);

  useEffect(() => {
    reload();
  }, [reload]);

  useTmsDataRefresh(hydrateFromLocal);
}
