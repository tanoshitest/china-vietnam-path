import { loadAllOrders } from "@/lib/order-storage";
import { loadAllProducts } from "@/lib/product-storage";
import { loadAllCustomers } from "@/lib/customer-storage";
import { loadAllSuppliers } from "@/lib/supplier-storage";
import { loadAllDebts } from "@/lib/debt-storage";
import { loadAllUsers } from "@/lib/user-storage";
import { loadAllCostTypes } from "@/lib/cost-type-storage";
import { loadAllCashflowVouchers } from "@/lib/cashflow-storage";

let preloadPromise: Promise<void> | null = null;

/** Tải toàn bộ dữ liệu từ Supabase (hoặc local) vào cache localStorage. */
export async function preloadTmsData(options?: { force?: boolean }): Promise<void> {
  if (options?.force) preloadPromise = null;
  if (preloadPromise && !options?.force) return preloadPromise;

  preloadPromise = (async () => {
    await Promise.all([
      loadAllOrders(options),
      loadAllProducts(options),
      loadAllCustomers(options),
      loadAllSuppliers(options),
      loadAllDebts(options),
      loadAllUsers(options),
      loadAllCostTypes(options),
      loadAllCashflowVouchers(options),
    ]);
  })();

  return preloadPromise;
}

export function resetPreloadCache(): void {
  preloadPromise = null;
}
