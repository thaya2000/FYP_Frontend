import { useEffect, useMemo, useState } from "react";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import {
  mockProducts,
  mockUsers,
  mockAlerts,
  mockShipments,
  generateMockTelemetry,
} from "@/lib/mock-data";
import type { Alert, Shipment } from "@/types";
import type { SupplierShipmentRecord } from "@/features/handover/types";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  MapPin,
  Clock,
  Activity,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Bus,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  HandoverProvider,
  useSupplierContext,
} from "@/features/handover/context";

const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    products,
    alerts,
    shipments,
    setUser,
    addProduct,
    addAlert,
    addTelemetryPoint,
    addShipment,
    role: persistedRole,
  } = useAppStore();
  const effectiveRole = persistedRole ?? user?.role ?? "MANUFACTURER";

  // Initialize mock data (for demo)
  useEffect(() => {
    if (!user) {
      setUser(mockUsers[0]); // Default manufacturer
    }

    if (products.length === 0) {
      mockProducts.forEach(addProduct);
      mockAlerts.forEach(addAlert);
      mockShipments.forEach(addShipment);
      mockProducts.forEach((product) => {
        const telemetry = generateMockTelemetry(product.id, 12);
        telemetry.forEach((point) => addTelemetryPoint(product.id, point));
      });
    }
  }, [
    user,
    products.length,
    shipments.length,
    setUser,
    addProduct,
    addAlert,
    addTelemetryPoint,
    addShipment,
  ]);

  if (effectiveRole === "SUPPLIER") {
    return (
      <HandoverProvider>
        <SupplierDashboard alerts={alerts} navigate={navigate} />
      </HandoverProvider>
    );
  }

  return (
    <ManufacturerDashboard
      products={products}
      alerts={alerts}
      shipments={shipments}
      navigate={navigate}
    />
  );
};

type ManufacturerDashboardProps = {
  products: typeof mockProducts;
  alerts: Alert[];
  shipments: Shipment[];
  navigate: ReturnType<typeof useNavigate>;
};

