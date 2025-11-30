import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { shipmentService } from "@/services/shipmentService";
import { ViewShipmentDialog } from "./ViewShipmentDialog";
import type { ShipmentDetailResponse } from "../types";

type ViewShipmentButtonProps = {
  shipmentId?: string;
  segmentId?: string;
};

export function ViewShipmentButton({
  shipmentId,
  segmentId,
}: ViewShipmentButtonProps) {
  const [open, setOpen] = useState(false);

  // For segments, we need to fetch the segment first to get the shipment ID
  const { data: segmentData, isLoading: loadingSegment } = useQuery({
    queryKey: ["shipmentSegment", segmentId],
    queryFn: () => shipmentService.getSegmentById(segmentId!),
    enabled: open && Boolean(segmentId) && !shipmentId,
  });

  // Determine the actual shipment ID
  const actualShipmentId = shipmentId || segmentData?.shipmentId;

  // Fetch full shipment details
  const { data: shipmentData, isLoading: loadingShipment } =
    useQuery<ShipmentDetailResponse>({
      queryKey: ["shipmentDetail", actualShipmentId],
      queryFn: () => shipmentService.getById(actualShipmentId!),
      enabled: open && Boolean(actualShipmentId),
    });

  const isLoading = loadingSegment || loadingShipment;

  if (!shipmentId && !segmentId) {
    console.warn(
      "ViewShipmentButton requires either a segmentId or shipmentId."
    );
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </>
        ) : (
          <>
            <Eye className="h-4 w-4 mr-2" />
            View
          </>
        )}
      </Button>

      <ViewShipmentDialog
        open={open}
        onOpenChange={setOpen}
        shipment={shipmentData || null}
      />
    </>
  );
}
