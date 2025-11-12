import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CalendarClock,
  Bus,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { handoverUtils, useHandoverSharedContext, useSupplierContext } from "../context";
import type { SupplierShipmentRecord, SupplierShipmentStatus } from "../types";
import { ViewShipmentButton } from "./ViewShipmentButton";
import { formatDistanceToNow } from "date-fns";

const {
  extractShipmentItems,
  supplierStatusBadgeClass,
  normalizeStatus,
  formatArrivalText,
  humanizeSupplierStatus,
} = handoverUtils;

const shipmentDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type IconType = typeof Clock;

type StatusConfig = {
  label: string;
  title: string;
  description: string;
  loadingTitle: string;
  loadingDescription: string;
  emptyTitle: string;
  emptyFilteredTitle: string;
  emptyDescription: string;
  icon: IconType;
};

const STATUS_CONFIG: Record<SupplierShipmentStatus, StatusConfig> = {
  PENDING: {
    label: "Pending",
    title: "Pending consignments",
    description: "Review shipment details and accept once contents are verified.",
    loadingTitle: "Loading pending consignments",
    loadingDescription: "Fetching consignments awaiting your acceptance.",
    emptyTitle: "No pending consignments",
    emptyFilteredTitle: "No pending consignments in this area",
    emptyDescription: "Shipments waiting for acceptance will appear here.",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Accepted",
    title: "Accepted consignments",
    description: "Plan the next actions for consignments you have accepted.",
    loadingTitle: "Loading accepted consignments",
    loadingDescription: "Fetching accepted consignments.",
    emptyTitle: "No accepted consignments",
    emptyFilteredTitle: "No accepted consignments in this area",
    emptyDescription: "Accepted consignments will show up once the manufacturer confirms your handover.",
    icon: ShieldCheck,
  },
  IN_TRANSIT: {
    label: "In transit",
    title: "In-transit consignments",
    description: "Track consignments moving through logistics checkpoints.",
    loadingTitle: "Loading in-transit consignments",
    loadingDescription: "Fetching consignments currently on the move.",
    emptyTitle: "No consignments in transit",
    emptyFilteredTitle: "No in-transit consignments in this area",
    emptyDescription: "Once consignments leave your custody they will be tracked here.",
    icon: Truck,
  },
  DELIVERED: {
    label: "Delivered",
    title: "Delivered consignments",
    description: "Confirm deliveries as they arrive at their destinations.",
    loadingTitle: "Loading delivered consignments",
    loadingDescription: "Fetching consignments marked as delivered.",
    emptyTitle: "No delivered consignments",
    emptyFilteredTitle: "No delivered consignments in this area",
    emptyDescription: "Completed consignments will appear here for final confirmation.",
    icon: CheckCircle2,
  },
  CLOSED: {
    label: "Closed",
    title: "Closed consignments",
    description: "Review closed consignments and download records when needed.",
    loadingTitle: "Loading closed consignments",
    loadingDescription: "Fetching consignments that have been closed.",
    emptyTitle: "No closed consignments",
    emptyFilteredTitle: "No closed consignments in this area",
    emptyDescription: "Recently closed consignments will show up here.",
    icon: CalendarClock,
  },
  CANCELLED: {
    label: "Cancelled",
    title: "Cancelled consignments",
    description: "Review consignments that were cancelled or rejected.",
    loadingTitle: "Loading cancelled consignments",
    loadingDescription: "Fetching consignments that were cancelled.",
    emptyTitle: "No cancelled consignments",
    emptyFilteredTitle: "No cancelled consignments in this area",
    emptyDescription: "Cancelled consignments will be listed here for audit trails.",
    icon: XCircle,
  },
};

