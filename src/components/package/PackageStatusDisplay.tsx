import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Thermometer,
  Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { batchService } from "@/services/batchService";

type PackageStatusResponse = {
  package?: {
    package_uuid?: string;
    package_accepted?: string;
    batch_id?: string;
    created_at?: string;
    product?: {
      name?: string;
      type?: string;
      temperature_requirements?: { min?: string; max?: string };
    };
  };
  shipment_chain?: Array<{
    shipment_id?: string;
    manufacturer_uuid?: string;
    consumer_uuid?: string;
    status?: string;
    shipment_date?: string;
    segments?: Array<{
      segment_id?: string;
      from_location?: { name?: string; state?: string; country?: string };
      to_location?: { name?: string; state?: string; country?: string };
      status?: string;
      carrier?: string | null;
      expected_ship_date?: string;
      estimated_arrival_date?: string;
      segment_order?: number;
      start_timestamp?: string;
      end_timestamp?: string;
    }>;
  }>;
  breaches?: {
    statistics?: {
      total?: number;
      resolved?: number;
      active?: number;
      byType?: Record<string, number>;
      bySeverity?: Record<string, number>;
    };
    records?: Array<{
      breach_uuid?: string;
      breach_type?: string;
      severity?: string;
      status?: string;
      detected_at?: string;
      resolved_at?: string | null;
      detected_value?: string;
      threshold?: { min?: string | null; max?: string | null };
      location?: { latitude?: string; longitude?: string };
      blockchain?: { tx_hash?: string; ipfs_cid?: string | null };
    }>;
  };
};

const getStatusColor = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "IN_TRANSIT":
      return "bg-blue-100 text-blue-800";
    case "DELIVERED":
      return "bg-green-100 text-green-800";
    case "PACKAGE_IN_TRANSIT":
      return "bg-blue-100 text-blue-800";
    case "CONFIRMED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getSeverityColor = (severity?: string) => {
  switch (severity?.toUpperCase()) {
    case "HIGH":
      return "bg-red-100 text-red-800";
    case "MEDIUM":
      return "bg-orange-100 text-orange-800";
    case "LOW":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatTemp = (val?: string) => {
  if (!val) return "N/A";
  // remove non-numeric characters (e.g. trailing 'C') and keep sign/decimal
  const n = String(val).replace(/[^0-9.-]/g, "");
  return n ? `${n}°C` : "N/A";
};

const timeSince = (dateString?: string) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString).getTime();
  const now = Date.now();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

const timeUntil = (dateString?: string) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString).getTime();
  const now = Date.now();
  const diff = d - now;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 0) return `Expired ${timeSince(dateString)}`;
  if (seconds < 60) return `in ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `in ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 24) return `in ${months}mo`;
  const years = Math.floor(months / 12);
  return `in ${years}y`;
};

interface PackageStatusDisplayProps {
  data: PackageStatusResponse;
  onClose?: () => void;
}

