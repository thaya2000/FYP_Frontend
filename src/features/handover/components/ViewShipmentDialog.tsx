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
  Loader2,
  Package,
  MapPin,
  Thermometer,
  Calendar,
  User,
  Phone,
  Mail,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import type { ShipmentDetailResponse } from "../types";

interface ViewShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: ShipmentDetailResponse | null;
  loading?: boolean;
  segment?: any | null;
}

export function ViewShipmentDialog({
  open,
  onOpenChange,
  shipment,
  loading = false,
  segment = null,
}: ViewShipmentDialogProps) {
  if (!shipment && !segment && !loading) return null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="space-y-1">
              <DialogTitle className="text-lg">Loading shipment...</DialogTitle>
              <DialogDescription>
                Fetching shipment details. Please wait.
              </DialogDescription>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Segment-focused view for suppliers (preferred when segment is provided)
  if (segment) {
    const start = segment.startCheckpoint || {};
    const end = segment.endCheckpoint || {};
    const pkgList = Array.isArray(segment.packages) ? segment.packages : [];

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-3xl flex items-center gap-3 mb-2">
                  <div className="bg-cyan-100 p-2.5 rounded-lg">
                    <Truck className="h-6 w-6 text-cyan-600" />
                  </div>
                  Segment Details
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Segment ID: {segment.segmentId ?? segment.id ?? "N/A"}
                </DialogDescription>
              </div>
              <Badge
                variant={
                  segment.status === "PENDING"
                    ? "secondary"
                    : segment.status === "IN_TRANSIT"
                    ? "default"
                    : "secondary"
                }
                className={`text-base px-4 py-2 ${
                  segment.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-900 border-yellow-200"
                    : segment.status === "IN_TRANSIT"
                    ? "bg-blue-100 text-blue-900 border-blue-200"
                    : segment.status === "DELIVERED"
                    ? "bg-green-100 text-green-900 border-green-200"
                    : "bg-gray-100 text-gray-900 border-gray-200"
                }`}
              >
                {segment.status ?? "PENDING"}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {segment.timeTolerance && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">Time Tolerance</p>
                  <p className="text-sm text-amber-700">
                    {segment.timeTolerance}
                  </p>
                </div>
              </div>
            )}

            {/* Route Section */}
            <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-transparent hover:shadow-lg transition-shadow">
              <CardHeader className="bg-cyan-50 border-b border-cyan-100">
                <CardTitle className="flex items-center gap-2 text-lg text-cyan-900">
                  <MapPin className="h-5 w-5 text-cyan-600" />
                  Route
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-600 inline-block" />
                        <span>From</span>
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-900">
                          {start.name || "Origin"}
                        </p>
                        {start.address && (
                          <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">
                            {start.address}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 font-medium">
                          {[start.state, start.country]
                            .filter(Boolean)
                            .join(", ") || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-600 inline-block" />
                        <span>To</span>
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-900">
                          {end.name || "Destination"}
                        </p>
                        {end.address && (
                          <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">
                            {end.address}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 font-medium">
                          {[end.state, end.country]
                            .filter(Boolean)
                            .join(", ") || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center pt-2">
                    <ArrowRight className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timing Section */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-transparent hover:shadow-lg transition-shadow">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                        Expected Ship
                      </p>
                      <p className="font-semibold text-gray-900">
                        {segment.expectedShipDate
                          ? new Date(segment.expectedShipDate).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                        Estimated Arrival
                      </p>
                      <p className="font-semibold text-gray-900">
                        {segment.estimatedArrivalDate
                          ? new Date(
                              segment.estimatedArrivalDate
                            ).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Packages Section */}
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50/50 to-transparent hover:shadow-lg transition-shadow">
              <CardHeader className="bg-orange-50 border-b border-orange-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg text-orange-900">
                    <Package className="h-5 w-5 text-orange-600" />
                    Packages
                  </CardTitle>
                  <Badge className="bg-green-500 hover:bg-green-600 text-white text-base px-3 py-1.5">
                    {pkgList.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {pkgList.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No packages listed
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pkgList.map((pkg: any, idx: number) => (
                      <div
                        key={`${pkg.productName || "pkg"}-${idx}`}
                        className="flex items-start gap-4 rounded-lg border border-orange-100 bg-white p-4 hover:border-orange-200 hover:shadow-sm transition-all"
                      >
                        <div className="w-3 h-3 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {pkg.productName || "Package"}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                            <span>{pkg.productCategory || "Category"}</span>
                            <span>·</span>
                            <span className="font-medium">
                              Qty: {pkg.quantity ?? "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-white to-gray-50">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-3xl flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Truck className="h-7 w-7 text-primary" />
                </div>
                Shipment Overview
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm">
                ID:{" "}
                <span className="font-mono font-semibold">{shipment.id}</span> •
                Created{" "}
                {shipment.created_at
                  ? formatDistanceToNow(new Date(shipment.created_at), {
                      addSuffix: true,
                    })
                  : "N/A"}
              </DialogDescription>
            </div>
            <Badge
              variant={getStatusVariant(shipment.status)}
              className="text-base px-4 py-2"
            >
              {shipment.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Progress Overview */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Shipment Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Delivery Progress
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {completedSegments} of {totalSegments}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    segments completed
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-primary">
                    {progressPercentage.toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Manufacturer & Consumer Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Manufacturer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Company</p>
                  <p className="font-bold text-lg">{manufacturerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ID</p>
                  <p className="font-mono text-sm bg-gray-100 rounded px-2 py-1">
                    {shipment.manufacturer_uuid}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Destination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Consumer</p>
                  <p className="font-bold text-lg">{consumerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ID</p>
                  <p className="font-mono text-sm bg-gray-100 rounded px-2 py-1">
                    {shipment.consumer_uuid}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Packages */}
          <Card className="border-primary/20 bg-gradient-to-br from-orange-50/50 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-orange-600" />
                Packages
                <Badge
                  variant="secondary"
                  className="ml-2 bg-orange-100 text-orange-900"
                >
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
                      className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow bg-white"
                    >
                      <CardContent className="pt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              {pkg.productName}
                            </h4>
                            <div className="space-y-2 text-sm">
                              <p className="text-muted-foreground">
                                <span className="font-medium text-gray-700">
                                  Category:
                                </span>{" "}
                                {pkg.productCategory || "N/A"}
                              </p>
                              <p className="text-muted-foreground">
                                <span className="font-medium text-gray-700">
                                  Quantity:
                                </span>{" "}
                                <span className="font-semibold">
                                  {pkg.quantity}
                                </span>
                              </p>
                              {pkg.status && (
                                <p className="text-muted-foreground">
                                  <span className="font-medium text-gray-700">
                                    Status:
                                  </span>{" "}
                                  <Badge
                                    variant="outline"
                                    className="ml-1 bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    {pkg.status}
                                  </Badge>
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="space-y-2 text-sm">
                              {pkg.batchId && (
                                <p className="text-muted-foreground">
                                  <span className="font-medium text-gray-700">
                                    Batch:
                                  </span>{" "}
                                  <span className="font-mono text-xs bg-gray-100 rounded px-2 py-1">
                                    {pkg.batchId}
                                  </span>
                                </p>
                              )}
                              {pkg.expiryDate && (
                                <p className="text-muted-foreground flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                  <span>
                                    <span className="font-medium text-gray-700">
                                      Expires:
                                    </span>{" "}
                                    {new Date(
                                      pkg.expiryDate
                                    ).toLocaleDateString()}
                                  </span>
                                </p>
                              )}
                              {(pkg.requiredTempStart !== undefined ||
                                pkg.requiredTempEnd !== undefined) && (
                                <p className="text-muted-foreground flex items-center gap-2">
                                  <Thermometer className="h-4 w-4 text-red-500 flex-shrink-0" />
                                  <span>
                                    <span className="font-medium text-gray-700">
                                      Temp:
                                    </span>{" "}
                                    {pkg.requiredTempStart}°C -{" "}
                                    {pkg.requiredTempEnd}°C
                                  </span>
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
          <Card className="border-primary/20 bg-gradient-to-br from-purple-50/50 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
                Shipment Segments
                <Badge
                  variant="secondary"
                  className="ml-2 bg-purple-100 text-purple-900"
                >
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
                        <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gradient-to-b from-purple-300 to-purple-100" />
                      )}
                      <Card className="relative hover:shadow-md transition-shadow bg-white">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getSegmentStatusColor(
                                  segment.status
                                )} bg-white`}
                              >
                                {segment.segmentOrder}
                              </div>
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4 className="font-semibold text-base">
                                  Segment {segment.segmentOrder}
                                </h4>
                                <Badge
                                  variant={getStatusVariant(segment.status)}
                                  className={`${getSegmentStatusColor(
                                    segment.status
                                  )} text-xs px-3 py-1`}
                                >
                                  {segment.status}
                                </Badge>
                              </div>

                              {/* Route with Arrow */}
                              <div className="bg-gradient-to-r from-gray-50 to-transparent p-3 rounded-lg border border-gray-100">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      From
                                    </p>
                                    <p className="font-semibold text-sm truncate">
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
                                  <ArrowRight className="h-5 w-5 text-purple-400 flex-shrink-0 mx-2" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      To
                                    </p>
                                    <p className="font-semibold text-sm truncate">
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
                              </div>

                              {/* Supplier Info */}
                              {segment.supplier ? (
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                  <p className="font-medium text-sm mb-2 flex items-center gap-2 text-blue-900">
                                    <User className="h-4 w-4 flex-shrink-0" />
                                    Supplier Assigned
                                  </p>
                                  <div className="space-y-1 text-sm ml-6">
                                    <p className="font-semibold text-gray-800">
                                      {segment.supplier.companyName ||
                                        segment.supplier.legalName}
                                    </p>
                                    {segment.supplier.email && (
                                      <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                        <Mail className="h-3 w-3" />
                                        {segment.supplier.email}
                                      </p>
                                    )}
                                    {segment.supplier.phone && (
                                      <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                        <Phone className="h-3 w-3" />
                                        {segment.supplier.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                  <p className="text-sm text-amber-900 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    No supplier assigned yet
                                  </p>
                                </div>
                              )}

                              {/* Timeline */}
                              {(segment.expectedShipDate ||
                                segment.estimatedArrivalDate) && (
                                <div className="grid md:grid-cols-2 gap-2 text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
                                  {segment.expectedShipDate && (
                                    <p className="flex items-center gap-2 font-medium">
                                      <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                      <span className="text-gray-700">
                                        Ship:{" "}
                                        {new Date(
                                          segment.expectedShipDate
                                        ).toLocaleDateString()}
                                      </span>
                                    </p>
                                  )}
                                  {segment.estimatedArrivalDate && (
                                    <p className="flex items-center gap-2 font-medium">
                                      <Calendar className="h-3.5 w-3.5 text-green-600" />
                                      <span className="text-gray-700">
                                        Arrival:{" "}
                                        {new Date(
                                          segment.estimatedArrivalDate
                                        ).toLocaleDateString()}
                                      </span>
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
