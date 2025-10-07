import { Bell, Settings, User, Package, Truck, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

export function Header() {
  const { user, unreadAlertsCount } = useAppStore();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'MANUFACTURER': return Package;
      case 'TRANSPORTER': return Truck;
      case 'WAREHOUSE': return Warehouse;
      case 'WHOLESALER': return Package;
      case 'RETAILER': return Package;
      case 'END_USER': return User;
      default: return User;
    }
  };

  const RoleIcon = user ? getRoleIcon(user.role) : User;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TrackChain</h1>
              <p className="text-xs text-muted-foreground">Supply Chain DApp</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted/50">
              <RoleIcon className="w-4 h-4 text-primary" />
              <div className="text-sm">
                <p className="font-medium">{user.displayName || 'User'}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
          )}

          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadAlertsCount}
              </Badge>
            )}
          </Button>

          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>

          {/* <Button size="sm" className="bg-gradient-primary text-white border-0 hover:opacity-90">
              Connect Wallet
            </Button> */}
        </div>
      </div>
    </header>
  );
}