export function PackageStatusDisplay({ data }: PackageStatusDisplayProps) {
  const breachStats = data.breaches?.statistics;
  const breachRecords = data.breaches?.records || [];
  const hasActiveBreaches = (breachStats?.active ?? 0) > 0;
  const batchId = data.package?.batch_id;

  const { data: batchData, isLoading: loadingBatch } = useQuery({
    queryKey: ["batchDetails", batchId],
    queryFn: () => batchService.getBatchById(batchId!),
    enabled: Boolean(batchId),
    staleTime: 5 * 60 * 1000,
  });

  const batchExpiry =
    batchData?.expiryDate ??
    batchData?.expiry_date ??
    batchData?.batch?.expiryDate ??
    batchData?.batch?.expiry_date ??
    null;

  return (
    <div className="w-full space-y-6 px-2 sm:px-0">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 sm:space-y-2 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Package Status Report
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground break-all">
              UUID:{" "}
              <span className="font-mono text-xs">
                {data.package?.package_uuid}
              </span>
            </p>
          </div>
          <Badge
            className={`h-fit text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2 flex-shrink-0 ${getStatusColor(
              data.package?.package_accepted
            )}`}
          >
            {data.package?.package_accepted || "N/A"}
          </Badge>
        </div>

        {/* Quick Stats (Product + Temps + Manufacture/Expiry) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 rounded-lg border border-border/50 bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0 rounded-md bg-primary/5 p-2 sm:p-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-md bg-primary/10 text-primary">
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="2" />
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                </svg>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Product
              </p>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {data.package?.product?.name || "Unknown"}
                </h3>
                <Badge className="text-xs px-2 py-1">
                  {data.package?.product?.type || "N/A"}
                </Badge>
              </div>
              {data.package?.product?.temperature_requirements && (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {formatTemp(
                      data.package.product.temperature_requirements.min
                    )}{" "}
                    to{" "}
                    {formatTemp(
                      data.package.product.temperature_requirements.max
                    )}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-shrink-0">
              <div className="inline-flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-md bg-primary/10 text-primary">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Manufacture
              </p>
              <p className="mt-1 text-lg sm:text-xl font-semibold text-foreground">
                {formatDate(data.package?.created_at)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {timeSince(data.package?.created_at)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-gradient-to-r from-muted to-card p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-shrink-0">
              <div className="inline-flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-md bg-amber-50 text-amber-600">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Expiry
              </p>
              <p className="mt-1 text-lg sm:text-xl font-semibold text-foreground">
                {loadingBatch
                  ? "Loading..."
                  : formatDate(batchExpiry ?? undefined)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {loadingBatch ? "" : timeUntil(batchExpiry ?? undefined)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shipment Chain Section */}
      {data.shipment_chain && data.shipment_chain.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Shipment Chain
            </CardTitle>
            <CardDescription>Current route and transit status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.shipment_chain.map((shipment, shipmentIdx) => (
              <div
                key={shipment.shipment_id || shipmentIdx}
                className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Shipment #{shipmentIdx + 1}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground truncate">
                      {shipment.shipment_id}
                    </p>
                  </div>
                  <Badge
                    className={`${getStatusColor(
                      shipment.status
                    )} flex-shrink-0`}
                  >
                    {shipment.status || "N/A"}
                  </Badge>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground">
                  <p className="truncate">
                    Shipped: {formatDate(shipment.shipment_date)}
                  </p>
                </div>

                {/* Segments */}
                {shipment.segments && shipment.segments.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {shipment.segments.map((segment, segIdx) => (
                      <div
                        key={segment.segment_id || segIdx}
                        className="rounded-md border border-border/40 bg-background/60 p-2 sm:p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                          <p className="font-semibold text-foreground text-sm">
                            Segment {segment.segment_order}
                          </p>
                          <Badge variant="outline" className="w-fit">
                            {segment.status || "N/A"}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {/* From Location */}
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-green-500" />
                              <div className="h-8 w-0.5 bg-gray-300" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                From
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {segment.from_location?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {segment.from_location?.state},{" "}
                                {segment.from_location?.country}
                              </p>
                            </div>
                          </div>

                          {/* To Location */}
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-0.5 w-0.5 bg-gray-300" />
                              <div className="h-3 w-3 rounded-full bg-blue-500" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                To
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {segment.to_location?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {segment.to_location?.state},{" "}
                                {segment.to_location?.country}
                              </p>
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="rounded-sm bg-muted/50 p-2">
                              <p className="text-muted-foreground">
                                Expected Ship
                              </p>
                              <p className="font-semibold text-foreground">
                                {formatDate(segment.expected_ship_date)}
                              </p>
                            </div>
                            <div className="rounded-sm bg-muted/50 p-2">
                              <p className="text-muted-foreground">ETA</p>
                              <p className="font-semibold text-foreground">
                                {formatDate(segment.estimated_arrival_date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Breach Summary Section */}
      {breachStats && (
        <Card
          className={hasActiveBreaches ? "border-red-200 bg-red-50/50" : ""}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle
                className={`h-5 w-5 ${
                  hasActiveBreaches ? "text-red-600" : "text-muted-foreground"
                }`}
              />
              Breach Summary
            </CardTitle>
            <CardDescription>
              {hasActiveBreaches
                ? "Active issues detected during transit"
                : "No active breaches detected"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Statistics Card */}
            <div className="rounded-lg border border-border/50 bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Total Breaches
              </p>
              <p
                className={`mt-2 text-3xl sm:text-4xl font-bold ${
                  hasActiveBreaches ? "text-red-600" : "text-green-600"
                }`}
              >
                {breachStats.total || 0}
              </p>
            </div>

            {/* Breach Types */}
            {breachStats.byType &&
              Object.keys(breachStats.byType).length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    By Type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(breachStats.byType).map(([type, count]) => (
                      <Badge key={type} variant="secondary">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            {/* Breach Severity */}
            {breachStats.bySeverity &&
              Object.keys(breachStats.bySeverity).length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    By Severity
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(breachStats.bySeverity).map(
                      ([severity, count]) => (
                        <Badge
                          key={severity}
                          className={getSeverityColor(severity)}
                        >
                          {severity}: {count}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Detailed Breach Records */}
            {breachRecords.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Breach Details
                </p>
                <div className="space-y-2">
                  {breachRecords.map((breach) => (
                    <div
                      key={breach.breach_uuid}
                      className={`rounded-lg border p-2 sm:p-3 ${
                        breach.status === "CONFIRMED"
                          ? "border-red-200 bg-red-50/50"
                          : "border-border/50 bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <p className="font-semibold text-foreground">
                              {breach.breach_type || "Breach"}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Detected: {formatDate(breach.detected_at)}
                          </p>
                        </div>
                      </div>

                      {/* Breach Details */}
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {breach.breach_type === "TEMPERATURE_EXCURSION" &&
                          breach.detected_value && (
                            <>
                              <div className="text-xs">
                                <p className="text-muted-foreground">
                                  Detected Value
                                </p>
                                <p className="font-semibold text-foreground">
                                  {breach.detected_value}°C
                                </p>
                              </div>
                              <div className="text-xs">
                                <p className="text-muted-foreground">
                                  Threshold
                                </p>
                                <p className="font-semibold text-foreground">
                                  {breach.threshold?.min}°C -{" "}
                                  {breach.threshold?.max}°C
                                </p>
                              </div>
                            </>
                          )}

                        {breach.location?.latitude && (
                          <div className="text-xs">
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" /> Location
                            </p>
                            <p className="font-semibold text-foreground">
                              {breach.location.latitude},{" "}
                              {breach.location.longitude}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {breachRecords.length === 0 && (
              <div className="flex items-center justify-center rounded-lg border border-green-200 bg-green-50/50 py-6">
                <div className="text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
                  <p className="mt-2 text-sm font-semibold text-green-900">
                    No breaches detected
                  </p>
                  <p className="text-xs text-green-700">
                    Shipment conditions maintained within specifications
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
