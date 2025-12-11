import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Package,
  MapPin,
  Thermometer,
  Calendar,
  User,
  Phone,
  Mail,
  Truck,
  Clock,
} from "lucide-react";
import type { ShipmentDetailResponse } from "../types";

interface ViewShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: ShipmentDetailResponse | null;
}

export function ViewShipmentDialog({
  open,
  onOpenChange,
  shipment,
}: ViewShipmentDialogProps) {
  if (!shipment) return null;

  const getStatusVariant = (
    status?: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toUpperCase()) {
      case "DELIVERED":
        return "default";
      case "IN_TRANSIT":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getSegmentStatusColor = (status?: string): string => {
    switch (status?.toUpperCase()) {
      case "DELIVERED":
        return "text-green-600";
      case "IN_TRANSIT":
        return "text-blue-600";
      case "PENDING":
        return "text-yellow-600";
      case "ACCEPTED":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  const manufacturerName =
    shipment.manufacturer_company_name ||
    shipment.manufacturer_legal_name ||
    "N/A";
  const consumerName =
    shipment.consumer_company_name || shipment.consumer_legal_name || "N/A";

  const totalSegments = shipment.segments?.length || 0;
  const completedSegments =
    shipment.segments?.filter((s) => s.status === "DELIVERED").length || 0;
  const progressPercentage =
    totalSegments > 0 ? (completedSegments / totalSegments) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Shipment Details
          </DialogTitle>
          <DialogDescription>
            Shipment ID: {shipment.id} • Created{" "}
            {shipment.created_at
              ? formatDistanceToNow(new Date(shipment.created_at), {
                  addSuffix: true,
                })
              : "N/A"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Shipment Status</span>
                <Badge variant={getStatusVariant(shipment.status)}>
                  {shipment.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Progress: {completedSegments} of {totalSegments} segments
                    completed
                  </span>
                  <span className="font-medium">
                    {progressPercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manufacturer & Consumer Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Manufacturer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium">{manufacturerName}</p>
                <p className="text-sm text-muted-foreground">
                  UUID: {shipment.manufacturer_uuid}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Destination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium">{consumerName}</p>
                <p className="text-sm text-muted-foreground">
                  UUID: {shipment.consumer_uuid}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Packages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Packages
                <Badge variant="secondary" className="ml-2">
                  {shipment.packages?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipment.packages && shipment.packages.length > 0 ? (
                <div className="space-y-3">
                  {shipment.packages.map((pkg, idx) => (
                    <Card
                      key={pkg.packageId || idx}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardContent className="pt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-base mb-2">
                              {pkg.productName}
                            </h4>
                            <div className="space-y-1 text-sm">
                              <p className="text-muted-foreground">
                                <span className="font-medium">Category:</span>{" "}
                                {pkg.productCategory || "N/A"}
                              </p>
                              <p className="text-muted-foreground">
                                <span className="font-medium">Quantity:</span>{" "}
                                {pkg.quantity}
                              </p>
                              {pkg.status && (
                                <p className="text-muted-foreground">
                                  <span className="font-medium">Status:</span>{" "}
                                  <Badge variant="outline" className="ml-1">
                                    {pkg.status}
                                  </Badge>
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="space-y-1 text-sm">
                              {pkg.batchId && (
                                <p className="text-muted-foreground">
                                  <span className="font-medium">Batch:</span>{" "}
                                  {pkg.batchId}
                                </p>
                              )}
                              {pkg.expiryDate && (
                                <p className="text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="font-medium">
                                    Expires:
                                  </span>{" "}
                                  {new Date(
                                    pkg.expiryDate
                                  ).toLocaleDateString()}
                                </p>
                              )}
                              {(pkg.requiredTempStart !== undefined ||
                                pkg.requiredTempEnd !== undefined) && (
                                <p className="text-muted-foreground flex items-center gap-1">
                                  <Thermometer className="h-3 w-3" />
                                  <span className="font-medium">
                                    Temp Range:
                                  </span>{" "}
                                  {pkg.requiredTempStart}°C -{" "}
                                  {pkg.requiredTempEnd}°C
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No packages found
                </p>
              )}
            </CardContent>
          </Card>

          {/* Segments Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipment Segments
                <Badge variant="secondary" className="ml-2">
                  {shipment.segments?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipment.segments && shipment.segments.length > 0 ? (
                <div className="space-y-4">
                  {shipment.segments.map((segment, idx) => (
                    <div key={segment.id} className="relative">
                      {idx < shipment.segments.length - 1 && (
                        <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-300" />
                      )}
                      <Card className="relative">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${getSegmentStatusColor(
                                  segment.status
                                )} bg-white`}
                              >
                                {segment.segmentOrder}
                              </div>
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">
                                  Segment {segment.segmentOrder}
                                </h4>
                                <Badge
                                  variant={getStatusVariant(segment.status)}
                                  className={getSegmentStatusColor(
                                    segment.status
                                  )}
                                >
                                  {segment.status}
                                </Badge>
                              </div>

                              {/* Route */}
                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                  <p className="font-medium text-muted-foreground">
                                    From:
                                  </p>
                                  <p className="font-semibold">
                                    {segment.startCheckpoint.name}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {[
                                      segment.startCheckpoint.state,
                                      segment.startCheckpoint.country,
                                    ]
                                      .filter(Boolean)
                                      .join(", ") ||
                                      "Location details unavailable"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-medium text-muted-foreground">
                                    To:
                                  </p>
                                  <p className="font-semibold">
                                    {segment.endCheckpoint.name}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {[
                                      segment.endCheckpoint.state,
                                      segment.endCheckpoint.country,
                                    ]
                                      .filter(Boolean)
                                      .join(", ") ||
                                      "Location details unavailable"}
                                  </p>
                                </div>
                              </div>

                              {/* Supplier Info */}
                              {segment.supplier ? (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <p className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Supplier Assigned
                                  </p>
                                  <div className="space-y-1 text-sm">
                                    <p className="font-semibold">
                                      {segment.supplier.companyName ||
                                        segment.supplier.legalName}
                                    </p>
                                    {segment.supplier.email && (
                                      <p className="text-muted-foreground flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {segment.supplier.email}
                                      </p>
                                    )}
                                    {segment.supplier.phone && (
                                      <p className="text-muted-foreground flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {segment.supplier.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-yellow-50 p-3 rounded-lg">
                                  <p className="text-sm text-yellow-800 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    No supplier assigned yet
                                  </p>
                                </div>
                              )}

                              {/* Timeline */}
                              {(segment.expectedShipDate ||
                                segment.estimatedArrivalDate) && (
                                <div className="grid md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                  {segment.expectedShipDate && (
                                    <p className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Ship:{" "}
                                      {new Date(
                                        segment.expectedShipDate
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                  {segment.estimatedArrivalDate && (
                                    <p className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Arrival:{" "}
                                      {new Date(
                                        segment.estimatedArrivalDate
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No segments found
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
