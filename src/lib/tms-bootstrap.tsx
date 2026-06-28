import { useEffect, useState } from "react";
import { initTmsAutoSync, refreshAllTmsData } from "@/lib/tms-sync";
import {
  emitCloudStatus,
  isSupabaseConfigured,
  type CloudStatus,
} from "@/lib/supabase";
import { probeSupabaseOrders } from "@/lib/supabase-health";

const MAX_WAIT_MS = 12000;

async function syncFromCloud(): Promise<CloudStatus> {
  await refreshAllTmsData({ silent: false, force: true });
  const probe = await probeSupabaseOrders();
  return probe.reachable ? "online" : "offline";
}

/** Chờ đồng bộ cloud (tối đa ~12s), sau đó luôn mở app — không chặn cứng. */
export function TmsBootstrapGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const stop = initTmsAutoSync({ skipInitialRefresh: true });
    let cancelled = false;

    const finish = (status: CloudStatus) => {
      if (cancelled) return;
      emitCloudStatus(status);
      setReady(true);
    };

    const run = async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const status = await syncFromCloud();
        if (status === "online") {
          finish("online");
          return;
        }
        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
      finish("offline");
    };

    const timeoutId = window.setTimeout(() => finish("offline"), MAX_WAIT_MS);
    void run().finally(() => window.clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      stop();
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return children;
}