const ManufacturerDashboard = ({
  products,
  alerts,
  shipments,
  navigate,
}: ManufacturerDashboardProps) => {
  const activeAlerts = alerts
    .filter((alert) => !alert.acknowledged)
    .slice(0, 4);
  const liveShipments = shipments.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/20 via-background to-background p-6 sm:p-10 shadow-card">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent_55%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="w-fit border-primary/30 text-primary"
            >
              Manufacturer dashboard
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Keep every shipment compliant and on schedule
              </h1>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                Monitor live cold-chain activities, quickly respond to alerts,
                and share updates with partners in real time.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2">
                Open Operations Center <ArrowUpRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/qr-scan")}>
                Scan QR
              </Button>
            </div>
          </div>
          <Card className="w-full max-w-sm border-none bg-background/80 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Live logistics snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On-time rate</p>
                  <p className="text-3xl font-semibold">96%</p>
                </div>
                <Badge className="bg-primary/10 text-primary">
                  +4% vs last week
                </Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>
                    {liveShipments.length} shipments approaching checkpoints
                  </span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Activity className="h-4 w-4 text-secondary" />
                  <span>{activeAlerts.length} alerts awaiting response</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DashboardStats />

      <div className="space-y-6">
        <Card className="border border-border/60 bg-gradient-to-br from-primary/5 via-background to-background shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Live shipments</CardTitle>
            <p className="text-sm text-muted-foreground">
              In-transit consignments needing attention
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveShipments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No shipments in transit. Create one to start tracking.
              </p>
            ) : (
              liveShipments.map((shipment, shipmentIdx) => (
                <div
                  key={`${shipment.id}-${shipmentIdx}`}
                  className="rounded-2xl border border-border/70 bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-semibold">{shipment.id}</div>
                    <Badge variant="outline">
                      {shipment.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Route checkpoints: {shipment.route?.length ?? 0}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ETA:{" "}
                    {shipment.estimatedDelivery
                      ? new Date(shipment.estimatedDelivery).toLocaleString()
                      : "Pending"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-gradient-to-br from-secondary/5 via-background to-background shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active alerts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest compliance signals across your network
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open alerts right now.
              </p>
            ) : (
              activeAlerts.map((alert, alertIdx) => (
                <div
                  key={`${alert.id}-${alertIdx}`}
                  className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3"
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ${alert.level === "CRITICAL"
                      ? "bg-destructive"
                      : alert.level === "WARN"
                        ? "bg-amber-400"
                        : "bg-secondary"
                      }`}
                  />
                  <div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.ts).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

type SupplierDashboardProps = {
  alerts: Alert[];
  navigate: ReturnType<typeof useNavigate>;
};

const SupplierDashboard = ({ alerts, navigate }: SupplierDashboardProps) => {
  const supplier = useSupplierContext();
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedState, setSelectedState] = useState("ALL");
  const [quickAcceptTarget, setQuickAcceptTarget] =
    useState<SupplierShipmentRecord | null>(null);

  const getSegmentReference = (shipment: SupplierShipmentRecord) =>
    shipment.segmentId ?? shipment.id;

  const summaryCards = useMemo(
    () => [
      {
        key: "accepted",
        title: "Accepted",
        value: supplier.shipmentsByStatus.ACCEPTED?.length ?? 0,
        icon: ShieldCheck,
        accent: "from-primary/30 via-primary/5 to-background",
        ring: "ring-primary/20",
        iconTone: "text-primary",
      },
      {
        key: "delivered",
        title: "Delivered",
        value: supplier.shipmentsByStatus.DELIVERED?.length ?? 0,
        icon: CheckCircle2,
        accent: "from-secondary/30 via-secondary/5 to-background",
        ring: "ring-secondary/20",
        iconTone: "text-secondary",
      },
      {
        key: "takenOver",
        title: "Taken Over",
        value: supplier.shipmentsByStatus.IN_TRANSIT?.length ?? 0,
        icon: Bus,
        accent: "from-amber-200/50 via-amber-50 to-background",
        ring: "ring-amber-200/40",
        iconTone: "text-amber-500",
      },
      {
        key: "handedOver",
        title: "Handed Over",
        value: supplier.shipmentsByStatus.CLOSED?.length ?? 0,
        icon: ArrowUpRight,
        accent: "from-emerald-200/50 via-emerald-50 to-background",
        ring: "ring-emerald-200/40",
        iconTone: "text-emerald-600",
      },
    ],
    [supplier.shipmentsByStatus]
  );

  const pendingShipments = supplier.shipmentsByStatus.PENDING ?? [];

  useEffect(() => {
    setSelectedState("ALL");
  }, [selectedCountry]);

  const locationMetadata = useMemo(() => {
    const countries = new Map<string, Set<string>>();
    pendingShipments.forEach((shipment) => {
      const { country, state } = deriveShipmentLocation(shipment);
      if (!countries.has(country)) countries.set(country, new Set());
      countries.get(country)!.add(state);
    });
    return {
      countries: Array.from(countries.keys()).sort(),
      statesByCountry: new Map(
        Array.from(countries.entries()).map(([country, states]) => [
          country,
          Array.from(states).sort(),
        ])
      ),
    };
  }, [pendingShipments]);

  const stateOptions =
    selectedCountry === "ALL"
      ? Array.from(
        new Set(
          pendingShipments.map(
            (shipment) => deriveShipmentLocation(shipment).state ?? "Unknown"
          )
        )
      ).sort()
      : locationMetadata.statesByCountry.get(selectedCountry) ?? [];

  const quickAcceptMatches = useMemo(() => {
    return pendingShipments.filter((shipment) => {
      const { country, state } = deriveShipmentLocation(shipment);
      const countryOk =
        selectedCountry === "ALL" || country === selectedCountry;
      const stateOk = selectedState === "ALL" || state === selectedState;
      return countryOk && stateOk;
    });
  }, [pendingShipments, selectedCountry, selectedState]);

  const quickAcceptSegmentId = quickAcceptTarget
    ? String(getSegmentReference(quickAcceptTarget))
    : null;
  const quickAcceptBusy =
    quickAcceptSegmentId !== null &&
    supplier.acceptShipmentPending &&
    supplier.acceptingShipmentId === quickAcceptSegmentId;

  const handleQuickAccept = () => {
    try {
      if (!quickAcceptTarget) return;

      supplier.acceptShipment(String(getSegmentReference(quickAcceptTarget)));
    } catch (error) {
      console.error("Error in handleQuickAccept:", error);
    }
    setQuickAcceptTarget(null);
  };

  const activeAlerts = alerts.filter((alert) => !alert.acknowledged);

  if (!supplier.enabled) {
    return (
      <div className="rounded-3xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
        Supplier workflows are not available for this account.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-secondary/10 via-background to-background p-6 sm:p-10 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Badge
              variant="outline"
              className="w-fit border-secondary/40 text-secondary"
            >
              Supplier dashboard
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Accept, track, and hand over consignments faster
              </h1>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                Monitor consignments requiring acceptance, keep an eye on
                movements, and stay ahead of alerts.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2" onClick={() => navigate("/shipment")}>
              Open handovers <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/qr-scan")}>
              Scan QR
            </Button>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              className={`border-none bg-gradient-to-br ${card.accent} shadow-card ring-1 ${card.ring}`}
            >
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {card.value}
                  </p>
                </div>
                <span className="rounded-2xl bg-background/70 p-3 shadow-inner">
                  <Icon className={`h-5 w-5 ${card.iconTone}`} />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="border border-border/70 bg-gradient-to-r from-background via-muted/30 to-background shadow-card">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Quick acceptance
              </p>
              <p className="text-lg font-semibold text-foreground">
                Locate consignments and accept in one step
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={selectedCountry}
                onValueChange={setSelectedCountry}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Choose country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All countries</SelectItem>
                  {locationMetadata.countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger
                  className="w-56"
                  disabled={stateOptions.length === 0}
                >
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All states</SelectItem>
                  {stateOptions.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {quickAcceptMatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/80 p-6 text-center text-sm text-muted-foreground">
              No consignments match the selected filters.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {quickAcceptMatches.slice(0, 4).map((shipment) => {
                const location = deriveShipmentLocation(shipment);
                const etaText = shipment.expectedArrival
                  ? formatDistanceToNow(new Date(shipment.expectedArrival), {
                    addSuffix: true,
                  })
                  : "ETA unavailable";
                const segmentIdentifier = getSegmentReference(shipment);
                return (
                  <div
                    key={segmentIdentifier}
                    className="space-y-3 rounded-2xl border border-border/70 bg-gradient-to-br from-background via-muted/40 to-background p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-foreground">
                          {shipment.destinationPartyName ?? "Consignment"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Segment {segmentIdentifier}
                        </p>
                      </div>
                      <Badge variant="outline">{etaText}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span>
                          {location.state}, {location.country}
                        </span>
                      </div>
                      {shipment.destinationCheckpoint ? (
                        <div className="flex items-center gap-2">
                          <Truck className="h-3 w-3 text-secondary" />
                          <span>{shipment.destinationCheckpoint}</span>
                        </div>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setQuickAcceptTarget(shipment)}
                    >
                      Review & Accept
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(quickAcceptTarget)}
        onOpenChange={(open) => (!open ? setQuickAcceptTarget(null) : null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Accept consignment</DialogTitle>
            <DialogDescription>
              Verify the details and confirm acceptance.
            </DialogDescription>
          </DialogHeader>
          {quickAcceptTarget ? (
            <div className="space-y-4 py-2 text-sm">
              <div className="rounded-lg border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-3">
                <p className="font-semibold text-foreground">
                  {quickAcceptTarget.destinationPartyName ?? "Consignment"}
                </p>
                <p className="text-muted-foreground">
                  Segment {String(getSegmentReference(quickAcceptTarget))}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    From
                  </p>
                  <p className="font-medium text-foreground">
                    {quickAcceptTarget.pickupArea ??
                      quickAcceptTarget.originArea ??
                      "Unknown location"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    To
                  </p>
                  <p className="font-medium text-foreground">
                    {quickAcceptTarget.dropoffArea ??
                      quickAcceptTarget.destinationArea ??
                      "Unknown location"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setQuickAcceptTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickAccept}
              disabled={!quickAcceptTarget || quickAcceptBusy}
            >
              {quickAcceptBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Accepting...
                </span>
              ) : (
                "Accept shipment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const parseAreaTokens = (value?: string) => {
  if (!value) return { state: undefined, country: undefined };
  const tokens = value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return { state: undefined, country: undefined };
  return {
    state: tokens[0],
    country: tokens[tokens.length - 1],
  };
};

const deriveShipmentLocation = (shipment: SupplierShipmentRecord) => {
  const start = shipment.startCheckpoint ?? {};
  const end = shipment.endCheckpoint ?? {};
  const pickup = parseAreaTokens(shipment.pickupArea ?? shipment.originArea);
  const dropoff = parseAreaTokens(
    shipment.dropoffArea ?? shipment.destinationArea
  );
  const country =
    start.country ??
    end.country ??
    dropoff.country ??
    pickup.country ??
    "Unknown";
  const state =
    start.state ?? end.state ?? dropoff.state ?? pickup.state ?? "Unknown";
  return { country, state };
};

export default Index;
