import {
  Bell,
  Settings,
  User,
  Package,
  Truck,
  Warehouse,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { useDisconnect } from "wagmi";
import { NotificationBell } from "@/components/NotificationBell";

interface HeaderProps {
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export function Header({ onMenuClick, isMobile = false }: HeaderProps) {
  const { user, unreadAlertsCount, logout, role } = useAppStore();
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();

  const handleLogout = () => {
    logout();
    disconnect();
    navigate("/login");
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "MANUFACTURER":
        return Package;
      case "TRANSPORTER":
        return Truck;
      case "WAREHOUSE":
        return Warehouse;
      case "WHOLESALER":
        return Package;
      case "RETAILER":
        return Package;
      case "END_USER":
        return User;
      default:
        return User;
    }
  };

  const RoleIcon = user ? getRoleIcon(user.role) : User;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Hamburger menu for mobile */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="mr-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Package className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold">TrackChain</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                Supply Chain DApp
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {user && (
            <div className="flex items-center space-x-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-muted/50">
              <RoleIcon className="w-4 h-4 text-primary" />
              {!isMobile && (
                <div className="text-sm">
                  <p className="font-medium">{role || "User"}</p>
                </div>
              )}
            </div>
          )}

          {/* Real-time Notifications */}
          <NotificationBell />

          {!isMobile && (
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size={isMobile ? "icon" : "sm"}
            onClick={handleLogout}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            {!isMobile && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>
    </header>
  );
}
