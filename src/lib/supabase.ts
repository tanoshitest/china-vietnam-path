import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl !== "https://your-project.supabase.co";

export const supabase = createClient<Database>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);

export const TMS_CLOUD_STATUS_EVENT = "tms-cloud-status";

export type CloudStatus = "syncing" | "online" | "offline";

let cloudStatus: CloudStatus = isSupabaseConfigured ? "syncing" : "offline";

export function getCloudStatus(): CloudStatus {
  return cloudStatus;
}

export function emitCloudStatus(status: CloudStatus): void {
  cloudStatus = status;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TMS_CLOUD_STATUS_EVENT, { detail: status }));
}
