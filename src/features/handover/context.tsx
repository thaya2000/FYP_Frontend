import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import {
  checkpointService,
  type Checkpoint,
} from "@/services/checkpointService";
import { shipmentService } from "@/services/shipmentService";
import {
  packageService,
  type PackageResponse,
} from "@/services/packageService";
import {
  deriveRouteLabel,
  extractShipmentItems,
  formatArrivalText,
  humanizeSupplierStatus,
  normalizeStatus,
  resolveShipmentAreas,
  supplierStatusBadgeClass,
} from "./utils";
import type {
  HandoverFormState,
  ManufacturerShipmentRecord,
  ShipmentLegInput,
  SupplierShipmentRecord,
  SupplierShipmentStatus,
} from "./types";

type ManufacturerContextValue = {
  enabled: boolean;
  manufacturerPackages: PackageResponse[];
  availablePackages: PackageResponse[];
  loadingManufacturerPackages: boolean;
  selectedPackageIds: string[];
  togglePackageSelection: (packageId: string, selected: boolean) => void;
  destUUID: string;
  setDestUUID: (value: string) => void;
  legs: ShipmentLegInput[];
  setLegs: React.Dispatch<React.SetStateAction<ShipmentLegInput[]>>;
  addLeg: () => void;
  resetLegs: () => void;
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  handleCreateShipment: (event: React.FormEvent<HTMLFormElement>) => void;
  creatingShipment: boolean;
  getShipmentsForStatus: (status: string) => {
    data: ManufacturerShipmentRecord[];
    isLoading: boolean;
    fetchNextPage: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
  };
  onShipmentsUpdated: () => void;
};

type SupplierContextValue = {
  enabled: boolean;
  incomingShipments: SupplierShipmentRecord[];
  loadingIncoming: boolean;
  loadingByStatus: Record<SupplierShipmentStatus, boolean>;
  shipmentsByStatus: Record<SupplierShipmentStatus, SupplierShipmentRecord[]>;
  statusOrder: SupplierShipmentStatus[];
  areaQuery: string;
  setAreaQuery: (value: string) => void;
  filterShipmentsByArea: (
    shipments: SupplierShipmentRecord[]
  ) => SupplierShipmentRecord[];
  acceptingShipmentId: string | null;
  acceptShipment: (id: string) => void;
  acceptShipmentPending: boolean;
  takeoverSegmentId: string | null;
  takeoverPending: boolean;
  takeoverSegment: (
    segmentId: string,
    coords: { latitude: number; longitude: number }
  ) => Promise<unknown>;
  handoverDialogOpen: boolean;
  setHandoverDialogOpen: (open: boolean) => void;
  handoverTarget: SupplierShipmentRecord | null;
  setHandoverTarget: (shipment: SupplierShipmentRecord | null) => void;
  handoverForm: HandoverFormState;
  setHandoverForm: (
    updater: (prev: HandoverFormState) => HandoverFormState
  ) => void;
  handoverLoading: boolean;
  submitHandover: () => Promise<void>;
  resetHandoverForm: () => void;
};

type SharedContextValue = {
  role?: string;
  uuid?: string;
  recentHandovers: Array<{
    id: string;
    productId: string;
    productName: string;
    from: string;
    to: string;
    timestamp: number;
    status: string;
    checkpoint: string;
  }>;
};

type HandoverContextValue = {
  manufacturer: ManufacturerContextValue;
  supplier: SupplierContextValue;
  shared: SharedContextValue;
};

const DEFAULT_LEG: ShipmentLegInput = {
  startId: "",
  endId: "",
  estArrival: "",
  expectedShip: "",
  timeTolerance: "",
  requiredAction: "",
};

const HandoverContext = createContext<HandoverContextValue | null>(null);

type TakeoverPayload = {
  segmentId: string;
  latitude: number;
  longitude: number;
};

const SUPPLIER_STATUS_ORDER: SupplierShipmentStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_TRANSIT",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
];

type SupplierStatusBuckets = Record<
  SupplierShipmentStatus,
  SupplierShipmentRecord[]
>;

const createStatusBuckets = (): SupplierStatusBuckets =>
  SUPPLIER_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {} as SupplierStatusBuckets);

