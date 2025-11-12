import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  MapPin,
  Package,
  Thermometer,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { shipmentService } from "@/services/shipmentService";
import type {
  ManufacturerShipmentRecord,
  SupplierShipmentRecord,
} from "../types";

type ViewShipmentButtonProps = {
  shipmentId?: string;
  segmentId?: string;
};

type ShipmentCheckpoint = {
  start_checkpoint_id?: number | string;
  end_checkpoint_id?: number | string;
  estimated_arrival_date?: string;
  expected_ship_date?: string;
  time_tolerance?: string;
  required_action?: string;
};

type ViewDetail = ManufacturerShipmentRecord &
  SupplierShipmentRecord & {
    shipment?: ManufacturerShipmentRecord | null;
    checkpoints?: ShipmentCheckpoint[];
    shipmentItems?: Array<{
      product_uuid?: string;
      quantity?: number;
      productName?: string;
    }>;
    packages?: Array<{
      productCategory?: string;
      productName?: string;
      requiredStartTemp?: string;
      requiredEndTemp?: string;
      quantity?: number;
    }>;
    estimatedArrivalDate?: string;
    estimated_arrival_date?: string;
    temperatureCheck?: string;
  };

const formatDateTime = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatStatus = (value?: string | null) => {
  if (!value) return "UNKNOWN";
  const normalized = value.toLowerCase().replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getStatusVariant = (status?: string | null) => {
  if (!status) return "outline";
  const lower = status.toLowerCase();
  if (
    lower.includes("completed") ||
    lower.includes("delivered") ||
    lower.includes("accepted")
  )
    return "default";
  if (
    lower.includes("in progress") ||
    lower.includes("shipped") ||
    lower.includes("pending")
  )
    return "secondary";
  if (
    lower.includes("failed") ||
    lower.includes("cancelled") ||
    lower.includes("rejected")
  )
    return "destructive";
  return "outline";
};

const getStatusIcon = (status?: string | null) => {
  if (!status) return Clock;
  const lower = status.toLowerCase();
  if (
    lower.includes("completed") ||
    lower.includes("delivered") ||
    lower.includes("accepted")
  )
    return CheckCircle;
  if (
    lower.includes("in progress") ||
    lower.includes("shipped") ||
    lower.includes("pending")
  )
    return Clock;
  if (
    lower.includes("failed") ||
    lower.includes("cancelled") ||
    lower.includes("rejected")
  )
    return XCircle;
  return AlertTriangle;
};

const formatCheckpoint = (checkpoint?: {
  state?: string;
  country?: string;
  name?: string;
}) => {
  if (!checkpoint) return undefined;
  const label = [checkpoint.state, checkpoint.country]
    .filter(Boolean)
    .join(", ");
  if (checkpoint.name && label) return `${checkpoint.name} • ${label}`;
  return checkpoint.name ?? label ?? undefined;
};

const resolvePackages = (data?: ViewDetail | null) => {
  if (!data) return [];
  if (Array.isArray(data.packages) && data.packages.length)
    return data.packages;
  return (
    Array.isArray(data.shipmentItems) && data.shipmentItems.length
      ? data.shipmentItems
      : Array.isArray(data.items) && data.items.length
      ? data.items
      : []
  ) as Array<{
    productCategory?: string;
    productName?: string;
    requiredStartTemp?: string;
    requiredEndTemp?: string;
    quantity?: number;
    product_uuid?: string;
  }>;
};

export function ViewShipmentButton({
  shipmentId,
  segmentId,
}: ViewShipmentButtonProps) {
  const [open, setOpen] = useState(false);
  const hasSegmentTarget = Boolean(segmentId);
  const fetchId = segmentId ?? shipmentId;
  const queryKey = hasSegmentTarget
    ? ["shipmentSegment", fetchId]
    : ["shipment", fetchId];

  const { data, isLoading, isError } = useQuery<ViewDetail>({
    queryKey,
    queryFn: async () => {
      if (!fetchId) throw new Error("Missing reference id");
      return hasSegmentTarget
        ? shipmentService.getSegmentById(fetchId)
        : shipmentService.getById(fetchId);
    },
    enabled: open && Boolean(fetchId),
  });

  const normalizedItems: Array<{
    productName?: string;
    quantity?: number;
    product_uuid?: string;
  }> =
    (Array.isArray(data?.shipmentItems) && data?.shipmentItems?.length
      ? data?.shipmentItems
      : Array.isArray(data?.items)
      ? data?.items
      : []) ?? [];

  const detailTitle = hasSegmentTarget ? "Segment Details" : "Shipment Details";
  const segmentDisplayId = data?.segmentId ?? segmentId ?? fetchId ?? undefined;
  const shipmentDisplayId =
    data?.shipmentId ??
    data?.id ??
    data?.shipment?.id ??
    shipmentId ??
    undefined;
  const manufacturerLabel =
    data?.manufacturerName ??
    data?.manufacturerUUID ??
    data?.fromUUID ??
    data?.shipment?.manufacturerUUID ??
    "Unknown";
  const destinationLabel =
    data?.consumerName ??
    data?.destinationPartyName ??
    data?.destinationPartyUUID ??
    (data?.shipment?.consumer as { legalName?: string })?.legalName ??
    data?.shipment?.destinationPartyUUID ??
    data?.toUUID ??
    "Unknown";
  const expectedShip = formatDateTime(data?.expectedShipDate);
  const expectedArrival = formatDateTime(
    data?.expectedArrival ??
      data?.estimatedArrivalDate ??
      data?.estimated_arrival_date
  );
  const startCheckpointLabel =
    formatCheckpoint(data?.startCheckpoint) ??
    data?.pickupArea ??
    data?.originArea;
  const endCheckpointLabel =
    formatCheckpoint(data?.endCheckpoint) ??
    data?.dropoffArea ??
    data?.destinationArea;
  const packages = resolvePackages(data);

  if (!fetchId) {
    console.warn(
      "ViewShipmentButton requires either a segmentId or shipmentId."
    );
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detailTitle}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading shipment details...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <Package className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">
                Failed to load details
              </p>
              <p className="text-sm text-muted-foreground">
                Unable to load {hasSegmentTarget ? "segment" : "shipment"}{" "}
                details. Please try again.
              </p>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={getStatusVariant(data.status)}
                className="capitalize px-3 py-1.5 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
              >
                {(() => {
                  const StatusIcon = getStatusIcon(data.status);
                  return (
                    <>
                      <StatusIcon className="h-4 w-4" />
                      {formatStatus(data.status)}
                    </>
                  );
                })()}
              </Badge>
              {data.segmentOrder !== undefined ? (
                <span className="text-muted-foreground bg-muted/50 px-2 py-1 rounded-md text-sm">
                  Segment #{data.segmentOrder}
                </span>
              ) : null}
            </div>

            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Shipment Information
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {shipmentDisplayId ? (
                  <div>
                    <p className="text-muted-foreground">Shipment ID</p>
                    <p className="font-medium break-all">{shipmentDisplayId}</p>
                  </div>
                ) : null}
                {segmentDisplayId ? (
                  <div>
                    <p className="text-muted-foreground">Segment ID</p>
                    <p className="font-medium break-all">{segmentDisplayId}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{formatStatus(data.status)}</p>
                </div>
                {expectedShip ? (
                  <div>
                    <p className="text-muted-foreground">Expected Ship Date</p>
                    <p className="font-medium break-all">{expectedShip}</p>
                  </div>
                ) : null}
                {expectedArrival ? (
                  <div>
                    <p className="text-muted-foreground">Estimated Arrival</p>
                    <p className="font-medium break-all">{expectedArrival}</p>
                  </div>
                ) : null}
                {data.timeTolerance ? (
                  <div>
                    <p className="text-muted-foreground">Time Tolerance</p>
                    <p className="font-medium break-all">
                      {data.timeTolerance}
                    </p>
                  </div>
                ) : null}
                {startCheckpointLabel ? (
                  <div>
                    <p className="text-muted-foreground">Start Checkpoint</p>
                    <p className="font-medium break-all">
                      {startCheckpointLabel}
                    </p>
                  </div>
                ) : null}
                {endCheckpointLabel ? (
                  <div>
                    <p className="text-muted-foreground">End Checkpoint</p>
                    <p className="font-medium break-all">
                      {endCheckpointLabel}
                    </p>
                  </div>
                ) : null}
                {data.segmentOrder !== undefined ? (
                  <div>
                    <p className="text-muted-foreground">Segment Order</p>
                    <p className="font-medium break-all">{data.segmentOrder}</p>
                  </div>
                ) : null}
                {data.acceptedAt ? (
                  <div>
                    <p className="text-muted-foreground">Accepted At</p>
                    <p className="font-medium break-all">{data.acceptedAt}</p>
                  </div>
                ) : null}
                {data.handedOverAt ? (
                  <div>
                    <p className="text-muted-foreground">Handed Over At</p>
                    <p className="font-medium break-all">
                      {formatDateTime(data.handedOverAt)}
                    </p>
                  </div>
                ) : null}
                {data.destinationCheckpoint ? (
                  <div>
                    <p className="text-muted-foreground">Next Checkpoint</p>
                    <p className="font-medium break-all">
                      {data.destinationCheckpoint}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">Packages</p>
              </div>
              {packages.length > 0 ? (
                <div className="space-y-3">
                  {packages.map((item, index) => {
                    const label =
                      item.productName ??
                      (item as { product_uuid?: string }).product_uuid ??
                      item.productCategory ??
                      `Package ${index + 1}`;
                    return (
                      <div
                        key={`${label}-${index}`}
                        className="rounded-lg border p-3 space-y-2 bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{label}</p>
                            {item.productCategory ? (
                              <p className="text-xs text-muted-foreground">
                                {item.productCategory}
                              </p>
                            ) : null}
                          </div>
                          {item.quantity !== undefined ? (
                            <Badge variant="secondary">
                              Qty: {item.quantity}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Thermometer className="h-3 w-3" />
                            {item.requiredStartTemp || item.requiredEndTemp
                              ? `${item.requiredStartTemp ?? "?"} to ${
                                  item.requiredEndTemp ?? "?"
                                }`
                              : "Temp range unavailable"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : normalizedItems.length > 0 ? (
                <div className="divide-y rounded-md border">
                  {normalizedItems.map((item, index) => {
                    const label =
                      item.productName ?? item.product_uuid ?? "Product";
                    const qty =
                      "quantity" in item && item.quantity !== undefined
                        ? item.quantity
                        : (item as { qty?: number }).qty;
                    return (
                      <div key={index} className="flex justify-between p-2">
                        <span className="truncate">{label}</span>
                        <span className="text-muted-foreground">
                          {qty !== undefined ? `x${qty}` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No items listed</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Shipment details unavailable.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
