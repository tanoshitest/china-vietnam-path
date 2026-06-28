import { useEffect } from "react";
import { TMS_DATA_UPDATED_EVENT } from "@/lib/tms-sync";

export function useTmsDataRefresh(refresh: () => void | Promise<void>): void {
  useEffect(() => {
    const handler = () => {
      void refresh();
    };
    window.addEventListener(TMS_DATA_UPDATED_EVENT, handler);
    return () => window.removeEventListener(TMS_DATA_UPDATED_EVENT, handler);
  }, [refresh]);
}
