import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useHandoverSharedContext, useManufacturerContext } from "../context";
import { EditShipmentButton } from "./EditShipmentButton";
import { ViewShipmentButton } from "./ViewShipmentButton";
import type { ManufacturerShipmentRecord } from "../types";

export function ManufacturerSection() {
  const shared = useHandoverSharedContext();
  const manufacturer = useManufacturerContext();

  if (!manufacturer.enabled || shared.role !== "MANUFACTURER") {
    return null;
  }

  const {
    myShipments,
    loadingMyShipments,
    manufacturerPackages,
    loadingManufacturerPackages,
    onShipmentsUpdated,
  } = manufacturer;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>My Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMyShipments ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : myShipments.length === 0 ? (
            <p className="text-muted-foreground">No shipments yet</p>
          ) : (
            <div className="max-h-[28rem] space-y-3 overflow-y-auto">
              {myShipments.map((shipment: ManufacturerShipmentRecord) => (
                <div key={shipment.id} className="space-y-1 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Shipment: {shipment.id}</p>
                      <p className="text-xs text-muted-foreground">
                        To: {shipment.destinationPartyUUID ?? shipment.toUUID ?? "Unknown"}
                      </p>
                    </div>
                    <Badge variant={shipment.status === "PREPARING" ? "outline" : "secondary"}>
                      {shipment.status ?? "PREPARING"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Items: {shipment.shipmentItems?.length ?? shipment.productIds?.length ?? 0}</span>
                    <span>
                      Legs: {shipment.checkpoints?.length ?? shipment.checkpointIds?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <ViewShipmentButton shipmentId={String(shipment.id)} />
                    <EditShipmentButton shipment={shipment} onUpdated={onShipmentsUpdated} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered Packages</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingManufacturerPackages ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading packages...
            </div>
          ) : manufacturerPackages.length === 0 ? (
            <p className="text-muted-foreground">
              No packages found. Register packages before creating shipments.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {manufacturerPackages.map((pkg) => {
                const id = pkg.package_uuid ?? pkg.id ?? "";
                const label = pkg.packageCode || `Package ${id}`;
                return (
                  <div
                    key={id}
                    className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-foreground">{label}</span>
                      <Badge variant="outline">
                        Qty {pkg.quantityAvailable ?? pkg.quantity ?? "N/A"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground break-all">
                      UUID: {id || "Unknown"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