const mapSegmentStatusToSupplierTab = (
  status?: string | null
): SupplierShipmentStatus => {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case "PENDING":
    case "PENDING_ACCEPTANCE":
    case "PREPARING":
    case "AWAITING_SUPPLIER_CONFIRMATION":
      return "PENDING";
    case "ACCEPTED":
      return "ACCEPTED";
    case "IN_TRANSIT":
    case "READY_FOR_HANDOVER":
    case "HANDOVER_PENDING":
      return "IN_TRANSIT";
    case "DELIVERED":
    case "HANDOVER_READY":
    case "HANDOVER_COMPLETED":
    case "COMPLETED":
      return "DELIVERED";
    case "CLOSED":
      return "CLOSED";
    case "CANCELLED":
    case "REJECTED":
      return "CANCELLED";
    default:
      return "PENDING";
  }
};

const formatCheckpointLabel = (
  checkpoint?: {
    state?: string | null;
    country?: string | null;
    name?: string | null;
  } | null
) => {
  if (!checkpoint) return undefined;
  const parts = [checkpoint.state, checkpoint.country]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
  if (parts.length > 0) {
    return parts.join(", ");
  }
  const fallback =
    typeof checkpoint.name === "string" ? checkpoint.name.trim() : "";
  return fallback.length > 0 ? fallback : undefined;
};

type ShipmentSegmentResponse = {
  id?: string;
  segmentHash?: string;
  shipmentId?: string;
  segmentId?: string;
  manufacturerUuid?: string;
  manufacturerLegalName?: string;
  consumerName?: string;
  status?: string | null;
  segmentOrder?: number;
  expectedShipDate?: string | null;
  expected_ship_date?: string | null;
  expectedArrivalDate?: string | null;
  expected_arrival_date?: string | null;
  estimatedArrivalDate?: string | null;
  estimated_arrival_date?: string | null;
  timeTolerance?: string | null;
  time_tolerance?: string | null;
  acceptedAt?: string | null;
  accepted_at?: string | null;
  handedOverAt?: string | null;
  handed_over_at?: string | null;
  startCheckpoint?: {
    id?: string;
    state?: string;
    country?: string;
    name?: string;
  } | null;
  endCheckpoint?: {
    id?: string;
    state?: string;
    country?: string;
    name?: string;
  } | null;
  shipment?: {
    id?: string;
    consumer?: {
      id?: string;
      legalName?: string;
    } | null;
    destinationPartyUUID?: string;
    destinationPartyName?: string;
  } | null;
  startName?: string | null;
  endName?: string | null;
  startLocation?: { state?: string | null; country?: string | null } | null;
  endLocation?: { state?: string | null; country?: string | null } | null;
  items?: SupplierShipmentRecord["items"];
  shipmentItems?: SupplierShipmentRecord["shipmentItems"];
  checkpoints?: SupplierShipmentRecord["checkpoints"];
  actions?: SupplierShipmentRecord["actions"];
  [key: string]: unknown;
};

const mapSegmentStatusToSupplierStatus = (
  status?: string | null
): SupplierShipmentStatus => {
  if (typeof status !== "string") return "PENDING";
  const normalized = status.trim().toUpperCase();
  if (!normalized) return "PENDING";
  switch (normalized) {
    case "PENDING":
    case "PENDING_SUPPLIER":
    case "AWAITING_SUPPLIER":
    case "AWAITING_SUPPLIER_CONFIRMATION":
    case "PENDING_ACCEPTANCE":
    case "PREPARING":
      return "PENDING";
    case "ACCEPTED":
      return "ACCEPTED";
    case "IN_TRANSIT":
    case "READY_FOR_HANDOVER":
    case "HANDOVER_PENDING":
      return "IN_TRANSIT";
    case "DELIVERED":
    case "HANDOVER_READY":
    case "HANDOVER_COMPLETED":
    case "COMPLETED":
      return "DELIVERED";
    case "CLOSED":
      return "CLOSED";
    case "CANCELLED":
    case "REJECTED":
      return "CANCELLED";
    default:
      return "PENDING";
  }
};

