import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  AlertTriangle, 
  QrCode,
  Settings,
  Map,
  BarChart3
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface SidebarProps {
  className?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ className, activeTab, onTabChange }: SidebarProps) {
  const { user } = useAppStore();

  const getNavigationItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'products', label: 'Products', icon: Package },
      { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
      { id: 'tracking', label: 'Live Tracking', icon: Map },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];

    // Add role-specific items
    if (user?.role === 'MANUFACTURER') {
      baseItems.splice(2, 0, { id: 'create', label: 'Create Product', icon: Package });
    }

    if (user?.role === 'SUPPLIER') {
      baseItems.splice(2, 0, { id: 'supply', label: 'Supply Materials', icon: Truck });
    }

    if (user?.role === 'TRANSPORTER') {
      baseItems.splice(2, 0, { id: 'shipments', label: 'Shipments', icon: Truck });
    }

    baseItems.push(
      { id: 'qr-scan', label: 'QR Scanner', icon: QrCode },
      { id: 'settings', label: 'Settings', icon: Settings }
    );

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <div className={cn("flex flex-col w-64 bg-card border-r h-full", className)}>
      <div className="p-6">
        <h2 className="font-semibold text-lg mb-6">Navigation</h2>
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11",
                  isActive && "bg-primary/10 text-primary border border-primary/20 glow-primary"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}