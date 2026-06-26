import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Search,
  Truck,
  Users,
  ShoppingBag,
  Wallet,
  UserCog,
  History,
  Receipt,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAppRole, type AppRole } from "@/lib/app-role";

type NavItemType = { to: string; label: string; icon: React.ElementType };

const overviewItem: NavItemType = {
  to: "/",
  label: "Tổng Quan",
  icon: LayoutDashboard,
};

const adminNavGroups = [
  {
    label: "Quản lý Vận Đơn",
    items: [
      { to: "/orders", label: "Quản lý Vận đơn", icon: Package },
      { to: "/tracking", label: "Tra Cứu vận đơn", icon: Search },
    ],
  },
  {
    label: "Quản lý Danh mục",
    items: [
      { to: "/suppliers", label: "Quản lý nhà cung cấp", icon: Truck },
      { to: "/customers", label: "Quản lý khách hàng", icon: Users },
      { to: "/products", label: "Quản lý Sản phẩm", icon: ShoppingBag },
    ],
  },
  {
    label: "Quản lý công nợ",
    items: [
      { to: "/vendors?kind=Phải thu", label: "Công nợ phải thu", icon: Wallet },
      { to: "/vendors?kind=Phải trả", label: "Công nợ phải trả", icon: Wallet },
      { to: "/vendors?kind=Cập nhật chi phí", label: "Cập Nhật Chi phí", icon: Receipt },
    ],
  },
  {
    label: "Cấu hình",
    items: [
      { to: "/users", label: "Quản lý người dùng", icon: UserCog },
      { to: "/logs", label: "Lịch sử hệ thống", icon: History },
    ],
  },
];

function NavItem({
  item,
  pathname,
  searchStr,
}: {
  item: NavItemType;
  pathname: string;
  searchStr: string;
}) {
  const [path, query = ""] = item.to.split("?");
  const pathMatches = pathname === path || pathname.startsWith(path + "/");
  let active = pathMatches && !query;

  if (pathMatches && query) {
    const expected = new URLSearchParams(query);
    const current = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
    active = [...expected.entries()].every(([key, value]) => current.get(key) === value);
  }

  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium leading-tight transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const { role, setRole, isAdmin, isClient, client } = useAppRole();

  const displayName = isClient ? client.name : "Nguyễn Văn An";
  const displayRole = isClient ? "Khách hàng" : "Quản trị viên";
  const initials = isClient
    ? client.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "NA";

  const isClientOrdersList = isClient && pathname === "/orders";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {isAdmin && (
        <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Truck className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold leading-tight text-slate-900">Sợi Vàng Textile</div>
              <div className="truncate text-[10px] leading-tight text-slate-500">Logistics</div>
            </div>
          </div>

          <nav className="min-h-0 flex-1 space-y-1.5 overflow-hidden px-2 py-1.5">
            <div>
              <NavItem item={overviewItem} pathname={pathname} searchStr={searchStr} />
            </div>
            {adminNavGroups.map((group) => (
              <div key={group.label}>
                <div className="px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.label}
                </div>
                <div>
                  {group.items.map((item) => (
                    <NavItem key={item.to} item={item} pathname={pathname} searchStr={searchStr} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-slate-200 px-3 py-2 text-[10px] text-slate-400">
            Prototype by Tanoshivietnam
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex min-w-0 items-center gap-3">
            {isClient && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary">
                <Truck className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-slate-900">
                {isClient ? "Sợi Vàng Textile Logistics" : "Hệ thống Quản lý Vận chuyển"}
              </h1>
              <p className="text-xs text-slate-500">
                {isClient ? "Vận đơn của tôi" : "Tuyến Trung Quốc – Việt Nam"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
              <SelectTrigger className="h-9 w-[120px] text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin" className="text-xs">
                  Admin
                </SelectItem>
                <SelectItem value="client" className="text-xs">
                  Client
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-right">
              <div className="max-w-[180px] truncate text-sm font-medium text-slate-900">{displayName}</div>
              <div className="text-xs text-slate-500">{displayRole}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </div>
          </div>
        </header>
        <main
          className={cn(
            "flex-1",
            isClientOrdersList ? "overflow-hidden" : "overflow-y-auto",
            isClient ? "p-4" : "p-6"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
