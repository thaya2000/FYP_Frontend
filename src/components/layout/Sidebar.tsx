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
  Menu,
  X,
  Users,
  Warehouse,
  MapPin,
  UserPlus,
  Archive,
  Tag,
  ChevronDown,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";

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
  const { role } = useAppStore();
  const userRole = role ?? "GUEST"; // ✅ fallback for null
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 🧭 Role-based navigation items
  const getNavigationItems = () => {
    switch (userRole) {
      case "ADMIN":
        return [{ path: "/users", label: "Manage Users", icon: Users }];

      case "MANUFACTURER":
        return [
          { path: "/", label: "Dashboard", icon: LayoutDashboard },
          {
            type: "group",
            key: "manage-products",
            label: "Manage Products",
            icon: PlusCircle,
            children: [
              {
                path: "/products/create?tab=packages",
                label: "Packages",
                icon: Package,
              },
              {
                path: "/products/create?tab=batches",
                label: "Batches",
                icon: Archive,
              },
              {
                path: "/products/create?tab=products",
                label: "Products",
                icon: Package,
              },
              {
                path: "/products/create?tab=categories",
                label: "Product Categories",
                icon: Tag,
              },
            ],
          },
          { path: "/qr-scan", label: "QR Scanner", icon: QrCode },
          // { path: "/checkpoints", label: "Checkpoints", icon: MapPin },
          { path: "/handover", label: "Shipments", icon: Truck },
          // { path: "/analytics", label: "Analytics", icon: BarChart3 },
          { path: "/settings", label: "Settings", icon: Settings },
          // { path: "/register", label: "Register", icon: UserPlus },
        ];

      case "SUPPLIER":
        return [
          { path: "/", label: "Dashboard", icon: LayoutDashboard },
          // { path: "/checkpoints", label: "Checkpoints", icon: MapPin },
          { path: "/handover", label: "Shipments", icon: Truck },
          { path: "/settings", label: "Settings", icon: Settings },
          // { path: "/register", label: "Register", icon: UserPlus },
        ];

      case "WAREHOUSE":
        return [
          // { path: "/", label: "Dashboard", icon: LayoutDashboard },
          // { path: "/inventory", label: "Inventory", icon: Warehouse },
          // { path: "/checkpoints", label: "Checkpoints", icon: MapPin },
          // { path: "/handover", label: "Receive / Dispatch", icon: Truck },
          { path: "/qr-scan", label: "QR Scanner", icon: QrCode },
          { path: "/settings", label: "Settings", icon: Settings },
          // { path: "/register", label: "Register", icon: UserPlus },
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
          if (item.type === "group") {
            const isExpanded = expandedItems.has(item.key);
            const hasActiveChild = item.children.some((child) => {
              const [path, query] = child.path.split("?");
              const tab = query.split("=")[1];
              return (
                location.pathname === path && searchParams.get("tab") === tab
              );
            });
            return (
              <div key={item.key}>
                <Button
                  onClick={() => {
                    setExpandedItems((prev) => {
                      const newSet = new Set(prev);
                      if (newSet.has(item.key)) newSet.delete(item.key);
                      else newSet.add(item.key);
                      return newSet;
                    });
                    navigate(item.children[0].path);
                  }}
                  variant={hasActiveChild ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11 transition-all duration-200",
                    hasActiveChild
                      ? "bg-primary/10 text-primary border border-primary/20 glow-primary"
                      : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 ml-auto transition-transform",
                        isExpanded ? "rotate-180" : ""
                      )}
                    />
                  )}
                </Button>
                {isExpanded && !collapsed && (
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => {
                      const Icon = child.icon;
                      const [path, query] = child.path.split("?");
                      const tab = query.split("=")[1];
                      const isActive =
                        location.pathname === path &&
                        searchParams.get("tab") === tab;
                      return (
                        <Button
                          key={child.path}
                          onClick={() => navigate(child.path)}
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3 h-10 transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary border border-primary/20 glow-primary"
                              : "text-muted-foreground hover:text-primary"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{child.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } else {
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
          }
        })}
      </div>

    </div>
  );
}
