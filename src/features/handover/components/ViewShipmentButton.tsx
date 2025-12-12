import { useEffect, useState } from "react";
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
  const [resolvedShipmentId, setResolvedShipmentId] = useState<string | undefined>(
    shipmentId
  );

  // Keep resolved ID in sync if prop changes
  useEffect(() => {
    if (shipmentId && shipmentId !== resolvedShipmentId) {
      setResolvedShipmentId(shipmentId);
    }
  }, [shipmentId, resolvedShipmentId]);

  // For segments, we need to fetch the segment first to get the shipment ID
  const { data: segmentData, isLoading: loadingSegment } = useQuery({
    queryKey: ["shipmentSegment", segmentId],
    queryFn: () => shipmentService.getSegmentById(segmentId!),
    enabled: open && Boolean(segmentId),
    refetchOnMount: "always",
  });

  // Capture shipment ID when segment data arrives
  useEffect(() => {
    if (resolvedShipmentId) return;
    const derived =
      segmentData?.shipmentId ||
      segmentData?.shipment_id ||
      segmentData?.shipment?.id;
    if (derived) {
      setResolvedShipmentId(String(derived));
    }
  }, [segmentData, resolvedShipmentId]);

  // Fetch full shipment details
  const { data: shipmentData, isLoading: loadingShipment } =
    useQuery<ShipmentDetailResponse>({
      queryKey: ["shipmentDetail", resolvedShipmentId],
      queryFn: () => shipmentService.getById(resolvedShipmentId!),
      // Suppliers viewing a segment don't need full shipment details
      enabled: open && Boolean(resolvedShipmentId) && !segmentId,
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
        disabled={!shipmentId && !segmentId}
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
        loading={isLoading}
        shipment={shipmentData || null}
        segment={segmentData || null}
      />
    </>
  );
}
