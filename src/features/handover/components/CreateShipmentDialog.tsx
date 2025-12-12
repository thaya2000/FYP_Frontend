import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Lock,
  Trash2,
  ChevronDown,
  X,
  Check,
  Package,
  MapPin,
  Globe2,
  Calendar,
  Clock,
  AlertCircle,
  TruckIcon,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useHandoverSharedContext, useManufacturerContext } from "../context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";

type CheckpointOption = {
  id: string;
  name: string;
  state?: string;
  country?: string;
  owner_uuid?: string;
  ownerUUID?: string;
};

export function CreateShipmentDialog() {
  const shared = useHandoverSharedContext();
  const manufacturer = useManufacturerContext();
  const queryClient = useQueryClient();
  const [destSearch, setDestSearch] = useState("");
  const manufacturerAutoFilledRef = useRef(false);
  const consumerAutoFilledRef = useRef(false);
  const lastConsumerEndRef = useRef<{ dest?: string; endId?: string }>({});

  const {
    createOpen,
    setCreateOpen,
    handleCreateShipment,
    creatingShipment,
    destUUID,
    setDestUUID,
    loadingManufacturerPackages,
    availablePackages,
    selectedPackageIds,
    togglePackageSelection,
    legs,
    setLegs,
  } = manufacturer;

  const { uuid, role } = shared;

  // Refetch checkpoint data when dialog opens
  useEffect(() => {
    if (createOpen && uuid && manufacturer.enabled && role === "MANUFACTURER") {
      // Refetch manufacturer checkpoints for first leg start
      queryClient.invalidateQueries({
        queryKey: ["manufacturer-checkpoints", uuid],
      });
      // Refetch warehouse checkpoints for middle legs
      queryClient.invalidateQueries({
        queryKey: ["warehouse-checkpoints"],
      });
      // Refetch all consumer checkpoints for destination dropdown
      queryClient.invalidateQueries({
        queryKey: ["all-consumer-checkpoints"],
      });
    }
  }, [createOpen, uuid, manufacturer.enabled, role, queryClient]);

  // Reset form data when dialog closes
  useEffect(() => {
    if (!createOpen) {
      // Reset auto-fill flags when dialog closes
      manufacturerAutoFilledRef.current = false;
      consumerAutoFilledRef.current = false;
      // Reset all form values
      setDestUUID("");
      setDestSearch("");
      setLegs([
        {
          startId: "",
          endId: "",
          estArrival: "",
          expectedShip: "",
          timeTolerance: "",
          requiredAction: "",
        },
      ]);
      // Deselect all packages
      selectedPackageIds.forEach((id) => togglePackageSelection(id, false));
    }
  }, [
    createOpen,
    setDestUUID,
    setLegs,
    selectedPackageIds,
    togglePackageSelection,
  ]);

  // Fetch Manufacturer's checkpoints (for first leg start)
  const {
    data: manufacturerCheckpoints = [],
    isLoading: loadingManufacturerCheckpoints,
  } = useQuery<CheckpointOption[]>({
    queryKey: ["manufacturer-checkpoints", uuid],
    queryFn: async () => {
      const res = await api.get("/api/checkpoints", {
        params: { ownerType: "MANUFACTURER", userId: uuid },
      });
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      return [];
    },
    enabled: Boolean(uuid) && manufacturer.enabled && role === "MANUFACTURER",
    staleTime: 60_000,
  });

  // Fetch all Consumer checkpoints initially (for dropdown)
  const { data: allConsumerCheckpoints = [], isLoading: loadingAllConsumers } =
    useQuery<CheckpointOption[]>({
      queryKey: ["all-consumer-checkpoints"],
      queryFn: async () => {
        const res = await api.get("/api/checkpoints", {
          params: { ownerType: "CONSUMER" },
        });
        const payload = res.data;
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.data)) return payload.data;
        return [];
      },
      enabled: manufacturer.enabled,
      staleTime: 60_000,
    });

  // Use all consumers (no search mode)
  const destinationResults = allConsumerCheckpoints;
  const loadingDestinations = loadingAllConsumers;

  // Fetch Consumer's checkpoints (for last leg end) based on selected destination
  const {
    data: consumerCheckpoints = [],
    isLoading: loadingConsumerCheckpoints,
  } = useQuery<CheckpointOption[]>({
    queryKey: ["consumer-checkpoints", destUUID],
    queryFn: async () => {
      const res = await api.get("/api/checkpoints", {
        params: { userId: destUUID },
      });
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      return [];
    },
    enabled: Boolean(destUUID) && manufacturer.enabled,
    staleTime: 30_000,
  });

  // Fetch Warehouse checkpoints (for middle legs)
  const {
    data: warehouseCheckpoints = [],
    isLoading: loadingWarehouseCheckpoints,
  } = useQuery<CheckpointOption[]>({
    queryKey: ["warehouse-checkpoints"],
    queryFn: async () => {
      const res = await api.get("/api/checkpoints", {
        params: { ownerType: "WAREHOUSE" },
      });
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      return [];
    },
    enabled: manufacturer.enabled,
    staleTime: 60_000,
  });

  // Determine if manufacturer checkpoint is locked (only 1 available)
  const isManufacturerLocked = manufacturerCheckpoints.length === 1;
  const isConsumerLocked = consumerCheckpoints.length === 1;

  // Auto-fill first leg start checkpoint when manufacturer has only 1 checkpoint (only on initial open)
  useEffect(() => {
    if (
      manufacturerCheckpoints.length === 1 &&
      createOpen &&
      !manufacturerAutoFilledRef.current
    ) {
      manufacturerAutoFilledRef.current = true;
      setLegs((currentLegs) => {
        if (currentLegs.length === 0) return currentLegs;
        const firstLeg = currentLegs[0];
        const checkpointId = manufacturerCheckpoints[0].id;
        // Only update if not already set
        if (!firstLeg.startId) {
          return [
            { ...firstLeg, startId: checkpointId },
            ...currentLegs.slice(1),
          ];
        }
        return currentLegs;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen]);

  // Auto-fill last leg end checkpoint when consumer has only 1 checkpoint (only on initial open)
  useEffect(() => {
    if (
      consumerCheckpoints.length === 1 &&
      createOpen &&
      destUUID &&
      !consumerAutoFilledRef.current
    ) {
      setLegs((currentLegs) => {
        if (currentLegs.length === 0) return currentLegs;
        const lastIndex = currentLegs.length - 1;
        const lastLeg = currentLegs[lastIndex];
        const checkpointId = consumerCheckpoints[0].id;
        // Only update if not already set
        if (lastLeg.endId) {
          consumerAutoFilledRef.current = true;
          lastConsumerEndRef.current = { dest: destUUID, endId: lastLeg.endId };
          return currentLegs;
        }
        consumerAutoFilledRef.current = true;
        lastConsumerEndRef.current = { dest: destUUID, endId: checkpointId };
        return [
          ...currentLegs.slice(0, lastIndex),
          { ...lastLeg, endId: checkpointId },
        ];
        return currentLegs;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, destUUID, consumerCheckpoints.length]);

  // Allow auto-fill again when destination changes
  useEffect(() => {
    consumerAutoFilledRef.current = false;
    lastConsumerEndRef.current = { dest: destUUID };
  }, [destUUID]);

  // Allow auto-fill again when legs length changes (e.g., adding/removing stops)
  useEffect(() => {
    consumerAutoFilledRef.current = false;
  }, [legs.length]);

  // Ensure last leg end stays aligned with selected destination's checkpoints
  useEffect(() => {
    if (!createOpen || !destUUID || consumerCheckpoints.length === 0) return;

    setLegs((currentLegs) => {
      if (currentLegs.length === 0) return currentLegs;

      const lastIndex = currentLegs.length - 1;
      const lastLeg = currentLegs[lastIndex];
      const validEndIds = consumerCheckpoints.map((cp) => String(cp.id));
      const currentEndId = lastLeg.endId ? String(lastLeg.endId) : "";

      // Keep current end if it is still valid for the destination
      if (currentEndId && validEndIds.includes(currentEndId)) {
        lastConsumerEndRef.current = { dest: destUUID, endId: currentEndId };
        return currentLegs;
      }

      // Use cached end for this destination if still valid; otherwise first option
      const cachedEndId =
        lastConsumerEndRef.current.dest === destUUID
          ? lastConsumerEndRef.current.endId
          : undefined;
      const fallbackEndId =
        cachedEndId && validEndIds.includes(cachedEndId)
          ? cachedEndId
          : validEndIds[0];

      if (!fallbackEndId) return currentLegs;

      lastConsumerEndRef.current = { dest: destUUID, endId: fallbackEndId };

      return [
        ...currentLegs.slice(0, lastIndex),
        { ...lastLeg, endId: fallbackEndId },
      ];
    });
  }, [createOpen, destUUID, consumerCheckpoints, legs.length, setLegs]);

  const destinationOptions = useMemo(() => {
    return destinationResults.map((item: CheckpointOption) => {
      const labelLeft = item?.name || "Checkpoint";
      const labelRight = item?.state || item?.country || item?.id || "";
      const value = item?.owner_uuid || item?.ownerUUID || item?.id || "";
      return {
        value: String(value),
        label: `${labelLeft} - ${labelRight}`,
      };
    });
  }, [destinationResults]);

  // Guard set to prevent repetitive toggles per package
  const toggleInProgressRef = useRef<Set<string>>(new Set());

  // Keep leg timing logical: each leg departs after/at previous arrival and arrives after/at its own departure
  const normalizeLegTimings = useCallback(
    (draftLegs: typeof legs) => {
      const normalized = draftLegs.map((leg) => ({ ...leg }));
      for (let i = 0; i < normalized.length; i++) {
        const prev = normalized[i - 1];
        const prevAnchor = prev ? prev.estArrival || prev.expectedShip : "";

        // Departure cannot be before previous leg's arrival
        if (
          prevAnchor &&
          normalized[i].expectedShip &&
          normalized[i].expectedShip < prevAnchor
        ) {
          normalized[i].expectedShip = prevAnchor;
        }

        // Arrival cannot be before departure (or previous arrival if departure unset)
        const departAnchor = normalized[i].expectedShip || prevAnchor;
        if (
          departAnchor &&
          normalized[i].estArrival &&
          normalized[i].estArrival < departAnchor
        ) {
          normalized[i].estArrival = departAnchor;
        }
      }
      return normalized;
    },
    [legs]
  );

  const handlePackageClick = useCallback(
    (id: string, selected: boolean) => {
      if (toggleInProgressRef.current.has(id)) return;
      toggleInProgressRef.current.add(id);
      try {
        togglePackageSelection(id, !selected);
      } finally {
        setTimeout(() => toggleInProgressRef.current.delete(id), 150);
      }
    },
    [togglePackageSelection]
  );

  const [destPopoverOpen, setDestPopoverOpen] = useState(false);

  const handleSelectDestination = useCallback(
    (option: { value: string; label: string }) => {
      setDestUUID(option.value);
      setDestSearch(option.label);
      // Close popover after selecting
      setDestPopoverOpen(false);
    },
    [setDestUUID]
  );

  const selectedDestinationLabel = useMemo(() => {
    if (!destUUID && destSearch) return destSearch;
    const found = destinationOptions.find((o) => o.value === destUUID);
    return found ? found.label : destSearch || "";
  }, [destUUID, destinationOptions, destSearch]);

  // Add a middle leg (inserted before the last leg)
  const addMiddleLeg = useCallback(() => {
    if (legs.length === 0) return;

    setLegs((arr) => {
      const insertIndex = arr.length - 1; // Insert before the last leg
      const lastLeg = arr[insertIndex]; // The current last leg
      const previousLeg = arr[insertIndex - 1]; // The leg before where we're inserting
      const isFirstInsertion = insertIndex === 0;

      // Preserve the manufacturer start on the first insertion; otherwise chain from previous leg
      const newLegStartId = isFirstInsertion
        ? lastLeg.startId
        : previousLeg?.endId || "";

      // Special handling for first insertion to avoid moving user-entered fields
      if (isFirstInsertion) {
        const preservedFirstLeg = {
          ...lastLeg,
          endId: "", // user will select the warehouse end, keep other fields
        };
        const newLastLeg = {
          startId: "",
          endId: lastLeg.endId, // keep the consumer end selection if already chosen
          estArrival: "",
          expectedShip: "",
          timeTolerance: "",
          requiredAction: "",
        };
        return [preservedFirstLeg, newLastLeg];
      }

      // If there are exactly two legs (origin -> consumer) and we add a stop,
      // keep the previously entered timing fields on the new middle leg so
      // they don't appear to "shift" to the new last leg.
      if (arr.length === 2) {
        const newLeg = {
          startId: newLegStartId,
          endId: "", // user picks warehouse end
          estArrival: lastLeg.estArrival,
          expectedShip: lastLeg.expectedShip,
          timeTolerance: lastLeg.timeTolerance,
          requiredAction: lastLeg.requiredAction,
        };
        const updatedLastLeg = {
          ...lastLeg,
          startId: "",
          estArrival: "",
          expectedShip: "",
          timeTolerance: "",
          requiredAction: "",
        };
        return [...arr.slice(0, insertIndex), newLeg, updatedLastLeg];
      }

      const newLeg = {
        startId: newLegStartId, // Start where previous leg ended (or stay at manufacturer on first add)
        endId: "", // User will select warehouse checkpoint
        estArrival: "",
        expectedShip: "",
        timeTolerance: "",
        requiredAction: "",
      };

      // Clear the last leg's startId so it can sync to the new leg's end
      const updatedLastLeg = { ...lastLeg, startId: "" };

      const newArr = [...arr.slice(0, insertIndex), newLeg, updatedLastLeg];
      return newArr;
    });
  }, [legs.length, setLegs]);

  // Remove a leg (can remove any leg except first/Manufacturer)
  const removeMiddleLeg = useCallback(
    (index: number) => {
      if (legs.length < 2) return; // Can't remove if only 1 leg
      if (index === 0) return; // Can't remove first leg (Manufacturer/Origin)

      setLegs((arr) => {
        const newArr = arr.filter((_, idx) => idx !== index);
        // After removal, sync: previous leg's endId should connect to next leg's startId
        // The leg that was after the removed one now needs to sync with the leg before
        if (index > 0 && index < newArr.length) {
          const prevLegEndId = newArr[index - 1].endId;
          newArr[index] = { ...newArr[index], startId: prevLegEndId };
        }
        return newArr;
      });
    },
    [legs.length, setLegs]
  );

  // Helper to format checkpoint label
  const formatCheckpointLocation = useCallback((cp: CheckpointOption) => {
    const location = [cp.state, cp.country].filter(Boolean).join(", ");
    return location || "Location not specified";
  }, []);

  const formatCheckpointFull = useCallback(
    (cp?: CheckpointOption) => {
      if (!cp) return "";
      const name = cp.name || "Checkpoint";
      const location = formatCheckpointLocation(cp);
      return `${name} — ${location}`;
    },
    [formatCheckpointLocation]
  );

  const formatCheckpointDisplay = useCallback(
    (cp: CheckpointOption) => {
      const name = cp.name || "Checkpoint";
      const location = formatCheckpointLocation(cp);
      return `${name} · ${location}`;
    },
    [formatCheckpointLocation]
  );

  // Determine checkpoint options based on leg position
  const getStartCheckpointOptions = useCallback(
    (legIndex: number): CheckpointOption[] => {
      if (legIndex === 0) {
        // First leg: manufacturer checkpoints only
        return manufacturerCheckpoints;
      }
      // Middle legs: warehouse checkpoints
      return warehouseCheckpoints;
    },
    [manufacturerCheckpoints, warehouseCheckpoints]
  );

  const getEndCheckpointOptions = useCallback(
    (legIndex: number): CheckpointOption[] => {
      const isLastLeg = legIndex === legs.length - 1;
      if (isLastLeg) {
        // Last leg: consumer checkpoints only
        return consumerCheckpoints;
      }
      // First or middle legs: warehouse checkpoints
      return warehouseCheckpoints;
    },
    [consumerCheckpoints, warehouseCheckpoints, legs.length]
  );

  const isStartLocked = useCallback(
    (legIndex: number): boolean => {
      // First leg: locked if only one manufacturer checkpoint
      if (legIndex === 0) return isManufacturerLocked;
      // All other legs: start is synced from previous leg's end, so always locked
      return true;
    },
    [isManufacturerLocked]
  );

  const isEndLocked = useCallback(
    (legIndex: number): boolean => {
      const isLastLeg = legIndex === legs.length - 1;
      if (isLastLeg) return isConsumerLocked;
      return false;
    },
    [isConsumerLocked, legs.length]
  );

  const isLoadingStart = useCallback(
    (legIndex: number): boolean => {
      if (legIndex === 0) return loadingManufacturerCheckpoints;
      return loadingWarehouseCheckpoints;
    },
    [loadingManufacturerCheckpoints, loadingWarehouseCheckpoints]
  );

  const isLoadingEnd = useCallback(
    (legIndex: number): boolean => {
      const isLastLeg = legIndex === legs.length - 1;
      if (isLastLeg) return loadingConsumerCheckpoints;
      return loadingWarehouseCheckpoints;
    },
    [loadingConsumerCheckpoints, loadingWarehouseCheckpoints, legs.length]
  );

  const getLegTypeLabel = useCallback(
    (index: number): string => {
      if (index === 0) return "Origin (Manufacturer)";
      if (index === legs.length - 1) return "Destination (Consumer)";
      return `Warehouse Stop ${index}`;
    },
    [legs.length]
  );

  const canRemoveLeg = useCallback(
    (index: number): boolean => {
      // Can remove any leg except the first (Manufacturer/Origin)
      // Minimum 1 leg is allowed (direct Manufacturer → Consumer)
      // Cannot remove leg at position 0 (always keep Manufacturer origin)
      return legs.length >= 2 && index > 0;
    },
    [legs.length]
  );

  // Validate that all legs have required fields filled
  const areAllLegsValid = useMemo(() => {
    return legs.every((leg) => {
      // Check required fields: startId, endId, expectedShip, estArrival, timeTolerance
      return (
        leg.startId?.trim() &&
        leg.endId?.trim() &&
        leg.expectedShip?.trim() &&
        leg.estArrival?.trim() &&
        leg.timeTolerance?.trim()
      );
    });
  }, [legs]);

  // Early return after all hooks
  if (!manufacturer.enabled || role !== "MANUFACTURER") {
    return null;
  }

  return (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" />
          New Shipment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <TruckIcon className="w-6 h-6 text-primary" />
            Create Shipment
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Configure your shipment route, select packages, and define
            checkpoint legs
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleCreateShipment}
          className="flex-1 overflow-y-auto space-y-6 py-4 px-1"
        >
          {/* Destination Party Section */}
          <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-primary" />
              <label className="text-sm font-semibold">
                Destination Party (Consumer)
              </label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Select the consumer checkpoint where this shipment will be
              delivered
            </p>
            <Popover open={destPopoverOpen} onOpenChange={setDestPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between border-2 rounded-lg px-4 py-3.5 bg-background text-left text-sm hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all min-h-[48px] shadow-sm"
                  onClick={() => setDestPopoverOpen((v) => !v)}
                >
                  <span
                    className={
                      selectedDestinationLabel
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {selectedDestinationLabel ||
                      "Select consumer checkpoint..."}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 ml-2 text-muted-foreground transition-transform duration-200 ${
                      destPopoverOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 shadow-lg"
                align="start"
                sideOffset={4}
              >
                <div className="max-h-72 overflow-y-auto">
                  {loadingDestinations ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading consumers...
                    </div>
                  ) : destinationOptions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      No consumer checkpoints available.
                    </div>
                  ) : (
                    destinationOptions.map((option) => {
                      const isSelected = option.value === String(destUUID);
                      return (
                        <button
                          key={option.value + option.label}
                          type="button"
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-all min-h-[48px] border-b last:border-b-0 ${
                            isSelected
                              ? "bg-primary/10 text-primary font-semibold border-primary/20"
                              : "hover:bg-accent/80"
                          }`}
                          onClick={() => handleSelectDestination(option)}
                        >
                          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            )}
                          </span>
                          <span className="flex-1 truncate">
                            {option.label}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {destUUID && selectedDestinationLabel && (
              <div className="mt-3 p-4 rounded-lg border-2 border-primary/30 bg-primary/5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <p className="text-sm font-semibold text-foreground">
                        {selectedDestinationLabel}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono pl-6">
                      UUID: {destUUID}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDestUUID("");
                      setDestSearch("");
                    }}
                    className="flex-shrink-0 p-1.5 hover:bg-background/80 rounded-md transition-colors"
                    aria-label="Clear selection"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Packages Section */}
          <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold">Select Packages</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Choose the package UUIDs that should be included in this shipment
            </p>

            {loadingManufacturerPackages ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading packages...
              </div>
            ) : availablePackages.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    No registered packages found for this manufacturer. Register
                    packages before creating a shipment.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                  {availablePackages.map((pkg) => {
                    const rawId = pkg.package_uuid ?? pkg.id;
                    if (!rawId) return null;
                    const packageId = String(rawId);
                    const availableQuantity =
                      pkg.quantityAvailable ?? pkg.quantity ?? "N/A";
                    const productName =
                      pkg.batch?.product?.productName ??
                      pkg.batch?.product?.name ??
                      undefined;
                    const label = pkg.packageCode || `Package ${packageId}`;
                    const isSelected = selectedPackageIds.includes(packageId);

                    // Use the top-level handlePackageClick (defined once) to avoid hooks in loops

                    return (
                      <div
                        key={packageId}
                        className={`flex items-start justify-between gap-3 rounded-lg border-2 px-4 py-3 text-sm transition-all cursor-pointer group ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-md scale-[1.01]"
                            : "bg-background border-border/60 hover:bg-accent/50 hover:border-border hover:shadow-sm"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Package
                            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <span className="font-semibold text-foreground leading-tight">
                              {label}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {packageId.slice(0, 12)}...{packageId.slice(-6)}
                            </span>
                            {productName && (
                              <span className="text-xs text-muted-foreground">
                                <span className="font-medium">Product:</span>{" "}
                                {productName}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              <span className="font-medium">Available:</span>{" "}
                              <span
                                className={`font-semibold ${
                                  isSelected ? "text-primary" : ""
                                }`}
                              >
                                {availableQuantity}
                              </span>
                            </span>
                          </div>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            togglePackageSelection(packageId, checked === true);
                          }}
                          aria-label={`Select package ${label}`}
                          className="flex-shrink-0 mt-1 h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 mt-2 border-t flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {selectedPackageIds.length === 0
                      ? "No packages selected"
                      : `${selectedPackageIds.length} package${
                          selectedPackageIds.length === 1 ? "" : "s"
                        } selected`}
                  </p>
                  {selectedPackageIds.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready to ship
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Route Checkpoint Legs Section */}
          <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold">Route Checkpoint Legs</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Define the shipment route from your checkpoint to the consumer.
              Add warehouse stops if needed
            </p>

            {/* Manufacturer checkpoint status */}
            {loadingManufacturerCheckpoints ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-3 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading your checkpoints...
              </div>
            ) : manufacturerCheckpoints.length === 0 ? (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    No checkpoints found for your account. Please register a
                    checkpoint first.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {legs.map((leg, index) => {
                const startOptions = getStartCheckpointOptions(index);
                const endOptions = getEndCheckpointOptions(index);
                const selectedStart = startOptions.find(
                  (cp) => String(cp.id) === String(leg.startId)
                );
                const selectedEnd = endOptions.find(
                  (cp) => String(cp.id) === String(leg.endId)
                );
                const startLocked = isStartLocked(index);
                const endLocked = isEndLocked(index);
                const loadingStart = isLoadingStart(index);
                const loadingEnd = isLoadingEnd(index);
                const isFirstLeg = index === 0;
                const isLastLeg = index === legs.length - 1;
                const isMiddleLeg = !isFirstLeg && !isLastLeg;

                return (
                  <div
                    key={`leg-${index}`}
                    className="rounded-lg border-2 border-border/60 p-4 space-y-4 bg-background shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Leg Header */}
                    <div className="flex items-center justify-between pb-3 border-b">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                            isFirstLeg
                              ? "bg-primary text-primary-foreground"
                              : isLastLeg
                              ? "bg-green-500 text-white"
                              : "bg-orange-500 text-white"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <span className="text-sm font-semibold block">
                            Leg {index + 1}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getLegTypeLabel(index)}
                          </span>
                        </div>
                      </div>
                      {canRemoveLeg(index) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMiddleLeg(index)}
                          className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Start Checkpoint */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          Start Checkpoint
                          {startLocked && <Lock className="w-3 h-3" />}
                          {isFirstLeg && (
                            <span className="text-xs ml-1">(Manufacturer)</span>
                          )}
                          {isMiddleLeg && (
                            <span className="text-xs ml-1">(Warehouse)</span>
                          )}
                        </label>
                        {loadingStart ? (
                          <div className="flex items-center gap-2 h-11 px-3 border-2 rounded-lg bg-muted/20">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              Loading...
                            </span>
                          </div>
                        ) : startOptions.length === 0 ? (
                          <div className="flex items-center gap-2 h-11 px-3 border-2 rounded-lg bg-muted/20">
                            <AlertCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              No checkpoints available
                            </span>
                          </div>
                        ) : (
                          <Select
                            value={leg.startId}
                            onValueChange={(value) =>
                              setLegs((arr) =>
                                arr.map((item, idx) => {
                                  if (idx === index) {
                                    return { ...item, startId: value };
                                  }
                                  if (idx === index - 1) {
                                    return { ...item, endId: value };
                                  }
                                  return item;
                                })
                              )
                            }
                            disabled={startLocked}
                            title={
                              leg.startId ? formatCheckpointFull(selectedStart) : undefined
                            }
                          >
                            <SelectTrigger
                              className={`h-14 border-2 ${
                                startLocked ? "bg-muted/50" : ""
                              }`}
                            >
                              <div className="flex flex-col text-left w-full leading-tight">
                                {selectedStart ? (
                                  <>
                                    <span className="font-medium truncate">
                                      {selectedStart.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                                      {selectedStart.state && (
                                        <span className="flex items-center gap-1 truncate">
                                          <MapPin className="w-3 h-3" />
                                          <span className="truncate">
                                            {selectedStart.state}
                                          </span>
                                        </span>
                                      )}
                                      {selectedStart.country && (
                                        <span className="flex items-center gap-1 truncate">
                                          <Globe2 className="w-3 h-3" />
                                          <span className="truncate">
                                            {selectedStart.country}
                                          </span>
                                        </span>
                                      )}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    <SelectValue placeholder="Select start checkpoint" />
                                  </span>
                                )}
                              </div>
                              {/* Hidden value to keep Radix selection rendering happy */}
                              <SelectValue className="sr-only" />
                            </SelectTrigger>
                            <SelectContent>
                              {startOptions.map((checkpoint) => {
                                const id = String(checkpoint.id);
                                return (
                                  <SelectItem
                                    key={`${id}-start-${index}`}
                                    value={id}
                                    title={formatCheckpointFull(checkpoint)}
                                  >
                                    {formatCheckpointDisplay(checkpoint)}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* End Checkpoint */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          End Checkpoint
                          {endLocked && <Lock className="w-3 h-3" />}
                          {isLastLeg && (
                            <span className="text-xs ml-1">(Consumer)</span>
                          )}
                          {!isLastLeg && (
                            <span className="text-xs ml-1">(Warehouse)</span>
                          )}
                        </label>
                        {loadingEnd ? (
                          <div className="flex items-center gap-2 h-11 px-3 border-2 rounded-lg bg-muted/20">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              Loading...
                            </span>
                          </div>
                        ) : isLastLeg && !destUUID ? (
                          <div className="flex items-center gap-2 h-11 px-3 border-2 rounded-lg bg-muted/20">
                            <AlertCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Select destination party first
                            </span>
                          </div>
                        ) : endOptions.length === 0 ? (
                          <div className="flex items-center gap-2 h-11 px-3 border-2 rounded-lg bg-muted/20">
                            <AlertCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              No checkpoints available
                            </span>
                          </div>
                        ) : (
                          <Select
                            value={leg.endId}
                            onValueChange={(value) =>
                              setLegs((arr) =>
                                arr.map((item, idx) => {
                                  if (idx === index) {
                                    if (isLastLeg) {
                                      lastConsumerEndRef.current = {
                                        dest: destUUID,
                                        endId: value,
                                      };
                                    }
                                    return { ...item, endId: value };
                                  }
                                  if (idx === index + 1) {
                                    return { ...item, startId: value };
                                  }
                                  return item;
                                })
                              )
                            }
                            disabled={endLocked}
                            title={
                              leg.endId ? formatCheckpointFull(selectedEnd) : undefined
                            }
                          >
                            <SelectTrigger
                              className={`h-14 border-2 ${
                                endLocked ? "bg-muted/50" : ""
                              }`}
                            >
                              <div className="flex flex-col text-left w-full leading-tight">
                                {selectedEnd ? (
                                  <>
                                    <span className="font-medium truncate">
                                      {selectedEnd.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                                      {selectedEnd.state && (
                                        <span className="flex items-center gap-1 truncate">
                                          <MapPin className="w-3 h-3" />
                                          <span className="truncate">
                                            {selectedEnd.state}
                                          </span>
                                        </span>
                                      )}
                                      {selectedEnd.country && (
                                        <span className="flex items-center gap-1 truncate">
                                          <Globe2 className="w-3 h-3" />
                                          <span className="truncate">
                                            {selectedEnd.country}
                                          </span>
                                        </span>
                                      )}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    <SelectValue placeholder="Select end checkpoint" />
                                  </span>
                                )}
                              </div>
                              {/* Hidden value to keep Radix selection rendering happy */}
                              <SelectValue className="sr-only" />
                            </SelectTrigger>
                            <SelectContent>
                              {endOptions.map((checkpoint) => {
                                const id = String(checkpoint.id);
                                return (
                                  <SelectItem
                                    key={`${id}-end-${index}`}
                                    value={id}
                                    title={formatCheckpointFull(checkpoint)}
                                  >
                                    {formatCheckpointDisplay(checkpoint)}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Expected Ship Date */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Expected Ship Date
                        </label>
                        <Input
                          type="datetime-local"
                          value={leg.expectedShip}
                          min={
                            index > 0
                              ? legs[index - 1].estArrival ||
                                legs[index - 1].expectedShip ||
                                undefined
                              : undefined
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            setLegs((arr) =>
                              normalizeLegTimings(
                                arr.map((item, idx) =>
                                  idx === index
                                    ? { ...item, expectedShip: value }
                                    : item
                                )
                              )
                            );
                          }}
                          className="h-11 border-2"
                        />
                      </div>

                      {/* Estimated Arrival */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Estimated Arrival
                        </label>
                        <Input
                          type="datetime-local"
                          value={leg.estArrival}
                          min={
                            leg.expectedShip ||
                            (index > 0
                              ? legs[index - 1].estArrival ||
                                legs[index - 1].expectedShip ||
                                undefined
                              : undefined)
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            setLegs((arr) =>
                              normalizeLegTimings(
                                arr.map((item, idx) =>
                                  idx === index
                                    ? { ...item, estArrival: value }
                                    : item
                                )
                              )
                            );
                          }}
                          className="h-11 border-2"
                        />
                      </div>

                      {/* Time Tolerance */}
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Time Tolerance
                        </label>
                        <Input
                          placeholder="e.g., 2h, 30m, 1d"
                          value={leg.timeTolerance}
                          onChange={(event) =>
                            setLegs((arr) =>
                              arr.map((item, idx) =>
                                idx === index
                                  ? {
                                      ...item,
                                      timeTolerance: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                          className="h-11 border-2"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Warehouse Stop Button */}
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={addMiddleLeg}
              disabled={warehouseCheckpoints.length === 0}
              className="w-full border-2 border-dashed hover:bg-accent/50 hover:border-primary transition-all h-11"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Warehouse Stop
            </Button>
            {warehouseCheckpoints.length === 0 &&
              !loadingWarehouseCheckpoints && (
                <div className="flex items-start gap-2 text-muted-foreground text-xs px-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>
                    No warehouse checkpoints available to add intermediate
                    stops.
                  </p>
                </div>
              )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              creatingShipment ||
              selectedPackageIds.length === 0 ||
              !destUUID ||
              !areAllLegsValid
            }
            className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {creatingShipment ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Shipment...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <TruckIcon className="w-5 h-5" />
                Create Shipment
              </span>
            )}
          </Button>

          {/* Validation messages */}
          {!creatingShipment && (
            <div className="space-y-1 text-xs">
              {selectedPackageIds.length === 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Please select at least one package</span>
                </div>
              )}
              {!destUUID && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Please select a destination party</span>
                </div>
              )}
              {!areAllLegsValid && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    Please complete all leg details (checkpoints, dates, and
                    time tolerance)
                  </span>
                </div>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