const segmentToSupplierShipment = (
  segment: ShipmentSegmentResponse
): SupplierShipmentRecord => {
  const derivedId =
    segment.shipmentId && segment.segmentOrder !== undefined
      ? `${segment.shipmentId}-${segment.segmentOrder}`
      : segment.shipmentId ?? undefined;
  const idCandidate =
    segment.segmentId ??
    segment.id ??
    segment.segmentHash ??
    derivedId ??
    "unknown-segment";

  const expectedArrival =
    segment.estimatedArrivalDate ??
    segment.estimated_arrival_date ??
    segment.expectedArrivalDate ??
    segment.expected_arrival_date ??
    undefined;

  const acceptedAt = segment.acceptedAt ?? segment.accepted_at ?? undefined;
  const handedOverAt =
    segment.handedOverAt ?? segment.handed_over_at ?? undefined;
  const startCheckpointLabel = formatCheckpointLabel(segment.startCheckpoint);
  const endCheckpointLabel = formatCheckpointLabel(segment.endCheckpoint);
  const consumerName =
    segment.consumerName ??
    segment.shipment?.consumer?.legalName ??
    segment.shipment?.destinationPartyName ??
    undefined;

  const originArea =
    startCheckpointLabel ??
    segment.startLocation?.state ??
    segment.startLocation?.country ??
    segment.startName ??
    undefined;
  const destinationArea =
    endCheckpointLabel ??
    segment.endLocation?.state ??
    segment.endLocation?.country ??
    segment.endName ??
    undefined;

  const resolvedItems =
    Array.isArray(segment.items) && segment.items.length > 0
      ? segment.items
      : Array.isArray(segment.shipmentItems) && segment.shipmentItems.length > 0
      ? segment.shipmentItems
      : [];

  const areaTokens = new Set<string>();
  [
    originArea,
    destinationArea,
    startCheckpointLabel,
    endCheckpointLabel,
    segment.startLocation?.country ?? undefined,
    segment.endLocation?.country ?? undefined,
    segment.startName ?? undefined,
    segment.endName ?? undefined,
  ]
    .filter(Boolean)
    .map(String)
    .forEach((value) => areaTokens.add(value));

  return {
    id: String(idCandidate),
    segmentId: segment.segmentId ?? undefined,
    status: mapSegmentStatusToSupplierStatus(segment.status),
    expectedArrival,
    acceptedAt,
    handedOverAt,
    manufacturerName: segment.manufacturerLegalName ?? undefined,
    consumerName,
    destinationPartyName:
      segment.shipment?.destinationPartyName ?? consumerName ?? undefined,
    destinationPartyUUID: segment.shipment?.destinationPartyUUID ?? undefined,
    fromUUID: segment.manufacturerUuid ?? undefined,
    originArea,
    destinationArea,
    pickupArea: startCheckpointLabel ?? segment.startName ?? undefined,
    dropoffArea: endCheckpointLabel ?? segment.endName ?? undefined,
    areaTags: Array.from(areaTokens),
    destinationCheckpoint: endCheckpointLabel ?? segment.endName ?? undefined,
    shipmentItems: resolvedItems,
    items: resolvedItems,
    checkpoints: Array.isArray(segment.checkpoints)
      ? segment.checkpoints
      : undefined,
    segmentOrder: segment.segmentOrder,
    shipmentId: segment.shipmentId,
    expectedShipDate:
      segment.expectedShipDate ?? segment.expected_ship_date ?? undefined,
    timeTolerance: segment.timeTolerance ?? segment.time_tolerance ?? undefined,
    startCheckpoint: segment.startCheckpoint ?? undefined,
    endCheckpoint: segment.endCheckpoint ?? undefined,
    actions: segment.actions ?? undefined,
  };
};

