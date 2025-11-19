import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import {
  Truck,
  Activity,
  AlertTriangle,
  Megaphone,
} from "lucide-react";

const formatNumber = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
};

const statAccent: Record<
  string,
  { ring: string; badge: string; iconBg: string; iconColor: string }
> = {
  total: {
    ring: "ring-primary/30",
    badge: "text-primary bg-primary/10",
    iconBg: "bg-gradient-to-br from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  active: {
    ring: "ring-secondary/30",
    badge: "text-secondary bg-secondary/10",
    iconBg: "bg-gradient-to-br from-secondary/20 to-secondary/5",
    iconColor: "text-secondary",
  },
  alerts: {
    ring: "ring-amber-400/30",
    badge: "text-amber-500 bg-amber-100",
    iconBg: "bg-gradient-to-br from-amber-200/40 to-amber-100/10",
    iconColor: "text-amber-500",
  },
  complaints: {
    ring: "ring-rose-400/30",
    badge: "text-rose-500 bg-rose-100",
    iconBg: "bg-gradient-to-br from-rose-200/40 to-rose-100/10",
    iconColor: "text-rose-500",
  },
};

export function DashboardStats() {
  const { shipments, alerts } = useAppStore();

  const totalShipments = shipments.length;
  const activeShipments = shipments.filter((shipment) =>
    ["IN_TRANSIT", "PREPARING"].includes(shipment.status),
  ).length;
  const activeAlerts = alerts.filter((alert) => !alert.acknowledged).length;
  const complaintCount = alerts.filter((alert) =>
    ["CRITICAL", "EMERGENCY"].includes(alert.level) ||
    alert.type === "RECALL",
  ).length;

  const stats = [
    {
      key: "total",
      title: "Total Shipments",
      value: totalShipments,
      subtext: "Tracked consignments",
      delta: "+12% this month",
      icon: Truck,
    },
    {
      key: "active",
      title: "Active Shipments",
      value: activeShipments,
      subtext: "Moving through cold-chain",
      delta: "3 ETA updates today",
      icon: Activity,
    },
    {
      key: "alerts",
      title: "Active Alerts",
      value: activeAlerts,
      subtext: "Require immediate attention",
      delta: "2 critical",
      icon: AlertTriangle,
    },
    {
      key: "complaints",
      title: "Regulatory Complaints",
      value: complaintCount,
      subtext: "Escalated by partners",
      delta: "0 unresolved",
      icon: Megaphone,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const theme = statAccent[stat.key] ?? statAccent.total;
        return (
          <Card
            key={stat.key}
            className={`relative overflow-hidden border-none bg-card/90 shadow-card ring-1 ${theme.ring}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/10 to-background/5" />
            <CardHeader className="relative flex flex-col gap-3 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${theme.badge}`}
                >
                  Live
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-2xl p-3 ${theme.iconBg} shadow-inner`}
                >
                  <Icon className={`h-6 w-6 ${theme.iconColor}`} />
                </div>
                <div>
                  <p className="text-3xl font-semibold text-foreground">
                    {formatNumber(stat.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative border-t border-dashed border-border/60 pt-4">
              <p className="text-xs font-medium text-foreground">
                {stat.delta}
              </p>
              <p className="text-xs text-muted-foreground">
                Updated {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
