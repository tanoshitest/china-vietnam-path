import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { getClientProfileById, getLocalCustomers, loadAllCustomers } from "@/lib/customer-storage";

export type AppRole = "admin" | "client";

export type ClientProfile = {
  id: string;
  name: string;
};

const STORAGE_KEY = "viet_thao_app_role";

export const DEMO_CLIENT: ClientProfile = {
  id: "KH001",
  name: "NGUYEN TIEN MINH",
};

const CLIENT_ALLOWED_PATHS = ["/orders"];

type AppRoleContextValue = {
  role: AppRole;
  setRole: (role: AppRole) => void;
  isAdmin: boolean;
  isClient: boolean;
  client: ClientProfile;
};

const AppRoleContext = createContext<AppRoleContextValue | null>(null);

const getStoredRole = (): AppRole => {
  if (typeof window === "undefined") return "admin";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "client" ? "client" : "admin";
};

const readClientProfile = (): ClientProfile => {
  if (typeof window === "undefined") return DEMO_CLIENT;
  return getClientProfileById(DEMO_CLIENT.id);
};

export function AppRoleProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [role, setRoleState] = useState<AppRole>(() => getStoredRole());
  const [client, setClient] = useState<ClientProfile>(() => readClientProfile());

  useEffect(() => {
    void loadAllCustomers().then(() => {
      setClient(getClientProfileById(DEMO_CLIENT.id));
    });
  }, []);

  const setRole = (nextRole: AppRole) => {
    setRoleState(nextRole);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, nextRole);
      setClient(getClientProfileById(DEMO_CLIENT.id));
    }
    if (nextRole === "client") {
      navigate({ to: "/orders" });
    } else {
      navigate({ to: "/" });
    }
  };

  useEffect(() => {
    if (role !== "client") return;
    const onOrdersDetail = pathname.startsWith("/orders/") && pathname !== "/orders";
    const allowed = CLIENT_ALLOWED_PATHS.includes(pathname) || onOrdersDetail;
    if (!allowed) {
      navigate({ to: "/orders" });
    }
  }, [role, pathname, navigate]);

  const value = useMemo(
    () => ({
      role,
      setRole,
      isAdmin: role === "admin",
      isClient: role === "client",
      client,
    }),
    [role, client],
  );

  return <AppRoleContext.Provider value={value}>{children}</AppRoleContext.Provider>;
}

export function useAppRole() {
  const context = useContext(AppRoleContext);
  if (!context) {
    throw new Error("useAppRole must be used within AppRoleProvider");
  }
  return context;
}

export function orderBelongsToClient(
  order: { clientId?: string; client?: string },
  client: ClientProfile,
): boolean {
  if (order.clientId && order.clientId === client.id) return true;
  return order.client === client.name;
}

export function getStoredCustomersForLegacy(): ReturnType<typeof getLocalCustomers> {
  return getLocalCustomers();
}