export function SupplierSection() {
  const shared = useHandoverSharedContext();
  const supplier = useSupplierContext();

  if (!supplier.enabled || shared.role !== "SUPPLIER") {
    return null;
  }

  const hasAreaFilter = supplier.areaQuery.trim().length > 0;
  const [takeoverDialogOpen, setTakeoverDialogOpen] = useState(false);
  const [takeoverTarget, setTakeoverTarget] = useState<SupplierShipmentRecord | null>(null);
  const [takeoverForm, setTakeoverForm] = useState({ latitude: "", longitude: "" });
  const getSegmentReference = (shipment: SupplierShipmentRecord) => shipment.segmentId ?? shipment.id;
  const statusOrder = supplier.statusOrder;
  const defaultTab = statusOrder[0] ?? "PENDING";
  const takeoverSegmentIdentifier = takeoverTarget ? getSegmentReference(takeoverTarget) : null;
  const takeoverBusy =
    takeoverSegmentIdentifier !== null &&
    supplier.takeoverPending &&
    supplier.takeoverSegmentId === takeoverSegmentIdentifier;
  const takeoverDisabled =
    takeoverForm.latitude.trim().length === 0 ||
    takeoverForm.longitude.trim().length === 0 ||
    takeoverBusy;

  const openHandoverDialog = (shipment: SupplierShipmentRecord) => {
    supplier.setHandoverTarget(shipment);
    supplier.setHandoverDialogOpen(true);
  };

  const openTakeoverDialog = (shipment: SupplierShipmentRecord) => {
    setTakeoverTarget(shipment);
    setTakeoverForm({ latitude: "", longitude: "" });
    setTakeoverDialogOpen(true);
  };

  const closeTakeoverDialog = () => {
    setTakeoverDialogOpen(false);
    setTakeoverTarget(null);
    setTakeoverForm({ latitude: "", longitude: "" });
  };

  const handleTakeoverDialogChange = (open: boolean) => {
    if (!open) {
      closeTakeoverDialog();
    } else {
      setTakeoverDialogOpen(true);
    }
  };

  const handleDownloadProof = (shipment: SupplierShipmentRecord) => {
    toast.info(`Downloading records for segment ${getSegmentReference(shipment)} (demo).`);
  };

  const handleReportIssue = (shipment: SupplierShipmentRecord) => {
    toast.info(`Support has been notified about segment ${getSegmentReference(shipment)}.`);
  };

  const handleConfirmTakeover = async () => {
    if (!takeoverTarget) return;
    const latitude = Number(takeoverForm.latitude);
    const longitude = Number(takeoverForm.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      toast.error("Provide valid latitude and longitude values.");
      return;
    }
    try {
      await supplier.takeoverSegment(String(getSegmentReference(takeoverTarget)), {
        latitude,
        longitude,
      });
      closeTakeoverDialog();
    } catch {
      // errors handled via context mutation toast
    }
  };

  const actionContext: SupplierActionContext = {
    supplier,
    openHandoverDialog,
    openTakeoverDialog,
    handleDownloadProof,
    handleReportIssue,
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-2">
          {statusOrder.map((status) => {
            const config = STATUS_CONFIG[status];
            return (
              <TabsTrigger
                key={status}
                value={status}
                className="flex-1 min-w-[120px] sm:flex-none sm:min-w-[140px]"
              >
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <SupplierSectionFilters
          areaQuery={supplier.areaQuery}
          setAreaQuery={supplier.setAreaQuery}
          hasAreaFilter={hasAreaFilter}
        />

        <SupplierStatusPanels
          statusOrder={statusOrder}
          shipmentsByStatus={supplier.shipmentsByStatus}
          loadingByStatus={supplier.loadingByStatus}
          filterShipmentsByArea={supplier.filterShipmentsByArea}
          hasAreaFilter={hasAreaFilter}
          actionContext={actionContext}
        />
      </Tabs>

      <SupplierHandoverDialog />
      <Dialog open={takeoverDialogOpen} onOpenChange={handleTakeoverDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm segment takeover</DialogTitle>
            <DialogDescription>
              Provide the GPS coordinates where the segment handoff occurred.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Segment ID:{" "}
                <span className="font-medium text-foreground">
                  {takeoverSegmentIdentifier ?? "N/A"}
                </span>
              </p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="takeover-latitude" className="text-sm font-medium">
                Latitude
              </label>
              <Input
                id="takeover-latitude"
                type="number"
                step="any"
                placeholder="e.g., 6.8341"
                value={takeoverForm.latitude}
                onChange={(event) =>
                  setTakeoverForm((prev) => ({ ...prev, latitude: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="takeover-longitude" className="text-sm font-medium">
                Longitude
              </label>
              <Input
                id="takeover-longitude"
                type="number"
                step="any"
                placeholder="e.g., 79.8693"
                value={takeoverForm.longitude}
                onChange={(event) =>
                  setTakeoverForm((prev) => ({ ...prev, longitude: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closeTakeoverDialog} disabled={takeoverBusy}>
              Cancel
            </Button>
            <Button onClick={handleConfirmTakeover} disabled={takeoverDisabled}>
              {takeoverBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Taking over...
                </span>
              ) : (
                "Confirm Takeover"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SupplierSectionFiltersProps = {
  areaQuery: string;
  setAreaQuery: (value: string) => void;
  hasAreaFilter: boolean;
};

function SupplierSectionFilters({ areaQuery, setAreaQuery, hasAreaFilter }: SupplierSectionFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={areaQuery}
          onChange={(event) => setAreaQuery(event.target.value)}
          placeholder="Search by area, checkpoint, or delivery zone"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:justify-end">
        <span className="max-w-xs">
          Filters supplier consignments across all tabs by logistics area.
        </span>
        {hasAreaFilter && (
          <Button variant="ghost" size="sm" onClick={() => setAreaQuery("")}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

type SupplierStatusPanelsProps = {
  statusOrder: SupplierShipmentStatus[];
  shipmentsByStatus: Record<SupplierShipmentStatus, SupplierShipmentRecord[]>;
  loadingByStatus: Record<SupplierShipmentStatus, boolean>;
  filterShipmentsByArea: (shipments: SupplierShipmentRecord[]) => SupplierShipmentRecord[];
  hasAreaFilter: boolean;
  actionContext: SupplierActionContext;
};

const SupplierStatusPanels = ({
  statusOrder,
  shipmentsByStatus,
  loadingByStatus,
  filterShipmentsByArea,
  hasAreaFilter,
  actionContext,
}: SupplierStatusPanelsProps) => (
  <>
    {statusOrder.map((status) => {
      const config = STATUS_CONFIG[status];
      const shipments = shipmentsByStatus[status] ?? [];
      const filteredShipments = filterShipmentsByArea(shipments);
      const isLoading = loadingByStatus?.[status] ?? false;
      const EmptyIcon = hasAreaFilter ? MapPin : config.icon;
      const emptyTitle = hasAreaFilter ? config.emptyFilteredTitle : config.emptyTitle;
      const emptyDescription = hasAreaFilter
        ? "Try a different area or clear the filter to see all consignments."
        : config.emptyDescription;

      return (
        <TabsContent key={status} value={status}>
          <SupplierSectionHeader title={config.title} description={config.description} />
          {isLoading ? (
            <SupplierEmptyState
              icon={config.icon}
              title={config.loadingTitle}
              description={config.loadingDescription}
              isLoading
            />
          ) : filteredShipments.length === 0 ? (
            <SupplierEmptyState icon={EmptyIcon} title={emptyTitle} description={emptyDescription} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredShipments.map((shipment) => {
                const segmentIdentifier = shipment.segmentId ?? shipment.id;
                return (
                  <SupplierShipmentCard
                    key={`${shipment.id}-${status}`}
                    shipment={shipment}
                    actions={
                      <div className="flex flex-wrap gap-2">
                        <SupplierShipmentActions
                          status={status}
                          shipment={shipment}
                          context={actionContext}
                        />
                        <ViewShipmentButton
                          segmentId={segmentIdentifier}
                          shipmentId={shipment.shipmentId}
                        />
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      );
    })}
  </>
);

type SupplierActionContext = {
  supplier: ReturnType<typeof useSupplierContext>;
  openHandoverDialog: (shipment: SupplierShipmentRecord) => void;
  openTakeoverDialog: (shipment: SupplierShipmentRecord) => void;
  handleDownloadProof: (shipment: SupplierShipmentRecord) => void;
  handleReportIssue: (shipment: SupplierShipmentRecord) => void;
};

type SupplierShipmentActionsProps = {
  status: SupplierShipmentStatus;
  shipment: SupplierShipmentRecord;
  context: SupplierActionContext;
};

const SupplierShipmentActions = ({ status, shipment, context }: SupplierShipmentActionsProps) => {
  const { supplier, openHandoverDialog, openTakeoverDialog, handleDownloadProof, handleReportIssue } = context;
  if (!supplier.enabled) return null;
  const segmentIdentifier = shipment.segmentId ?? shipment.id;
  const allowAction = (
    flag: keyof NonNullable<SupplierShipmentRecord["actions"]>,
  ): boolean => {
    const permissions = shipment.actions;
    if (!permissions || typeof permissions[flag] === "undefined") return true;
    return Boolean(permissions[flag]);
  };

  switch (status) {
    case "PENDING": {
      const canAccept = allowAction("canAccept");
      const isAccepting =
        supplier.acceptShipmentPending && supplier.acceptingShipmentId === segmentIdentifier;
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              className="gap-2"
              disabled={isAccepting || !canAccept}
            >
              {isAccepting ? (
                <>
                  <LoaderIndicator />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Accept
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accept segment {segmentIdentifier}?</AlertDialogTitle>
            </AlertDialogHeader>
            <p className="text-sm text-muted-foreground">
              Confirm the contents and condition before accepting. The manufacturer will be notified.
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => supplier.acceptShipment(String(segmentIdentifier))}
                disabled={
                  !canAccept ||
                  (supplier.acceptShipmentPending &&
                    supplier.acceptingShipmentId === segmentIdentifier)
                }
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    case "ACCEPTED": {
      const canTakeover = allowAction("canTakeover");
      const isTakingOver =
        supplier.takeoverPending && supplier.takeoverSegmentId === segmentIdentifier;
      return (
        <Button
          size="sm"
          className="gap-2"
          disabled={isTakingOver || !canTakeover}
          onClick={() => openTakeoverDialog(shipment)}
        >
          {isTakingOver ? (
            <>
              <LoaderIndicator />
              Taking over...
            </>
          ) : (
            "Take Over"
          )}
        </Button>
      );
    }
    case "IN_TRANSIT": {
      const canHandover = allowAction("canHandover");
      return (
        <Button size="sm" onClick={() => openHandoverDialog(shipment)} disabled={!canHandover}>
          Handover
        </Button>
      );
    }
    case "CLOSED":
      return (
        <Button size="sm" variant="secondary" onClick={() => handleDownloadProof(shipment)}>
          Download Proof
        </Button>
      );
    case "CANCELLED":
      return (
        <Button size="sm" variant="secondary" onClick={() => handleReportIssue(shipment)}>
          Report Issue
        </Button>
      );
    default:
      return null;
  }
};

type SupplierSectionHeaderProps = {
  title: string;
  description: string;
};

function SupplierSectionHeader({ title, description }: SupplierSectionHeaderProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

type SupplierEmptyStateProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  isLoading?: boolean;
};

function SupplierEmptyState({ icon: Icon, title, description, isLoading }: SupplierEmptyStateProps) {
  return (
    <Card className="border-dashed border-border/60 bg-muted/20 text-center">
      <CardContent className="space-y-3 py-12">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isLoading ? <LoaderIndicator /> : <Icon className="h-6 w-6" />}
        </span>
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type SupplierShipmentCardProps = {
  shipment: SupplierShipmentRecord;
  actions?: React.ReactNode;
};

function SupplierShipmentCard({ shipment, actions }: SupplierShipmentCardProps) {
  const normalized = normalizeStatus(shipment.status);
  const arrivalText = formatArrivalText(shipment.expectedArrival);
  const parseDateValue = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const expectedShipDate = parseDateValue(shipment.expectedShipDate);
  const expectedShipAbsolute = expectedShipDate ? shipmentDateFormatter.format(expectedShipDate) : null;
  const arrivalDate = parseDateValue(shipment.expectedArrival);
  const arrivalAbsolute = arrivalDate ? shipmentDateFormatter.format(arrivalDate) : null;
  const items = extractShipmentItems(shipment);
  const itemPreview = items.slice(0, 2);
  const remainingItems = Math.max(items.length - itemPreview.length, 0);
  const primaryEntityName =
    shipment.consumerName ??
    shipment.destinationPartyName ??
    shipment.manufacturerName ??
    "Shipment";
  const primaryEntityLabel =
    shipment.consumerName || shipment.destinationPartyName ? "Destination" : "Manufacturer";
  const shipmentIdentifier = shipment.shipmentId ?? shipment.segmentId ?? shipment.id;
  const shipmentIdentifierLabel = shipment.shipmentId ? "Shipment ID" : "Segment ID";
  const segmentIdentifier = shipment.segmentId ?? shipment.id;
  const showSegmentId = Boolean(shipment.shipmentId && segmentIdentifier);
  const isPendingStatus = ["PENDING", "PENDING_ACCEPTANCE", "PREPARING"].includes(normalized);
  const pickupLabel = shipment.pickupArea ?? shipment.originArea ?? "Origin";
  const dropoffLabel = shipment.dropoffArea ?? shipment.destinationArea ?? "Destination";

  return (
    <Card className="border border-border/50 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{primaryEntityLabel}</p>
            <p className="text-base font-semibold leading-tight text-foreground">{primaryEntityName}</p>
            <p className="text-xs text-muted-foreground">
              {shipmentIdentifierLabel}:&nbsp;
              <span className="font-medium text-foreground/80">{shipmentIdentifier}</span>
            </p>
            {showSegmentId ? (
              <p className="text-xs text-muted-foreground">
                Segment ID:&nbsp;
                <span className="font-medium text-foreground/80">{segmentIdentifier}</span>
              </p>
            ) : null}
          </div>
          <Badge className={cn("text-xs whitespace-nowrap", supplierStatusBadgeClass(normalized))}>
            {humanizeSupplierStatus(normalized)}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary/80" />
            {pickupLabel}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/80" />
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary/80" />
            {dropoffLabel}
          </span>

        </div>

        <div className="space-y-1">
          {itemPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items listed</p>
          ) : (
            itemPreview.map((item, idx) => (
              <div key={`${shipment.id}-item-${idx}`} className="flex justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary/70" />
                  {item.productName}
                </span>
                <span className="text-muted-foreground">x{item.quantity}</span>
              </div>
            ))
          )}
          {remainingItems > 0 && (
            <p className="text-xs text-muted-foreground">
              +{remainingItems} more item{remainingItems > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {expectedShipAbsolute && (
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-3 w-3" />
              Shipment available on {expectedShipAbsolute}

            </span>
          )}
          <span className="inline-flex items-center gap-2">
            <Clock className="h-3 w-3" />
            {isPendingStatus ? "Should hand over on " : "Arrived "}
            {arrivalAbsolute ?? arrivalText}
          </span>
          {shipment.acceptedAt && (
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Accepted {formatDistanceToNow(new Date(shipment.acceptedAt), { addSuffix: true })}
            </span>
          )}
          {shipment.destinationCheckpoint && (
            <span className="inline-flex items-center gap-2">
              <Bus className="h-3 w-3 text-primary/70" />
              Next checkpoint: {shipment.destinationCheckpoint}
            </span>
          )}
          {shipment.handedOverAt && (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-primary" />
              Handover {formatDistanceToNow(new Date(shipment.handedOverAt), { addSuffix: true })}
            </span>
          )}
        </div>

        {actions ? <div className="flex justify-end gap-2">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}

function LoaderIndicator() {
  return (
    <span className="inline-flex items-center justify-center">
      <Loader2 className="h-4 w-4 animate-spin" />
    </span>
  );
}

function SupplierHandoverDialog() {
  const supplier = useSupplierContext();

  if (!supplier.enabled) return null;
  const coordsMissing =
    supplier.handoverForm.latitude.trim().length === 0 ||
    supplier.handoverForm.longitude.trim().length === 0;

  return (
    <Dialog open={supplier.handoverDialogOpen} onOpenChange={supplier.setHandoverDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Handover shipment</DialogTitle>
          <DialogDescription>
            Provide the receiving party, checkpoint notes, and GPS coordinates to finalize this handover.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            This handover request only submits geographic coordinates. Enter the latitude and longitude of the handover
            location.
          </p>
          <div className="grid gap-2">
            <label htmlFor="handoverLatitude" className="text-sm font-medium">
              Latitude
            </label>
            <Input
              id="handoverLatitude"
              type="number"
              step="any"
              placeholder="e.g., 6.1248"
              value={supplier.handoverForm.latitude}
              onChange={(event) =>
                supplier.setHandoverForm((prev) => ({
                  ...prev,
                  latitude: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="handoverLongitude" className="text-sm font-medium">
              Longitude
            </label>
            <Input
              id="handoverLongitude"
              type="number"
              step="any"
              placeholder="e.g., 81.1185"
              value={supplier.handoverForm.longitude}
              onChange={(event) =>
                supplier.setHandoverForm((prev) => ({
                  ...prev,
                  longitude: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => supplier.setHandoverDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={supplier.submitHandover}
            disabled={supplier.handoverLoading || coordsMissing}
          >
            {supplier.handoverLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Confirm handover"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
