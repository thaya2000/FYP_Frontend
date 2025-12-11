import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Package,
  MapPin,
  Calendar,
  Truck,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  AlertCircle,
} from "lucide-react";
import { useHandoverSharedContext, useManufacturerContext } from "../context";
import { EditShipmentButton } from "./EditShipmentButton";
import { ViewShipmentButton } from "./ViewShipmentButton";
import type { ManufacturerShipmentRecord } from "../types";
import { formatDistanceToNow } from "date-fns";
import { useState, useRef, useEffect } from "react";

type ShipmentsByStatus = {
  PENDING: ManufacturerShipmentRecord[];
  ACCEPTED: ManufacturerShipmentRecord[];
  IN_TRANSIT: ManufacturerShipmentRecord[];
  DELIVERED: ManufacturerShipmentRecord[];
  CLOSED: ManufacturerShipmentRecord[];
  CANCELLED: ManufacturerShipmentRecord[];
};

const STATUS_CONFIG = {
  PENDING: { label: "Pending", icon: Clock, color: "text-yellow-600" },
  ACCEPTED: { label: "Accepted", icon: CheckCircle2, color: "text-blue-600" },
  IN_TRANSIT: { label: "In Transit", icon: Truck, color: "text-purple-600" },
  DELIVERED: { label: "Delivered", icon: Package, color: "text-green-600" },
  CLOSED: { label: "Closed", icon: CheckCircle2, color: "text-gray-600" },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "text-red-600" },
};

function getStatusVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  if (!status) return "outline";
  const normalized = status.toUpperCase();
  switch (normalized) {
    case "PREPARING":
    case "PENDING":
      return "outline";
    case "IN_TRANSIT":
    case "ACCEPTED":
      return "default";
    case "DELIVERED":
    case "COMPLETED":
      return "secondary";
    case "CANCELLED":
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

function formatCheckpointLocation(checkpoint?: {
  name?: string;
  state?: string;
  country?: string;
}): string {
  if (!checkpoint) return "Unknown";
  const parts = [checkpoint.name, checkpoint.state, checkpoint.country].filter(
    Boolean
  );
  return parts.length > 0 ? parts.join(", ") : "Unknown";
}

function getSegmentStatusColor(status?: string): string {
  if (!status) return "text-muted-foreground";
  const normalized = status.toUpperCase();
  switch (normalized) {
    case "PENDING":
    case "PREPARING":
      return "text-yellow-600";
    case "ACCEPTED":
    case "IN_TRANSIT":
      return "text-blue-600";
    case "DELIVERED":
    case "COMPLETED":
      return "text-green-600";
    case "CANCELLED":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

export function ManufacturerShipmentsSection() {
  const shared = useHandoverSharedContext();
  const manufacturer = useManufacturerContext();
  const [activeTab, setActiveTab] = useState("PENDING");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { getShipmentsForStatus, onShipmentsUpdated } = manufacturer;

  // Get shipments for the active status tab
  const {
    data: activeShipments,
    isLoading: loadingMyShipments,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = getShipmentsForStatus(activeTab);

  // Infinite scroll observer
  useEffect(() => {
    if (loadingMyShipments || isFetchingNextPage || !hasNextPage) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observerRef.current.observe(currentRef);
    }

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [loadingMyShipments, isFetchingNextPage, hasNextPage, fetchNextPage]);

  if (!manufacturer.enabled || shared.role !== "MANUFACTURER") {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            My Shipments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMyShipments ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading shipments...
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-6 mb-4">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                  const Icon = config.icon;
                  return (
                    <TabsTrigger
                      key={status}
                      value={status}
                      className="flex items-center gap-1"
                    >
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                      <span className="hidden sm:inline">{config.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.keys(STATUS_CONFIG).map((status) => (
                <TabsContent key={status} value={status} className="mt-0">
                  {activeShipments.length === 0 ? (
                    <div className="py-8 text-center">
                      <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No{" "}
                        {STATUS_CONFIG[
                          status as keyof typeof STATUS_CONFIG
                        ].label.toLowerCase()}{" "}
                        shipments.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-2">
                      {activeShipments.map(
                        (shipment: ManufacturerShipmentRecord) => {
                          const hasSegments =
                            shipment.segments && shipment.segments.length > 0;
                          const firstSegment = hasSegments
                            ? shipment.segments![0]
                            : null;
                          const lastSegment = hasSegments
                            ? shipment.segments![shipment.segments!.length - 1]
                            : null;

                          return (
                            <Card
                              key={shipment.id}
                              className="overflow-hidden border-l-4 border-l-primary/20"
                            >
                              <CardContent className="p-4">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-foreground">
                                        Shipment #{shipment.id.slice(0, 8)}
                                      </p>
                                      <Badge
                                        variant={getStatusVariant(
                                          shipment.status
                                        )}
                                      >
                                        {shipment.status ?? "PREPARING"}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      To:{" "}
                                      {shipment.destinationPartyName ??
                                        shipment.destinationPartyUUID ??
                                        "Unknown"}
                                    </p>
                                    {shipment.createdAt && (
                                      <p className="text-xs text-muted-foreground">
                                        <Clock className="inline h-3 w-3 mr-1" />
                                        Created{" "}
                                        {formatDistanceToNow(
                                          new Date(shipment.createdAt),
                                          { addSuffix: true }
                                        )}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <ViewShipmentButton
                                      shipmentId={String(shipment.id)}
                                    />
                                    <EditShipmentButton
                                      shipment={shipment}
                                      onUpdated={onShipmentsUpdated}
                                    />
                                  </div>
                                </div>

                                {/* Route Information */}
                                {hasSegments && (
                                  <div className="mt-3 rounded-lg bg-muted/30 p-3">
                                    <div className="flex items-start gap-2 text-sm">
                                      <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="font-medium">
                                          {formatCheckpointLocation(
                                            firstSegment?.startCheckpoint
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-center py-1">
                                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-start gap-2 text-sm">
                                      <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="font-medium">
                                          {lastSegment?.endCheckpoint?.name && (
                                            <div>
                                              {lastSegment.endCheckpoint.name}
                                            </div>
                                          )}
                                          <div className="text-xs text-muted-foreground">
                                            {[
                                              lastSegment?.endCheckpoint?.state,
                                              lastSegment?.endCheckpoint
                                                ?.country,
                                            ]
                                              .filter(Boolean)
                                              .join(", ") ||
                                              "Location details unavailable"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Segments Progress */}
                                    {/* <div className="mt-2 space-y-1">
                            {shipment.segments!.map((segment, idx) => (
                              <div
                                key={segment.id ?? idx}
                                className="flex items-center gap-2 text-xs"
                              >
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    segment.status === "DELIVERED"
                                      ? "bg-green-500"
                                      : segment.status === "IN_TRANSIT"
                                      ? "bg-blue-500"
                                      : segment.status === "ACCEPTED"
                                      ? "bg-yellow-500"
                                      : "bg-gray-300"
                                  }`}
                                />
                                <span className="text-muted-foreground">
                                  Leg {segment.segmentOrder ?? idx + 1}:
                                </span>
                                <span
                                  className={getSegmentStatusColor(
                                    segment.status
                                  )}
                                >
                                  {segment.status ?? "PENDING"}
                                </span>
                                {segment.estimatedArrivalDate && (
                                  <span className="ml-auto text-muted-foreground">
                                    <Calendar className="inline h-3 w-3 mr-1" />
                                    ETA:{" "}
                                    {new Date(
                                      segment.estimatedArrivalDate
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div> */}
                                  </div>
                                )}

                                {/* Products Information */}
                                {/* {hasItems && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            <Package className="inline h-3 w-3 mr-1" />
                            Products ({shipment.shipmentItems!.length})
                          </p>
                          <div className="space-y-1">
                            {shipment
                              .shipmentItems!.slice(0, 3)
                              .map((item, idx) => (
                                <div
                                  key={item.packageId ?? idx}
                                  className="flex justify-between text-xs rounded bg-muted/20 px-2 py-1"
                                >
                                  <span className="font-medium">
                                    {item.productName ?? "Unknown Product"}
                                  </span>
                                  <span className="text-muted-foreground">
                                    Qty: {item.quantity ?? "N/A"}
                                  </span>
                                </div>
                              ))}
                            {shipment.shipmentItems!.length > 3 && (
                              <p className="text-xs text-muted-foreground text-center">
                                +{shipment.shipmentItems!.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      )} */}

                                {/* Quick Stats */}
                                <div className="mt-3 flex gap-4 border-t pt-3 text-xs text-muted-foreground">
                                  <div>
                                    <Package className="inline h-3 w-3 mr-1" />
                                    {shipment.totalPackages ?? 0} packages
                                  </div>
                                  <div>
                                    <MapPin className="inline h-3 w-3 mr-1" />
                                    {shipment.totalSegments ??
                                      shipment.segments?.length ??
                                      0}{" "}
                                    segments
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }
                      )}

                      {/* Infinite scroll trigger */}
                      {hasNextPage && (
                        <div ref={loadMoreRef} className="py-4 text-center">
                          {isFetchingNextPage ? (
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading more...
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchNextPage()}
                            >
                              Load More
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