export const HandoverProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { role, uuid, user } = useAppStore();
  const queryClient = useQueryClient();

  const { data: incoming = [], isLoading: loadingIncoming } = useQuery<
    ShipmentSegmentResponse[],
    Error,
    SupplierShipmentRecord[]
  >({
    queryKey: ["incomingShipments", uuid],
    queryFn: () => shipmentService.getIncoming(uuid ?? ""),
    enabled: Boolean(uuid) && (role === "SUPPLIER" || role === "WAREHOUSE"),
    select: (segments) => segments.map(segmentToSupplierShipment),
  });

  const supplierSegmentsQueries = useQueries({
    queries: SUPPLIER_STATUS_ORDER.map((status) => ({
      queryKey: ["supplierSegments", uuid, status] as const,
      queryFn: () => shipmentService.getSupplierSegments({ status }),
      enabled: Boolean(uuid) && (role === "SUPPLIER" || role === "WAREHOUSE"),
      select: (segments: ShipmentSegmentResponse[]) =>
        segments.map(segmentToSupplierShipment),
    })) satisfies UseQueryOptions<
      ShipmentSegmentResponse[],
      Error,
      SupplierShipmentRecord[]
    >[],
  });

  const {
    data,
    isLoading: loadingMyShipments,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["myShipments", uuid],
    queryFn: ({ pageParam }) =>
      shipmentService.getByManufacturer(uuid ?? "", {
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (lastPage) => lastPage.cursor || undefined,
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(uuid) && role === "MANUFACTURER",
  });

  // Function to get shipments for a specific status with pagination
  const getShipmentsForStatus = useCallback(
    (status: string) => {
      const statusQuery = useInfiniteQuery({
        queryKey: ["myShipments", uuid, status],
        queryFn: ({ pageParam }) =>
          shipmentService.getByManufacturer(uuid ?? "", {
            status,
            cursor: pageParam,
            limit: 20,
          }),
        getNextPageParam: (lastPage) => lastPage.cursor || undefined,
        initialPageParam: undefined as string | undefined,
        enabled: Boolean(uuid) && role === "MANUFACTURER",
      });

      const shipments = useMemo(() => {
        if (!statusQuery.data?.pages) return [];
        return statusQuery.data.pages.flatMap((page) => page.shipments || []);
      }, [statusQuery.data]);

      return {
        data: shipments,
        isLoading: statusQuery.isLoading,
        fetchNextPage: statusQuery.fetchNextPage,
        hasNextPage: statusQuery.hasNextPage ?? false,
        isFetchingNextPage: statusQuery.isFetchingNextPage,
      };
    },
    [uuid, role]
  );

  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [destUUID, setDestUUID] = useState("");
  const [legs, setLegs] = useState<ShipmentLegInput[]>([DEFAULT_LEG]);
  const [createOpen, setCreateOpen] = useState(false);
  const [acceptingShipmentId, setAcceptingShipmentId] = useState<string | null>(
    null
  );
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] =
    useState<SupplierShipmentRecord | null>(null);
  const [handoverForm, setHandoverFormState] = useState<HandoverFormState>({
    latitude: "",
    longitude: "",
  });
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [takeoverSegmentId, setTakeoverSegmentId] = useState<string | null>(
    null
  );
  const [areaQuery, setAreaQuery] = useState("");

  const {
    data: manufacturerPackages = [],
    isLoading: loadingManufacturerPackages,
  } = useQuery<PackageResponse[]>({
    queryKey: ["manufacturerPackages", uuid],
    queryFn: () => packageService.listByManufacturer(uuid ?? ""),
    enabled: Boolean(uuid) && role === "MANUFACTURER",
  });

  const availablePackages = useMemo(() => {
    const READY_STATUS = "PACKAGE_READY_FOR_SHIPMENT";
    return manufacturerPackages.filter((pkg) => {
      if (!pkg?.status || typeof pkg.status !== "string") return false;
      return pkg.status.trim().toUpperCase() === READY_STATUS;
    });
  }, [manufacturerPackages]);

  const resetPackageSelections = useCallback(
    () => setSelectedPackageIds([]),
    []
  );

  const togglePackageSelection = useCallback(
    (packageId: string, selected: boolean) => {
      setSelectedPackageIds((prev) => {
        const set = new Set(prev.map(String));
        const normalizedId = String(packageId);
        if (selected) {
          set.add(normalizedId);
        } else {
          set.delete(normalizedId);
        }
        return Array.from(set);
      });
    },
    []
  );

  const addLeg = useCallback(() => {
    setLegs((prev) => [...prev, { ...DEFAULT_LEG }]);
  }, [setLegs]);

  const resetLegs = useCallback(() => {
    setLegs([{ ...DEFAULT_LEG }]);
  }, [setLegs]);

  const createShipment = useMutation({
    mutationFn: shipmentService.create,
    onSuccess: () => {
      toast.success("Shipment created");
      setDestUUID("");
      resetPackageSelections();
      resetLegs();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["myShipments"] });
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response
          ?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : undefined;
      toast.error(message || "Failed to create shipment");
    },
  });

  const handleCreateShipment = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const knownPackageIds = new Set(
        manufacturerPackages
          .map((pkg) => pkg.package_uuid ?? pkg.id)
          .filter(
            (value): value is string | number =>
              value !== undefined && value !== null
          )
          .map((value) => String(value))
      );

      const shipmentItems = selectedPackageIds
        .map((packageId) => String(packageId))
        .filter((packageId) => knownPackageIds.has(packageId))
        .map((packageId) => ({
          package_uuid: packageId,
        }));

      if (shipmentItems.length === 0) {
        toast.error("Select at least one package");
        return;
      }

      if (!destUUID.trim()) {
        toast.error("Select a destination party from the dropdown");
        return;
      }

      if (!uuid) {
        toast.error("Missing manufacturer identifier");
        return;
      }

      const toISO = (value: string) => {
        if (!value) return "";
        try {
          return new Date(value).toISOString();
        } catch {
          return value;
        }
      };

      const checkpointsPayload = legs
        .filter((leg) => leg.startId && leg.endId)
        .map((leg, index) => ({
          start_checkpoint_id: Number.isFinite(Number(leg.startId))
            ? Number(leg.startId)
            : leg.startId,
          end_checkpoint_id: Number.isFinite(Number(leg.endId))
            ? Number(leg.endId)
            : leg.endId,
          estimated_arrival_date: toISO(leg.estArrival),
          time_tolerance: leg.timeTolerance || undefined,
          expected_ship_date: toISO(leg.expectedShip),
          segment_order: index + 1,
          ...(leg.requiredAction
            ? { required_action: leg.requiredAction }
            : {}),
        }));

      if (checkpointsPayload.length === 0) {
        toast.error("Add at least one route checkpoint leg");
        return;
      }

      createShipment.mutate({
        manufacturerUUID: uuid!,
        destinationPartyUUID: destUUID.trim(),
        shipmentItems,
        checkpoints: checkpointsPayload,
      });
    },
    [
      createShipment,
      destUUID,
      legs,
      selectedPackageIds,
      uuid,
      manufacturerPackages,
    ]
  );

  const acceptShipment = useMutation({
    mutationFn: (shipmentId: string) => shipmentService.accept(shipmentId),
    onMutate: (shipmentId: string) => {
      setAcceptingShipmentId(shipmentId);
    },
    onSuccess: () => {
      toast.success("Shipment accepted");
      queryClient.invalidateQueries({ queryKey: ["incomingShipments"] });
      SUPPLIER_STATUS_ORDER.forEach((status) =>
        queryClient.invalidateQueries({
          queryKey: ["supplierSegments", uuid, status],
        })
      );
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response
          ?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : undefined;
      toast.error(message || "Failed to accept shipment");
    },
    onSettled: () => {
      setAcceptingShipmentId(null);
    },
  });

  const takeoverSegmentMutation = useMutation({
    mutationFn: ({ segmentId, latitude, longitude }: TakeoverPayload) =>
      shipmentService.takeOver(segmentId, { latitude, longitude }),
    onMutate: ({ segmentId }: TakeoverPayload) => {
      setTakeoverSegmentId(segmentId);
    },
    onSuccess: () => {
      toast.success("Segment taken over");
      SUPPLIER_STATUS_ORDER.forEach((status) =>
        queryClient.invalidateQueries({
          queryKey: ["supplierSegments", uuid, status],
        })
      );
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response
          ?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : undefined;
      toast.error(message || "Failed to take over segment");
    },
    onSettled: () => {
      setTakeoverSegmentId(null);
    },
  });

  const resetHandoverForm = useCallback(() => {
    setHandoverFormState({
      latitude: "",
      longitude: "",
    });
  }, []);

  const submitHandover = useCallback(async () => {
    if (!handoverTarget) {
      toast.error("Select a segment to hand over.");
      return;
    }

    const segmentIdentifier = handoverTarget.segmentId ?? handoverTarget.id;
    if (!segmentIdentifier) {
      toast.error("Unable to determine segment for handover.");
      return;
    }

    const latitude = Number(handoverForm.latitude);
    const longitude = Number(handoverForm.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      toast.error("Provide valid latitude and longitude coordinates.");
      return;
    }

    setHandoverLoading(true);
    try {
      await shipmentService.handover(String(segmentIdentifier), {
        latitude,
        longitude,
      });
      toast.success("Handover completed.");
      setHandoverDialogOpen(false);
      setHandoverTarget(null);
      resetHandoverForm();
      queryClient.invalidateQueries({ queryKey: ["incomingShipments"] });
      SUPPLIER_STATUS_ORDER.forEach((status) =>
        queryClient.invalidateQueries({
          queryKey: ["supplierSegments", uuid, status],
        })
      );
    } catch (error) {
      console.error(error);
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response
          ?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : undefined;
      toast.error(message || "Failed to submit handover details.");
    } finally {
      setHandoverLoading(false);
    }
  }, [handoverForm, handoverTarget, queryClient, resetHandoverForm, uuid]);

  const shipmentsByStatus = useMemo(() => {
    const buckets = createStatusBuckets();
    SUPPLIER_STATUS_ORDER.forEach((status, index) => {
      const query = supplierSegmentsQueries[index];
      buckets[status] = query?.data ?? [];
    });
    return buckets;
  }, [supplierSegmentsQueries]);

  const loadingByStatus = useMemo(() => {
    return SUPPLIER_STATUS_ORDER.reduce((acc, status, index) => {
      const query = supplierSegmentsQueries[index];
      acc[status] = Boolean(
        query?.isLoading || query?.isFetching || query?.isPending
      );
      return acc;
    }, {} as Record<SupplierShipmentStatus, boolean>);
  }, [supplierSegmentsQueries]);

  const filterShipmentsByArea = useCallback(
    (shipments: SupplierShipmentRecord[]) => {
      const term = areaQuery.trim().toLowerCase();
      if (!term) return shipments;
      return shipments.filter((shipment) => {
        const areas = resolveShipmentAreas(shipment);
        return areas.some((area) => area.toLowerCase().includes(term));
      });
    },
    [areaQuery]
  );

  const recentHandovers = useMemo(() => [], []);

  const manufacturer: ManufacturerContextValue = {
    enabled: role === "MANUFACTURER",
    manufacturerPackages,
    availablePackages,
    loadingManufacturerPackages,
    selectedPackageIds,
    togglePackageSelection,
    destUUID,
    setDestUUID,
    legs,
    setLegs,
    addLeg,
    resetLegs,
    createOpen,
    setCreateOpen,
    handleCreateShipment,
    creatingShipment: createShipment.isPending,
    getShipmentsForStatus,
    onShipmentsUpdated: () =>
      queryClient.invalidateQueries({ queryKey: ["myShipments"] }),
  };

  const supplier: SupplierContextValue = {
    enabled: role === "SUPPLIER" || role === "WAREHOUSE",
    incomingShipments: incoming,
    loadingIncoming,
    loadingByStatus,
    shipmentsByStatus,
    statusOrder: SUPPLIER_STATUS_ORDER,
    areaQuery,
    setAreaQuery,
    filterShipmentsByArea,
    acceptingShipmentId,
    acceptShipment: (id: string) => acceptShipment.mutate(id),
    acceptShipmentPending: acceptShipment.isPending,
    takeoverSegmentId,
    takeoverPending: takeoverSegmentMutation.isPending,
    takeoverSegment: (
      segmentId: string,
      coords: { latitude: number; longitude: number }
    ) => takeoverSegmentMutation.mutateAsync({ segmentId, ...coords }),
    handoverDialogOpen,
    setHandoverDialogOpen,
    handoverTarget,
    setHandoverTarget,
    handoverForm,
    setHandoverForm: (updater) =>
      setHandoverFormState((prev) => updater({ ...prev })),
    handoverLoading,
    submitHandover,
    resetHandoverForm,
  };

  const shared: SharedContextValue = {
    role,
    uuid,
    recentHandovers,
  };

  const value: HandoverContextValue = {
    manufacturer,
    supplier,
    shared,
  };

  return (
    <HandoverContext.Provider value={value}>
      {children}
    </HandoverContext.Provider>
  );
};

export const useHandoverContext = () => {
  const context = useContext(HandoverContext);
  if (!context) {
    throw new Error(
      "useHandoverContext must be used within a HandoverProvider"
    );
  }
  return context;
};

export const useManufacturerContext = () => useHandoverContext().manufacturer;
export const useSupplierContext = () => useHandoverContext().supplier;
export const useHandoverSharedContext = () => useHandoverContext().shared;

export const handoverUtils = {
  deriveRouteLabel,
  extractShipmentItems,
  resolveShipmentAreas,
  supplierStatusBadgeClass,
  normalizeStatus,
  formatArrivalText,
  humanizeSupplierStatus,
};
