import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Truck,
  QrCode,
  Settings,
  BarChart3,
  PlusCircle,
  LogOut,
  Menu,
  X,
  Users,
  Warehouse,
  UserPlus,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useLocation, useNavigate } from "react-router-dom";

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  setCollapsed?: (value: boolean) => void;
}

export function Sidebar({
  className,
  collapsed = false,
  setCollapsed,
}: SidebarProps) {
  const { role, logout } = useAppStore();
  const userRole = role ?? "GUEST"; // ✅ fallback for null
  const location = useLocation();
  const navigate = useNavigate();

  // 🧭 Role-based navigation items
  const getNavigationItems = () => {
    switch (userRole) {
      case "ADMIN":
        return [{ path: "/users", label: "Manage Users", icon: Users }];

      case "MANUFACTURER":
        return [
          { path: "/", label: "Dashboard", icon: LayoutDashboard },
          { path: "/products", label: "Products", icon: Package },
          { path: "/products/create", label: "Create Product", icon: PlusCircle },
          { path: "/handover", label: "Distribute", icon: Truck },
          { path: "/analytics", label: "Analytics", icon: BarChart3 },
          { path: "/settings", label: "Settings", icon: Settings },
          { path: "/register", label: "Register", icon: UserPlus },
        ];

      case "SUPPLIER":
        return [
          { path: "/", label: "Dashboard", icon: LayoutDashboard },
          { path: "/handover", label: "Supply", icon: Truck },
          { path: "/products", label: "Products", icon: Package },
          { path: "/settings", label: "Settings", icon: Settings },
          { path: "/register", label: "Register", icon: UserPlus },
        ];

      case "WAREHOUSE":
        return [
          { path: "/", label: "Dashboard", icon: LayoutDashboard },
          { path: "/inventory", label: "Inventory", icon: Warehouse },
          { path: "/handover", label: "Receive / Dispatch", icon: Truck },
          { path: "/settings", label: "Settings", icon: Settings },
          { path: "/register", label: "Register", icon: UserPlus },
        ];

      case "USER":
        return [
          { path: "/qr-scan", label: "QR Scanner", icon: QrCode },
          { path: "/register", label: "Register", icon: UserPlus },
        ];

      default:
        return [
          { path: "/qr-scan", label: "QR Scanner", icon: QrCode },
          { path: "/register", label: "Register", icon: UserPlus },
        ];
    }
  };

  const navigationItems = getNavigationItems();

  const handleLogout = () => {
    try {
      logout();
      localStorage.removeItem("supply-chain-store");
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-15 h-[calc(100vh-3.75rem)] bg-card border-r shadow-md flex flex-col z-50 transition-all duration-300",
        collapsed ? "w-20" : "w-64",
        className
      )}

    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <h2 className="font-semibold text-lg">
            {userRole !== "GUEST" ? `${userRole} Panel` : "Navigation"}
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed && setCollapsed(!collapsed)}
          className="hover:bg-muted"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
      </div>

      {/* Main Scrollable Section */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");

          return (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11 transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 glow-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Button>
          );
        })}
      </div>

      {/* ✅ Logout Section pinned to bottom */}
      <div className="border-t p-3">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </div>
  );
}
