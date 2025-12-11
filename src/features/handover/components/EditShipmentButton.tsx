import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { shipmentService, type CreateShipmentRequest } from "@/services/shipmentService";
import type { ManufacturerShipmentRecord, ShipmentLegInput } from "../types";

type EditShipmentButtonProps = {
  shipment: ManufacturerShipmentRecord;
  onUpdated: () => void;
};

const DEFAULT_LEG: ShipmentLegInput = {
  startId: "",
  endId: "",
  estArrival: "",
  expectedShip: "",
  timeTolerance: "",
  requiredAction: "",
};

export function EditShipmentButton({ shipment, onUpdated }: EditShipmentButtonProps) {
  const [open, setOpen] = useState(false);
  const [dest, setDest] = useState<string>(
    shipment.destinationPartyUUID ?? shipment.toUUID ?? "",
  );
  const [legs, setLegs] = useState<ShipmentLegInput[]>(
    (shipment.checkpoints ?? []).map((checkpoint) => ({
      startId: String(checkpoint.start_checkpoint_id ?? ""),
      endId: String(checkpoint.end_checkpoint_id ?? ""),
      estArrival: checkpoint.estimated_arrival_date ?? "",
      expectedShip: checkpoint.expected_ship_date ?? "",
      timeTolerance: checkpoint.time_tolerance ?? "",
      requiredAction: checkpoint.required_action ?? "",
    })),
  );

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CreateShipmentRequest>) =>
      shipmentService.update(String(shipment.id), payload),
    onSuccess: () => {
      onUpdated();
      setOpen(false);
    },
  });

  const toISO = (value: string) => {
    if (!value) return "";
    try {
      return new Date(value).toISOString();
    } catch {
      return value;
    }
  };

  const handleSave = () => {
    const checkpointsPayload = legs
      .filter((leg) => leg.startId && leg.endId)
      .map((leg, index) => ({
        start_checkpoint_id: Number.isFinite(Number(leg.startId))
          ? Number(leg.startId)
          : leg.startId,
        end_checkpoint_id: Number.isFinite(Number(leg.endId)) ? Number(leg.endId) : leg.endId,
        estimated_arrival_date: toISO(leg.estArrival),
        time_tolerance: leg.timeTolerance || undefined,
        expected_ship_date: toISO(leg.expectedShip),
        segment_order: index + 1,
        ...(leg.requiredAction ? { required_action: leg.requiredAction } : {}),
      }));

    updateMutation.mutate({
      destinationPartyUUID: dest,
      checkpoints: checkpointsPayload,
    });
  };

  const updateLeg = (index: number, patch: Partial<ShipmentLegInput>) => {
    setLegs((prev) =>
      prev.map((leg, idx) => (idx === index ? { ...leg, ...patch } : leg)),
    );
  };

  const addLeg = () => setLegs((prev) => [...prev, { ...DEFAULT_LEG }]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shipment</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Destination Party UUID</label>
            <Input value={dest} onChange={(event) => setDest(event.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Route Legs</p>
            {legs.map((leg, index) => (
              <div
                key={`edit-leg-${index}`}
                className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-2"
              >
                <div>
                  <label className="text-xs text-muted-foreground">Start Checkpoint</label>
                  <Input
                    placeholder="Start checkpoint ID"
                    value={leg.startId}
                    onChange={(event) => updateLeg(index, { startId: event.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Checkpoint</label>
                  <Input
                    placeholder="End checkpoint ID"
                    value={leg.endId}
                    onChange={(event) => updateLeg(index, { endId: event.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Expected Ship Date</label>
                  <Input
                    type="datetime-local"
                    value={leg.expectedShip}
                    onChange={(event) => updateLeg(index, { expectedShip: event.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Estimated Arrival</label>
                  <Input
                    type="datetime-local"
                    value={leg.estArrival}
                    onChange={(event) => updateLeg(index, { estArrival: event.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Time Tolerance</label>
                  <Input
                    placeholder="2h"
                    value={leg.timeTolerance}
                    onChange={(event) => updateLeg(index, { timeTolerance: event.target.value })}
                  />
                </div>
                {/* <div>
                  <label className="text-xs text-muted-foreground">Required Action</label>
                  <Textarea
                    rows={2}
                    placeholder="Temperature check"
                    value={leg.requiredAction ?? ""}
                    onChange={(event) => updateLeg(index, { requiredAction: event.target.value })}
                  />
                </div> */}
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addLeg}>
              Add leg
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
