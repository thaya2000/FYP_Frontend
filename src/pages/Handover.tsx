import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, Plus, Trash, Truck, ShieldCheck, Package, Bus, CheckCircle2, Search, MapPin } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productRegistryService } from '@/services/productService';
import { checkpointService } from '@/services/checkpointService';
import { shipmentService } from '@/services/shipmentService';
import { productCategoryService } from '@/services/productCategoryService';
import { packageService } from '@/services/packageService';
import { batchService } from '@/services/batchService';
import type { ProductBatchSummary, ProductCategory, ProductPackage, VaccineProduct } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const batchDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const formatBatchRange = (start?: string | null, end?: string | null) => {
  const startDate = start ? new Date(start) : undefined;
  const endDate = end ? new Date(end) : undefined;
  const startValid = startDate && !Number.isNaN(startDate.getTime());
  const endValid = endDate && !Number.isNaN(endDate.getTime());
  if (startValid && endValid) {
    if (startDate!.toDateString() === endDate!.toDateString()) {
      return batchDateFormatter.format(startDate!);
    }
    return `${batchDateFormatter.format(startDate!)} - ${batchDateFormatter.format(endDate!)}`;
  }
  if (startValid) {
    return batchDateFormatter.format(startDate!);
  }
  if (endValid) {
    return batchDateFormatter.format(endDate!);
  }
  return undefined;
};

const deriveBatchLabel = (batch: ProductBatchSummary) => {
  const batchCode = batch.batchCode;
  if (batchCode) return batchCode;

  const rawWindow = typeof batch.productionWindow === 'string' ? batch.productionWindow : undefined;
  const [windowStart, windowEnd] = rawWindow ? rawWindow.split('/') : [undefined, undefined];

  const startCandidate =
    batch.productionStartTime ?? batch.productionStart ?? windowStart;
  const endCandidate = batch.productionEndTime ?? batch.productionEnd ?? windowEnd;

  const range = formatBatchRange(startCandidate, endCandidate);
  if (range) return range;

  if (rawWindow) return rawWindow;

  return `Batch ${batch.id}`;
};

const buildBatchDetails = (batch: ProductBatchSummary) => {
  const releaseStatus = batch.releaseStatus;
  const quantityProduced = batch.quantityProduced;
  const expiry = batch.expiryDate;

  const parts: string[] = [];
  if (releaseStatus) parts.push(`Release: ${releaseStatus}`);
  if (quantityProduced !== undefined && quantityProduced !== null && quantityProduced !== '') {
    parts.push(`Qty ${quantityProduced}`);
  }
  if (expiry) {
    const expiryDate = new Date(expiry);
    if (!Number.isNaN(expiryDate.getTime())) {
      parts.push(`Expires ${batchDateFormatter.format(expiryDate)}`);
    }
  }

  return parts.join(' • ');
};

type SupplierShipmentRecord = {
  id: string;
  manufacturerName?: string;
  fromUUID?: string;
  originType?: 'MANUFACTURER' | 'WAREHOUSE' | 'SUPPLIER' | 'CONSUMER' | 'DISTRIBUTOR' | string;
  destinationType?: 'MANUFACTURER' | 'WAREHOUSE' | 'SUPPLIER' | 'CONSUMER' | 'DISTRIBUTOR' | string;
  originArea?: string;
  destinationArea?: string;
  area?: string;
  areaTags?: string[];
  pickupArea?: string;
  dropoffArea?: string;
  status?: string;
  expectedArrival?: string;
  acceptedAt?: string;
  handedOverAt?: string;
  destinationCheckpoint?: string;
  shipmentItems?: Array<{ product_uuid?: string; productName?: string; quantity?: number }>;
  items?: Array<{ product_uuid?: string; productName?: string; quantity?: number }>;
};

type HandoverFormState = {
  handoverToUUID: string;
  checkpointNote: string;
  temperatureCheck: string;
};

const Handover = () => {
  const { user, uuid, role } = useAppStore();
  const queryClient = useQueryClient();

  // Fetch products for this manufacturer via API
  const { data: products = [], isLoading: loadingProducts } = useQuery<VaccineProduct[]>({
    queryKey: ["products"],
    queryFn: () => productRegistryService.getAllProducts(),
    enabled: role === 'MANUFACTURER',
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery<ProductCategory[]>({
    queryKey: ['productCategories', role],
    queryFn: () => productCategoryService.list(),
    enabled: !!uuid && (role === 'MANUFACTURER' || role === 'ADMIN'),
  });

  // Checkpoints: manufacturer sees all, others see own
  const { data: checkpoints = [], isLoading: loadingCheckpoints } = useQuery({
    queryKey: ['checkpoints', role, uuid],
    queryFn: () => (role === 'MANUFACTURER' ? checkpointService.getAll() : checkpointService.getByOwner(uuid ?? '')),
    enabled: !!uuid,
  });

  // Incoming shipments for Supplier/Warehouse
  const { data: incoming = [], isLoading: loadingIncoming } = useQuery({
    queryKey: ['incomingShipments', uuid],
    queryFn: () => shipmentService.getIncoming(uuid ?? ''),
    enabled: !!uuid && (role === 'SUPPLIER' || role === 'WAREHOUSE'),
  });

  // Manufacturer shipments list
  const { data: myShipments = [], isLoading: loadingMyShipments } = useQuery({
    queryKey: ['myShipments', uuid],
    queryFn: () => shipmentService.getByManufacturer(uuid ?? ''),
    enabled: !!uuid && role === 'MANUFACTURER',
  });

  // Mock recent handovers
  const recentHandovers = [
    {
      id: 'h1',
      productId: 'prod-001',
      productName: 'Organic Coffee Beans',
      from: '0x742d35Cc6634C0532925a3b8D8b5C4e0c5E42F2B',
      to: '0x8ba1f109551bD432803012645Hac136c30c6213c',
      timestamp: Date.now() - 3600000,
      status: 'completed',
      checkpoint: 'Central Warehouse'
    },
    {
      id: 'h2',
      productId: 'prod-002',
      productName: 'Premium Tea Selection',
      from: '0x8ba1f109551bD432803012645Hac136c30c6213c',
      to: '0x456d35Cc6634C0532925a3b8D8b5C4e0c5E42F2B',
      timestamp: Date.now() - 7200000,
      status: 'pending',
      checkpoint: 'Distribution Center'
    },
  ];

  const userProducts = products || [];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [packageSelections, setPackageSelections] = useState<Record<string, string>>({});

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(selectedCategoryId)),
    [categories, selectedCategoryId],
  );

  const productsForSelectedCategory = useMemo(() => {
    if (!selectedCategoryId) {
      return [] as VaccineProduct[];
    }
    const selectedName = selectedCategory?.name?.toLowerCase();
    return userProducts.filter((product) => {
      const categoryId = (product as any).productCategoryId ?? product.productCategoryId;
      if (categoryId) {
        return String(categoryId) === String(selectedCategoryId);
      }
      const categoryLabel =
        (product as any).productCategoryLabel ?? product.productCategory ?? '';
      if (!selectedName || !categoryLabel) return false;
      return String(categoryLabel).toLowerCase() === selectedName;
    });
  }, [selectedCategory, selectedCategoryId, userProducts]);

  const selectedProduct = useMemo(
    () => productsForSelectedCategory.find((product) => String(product.id) === String(selectedProductId)),
    [productsForSelectedCategory, selectedProductId],
  );

  const { data: productBatches = [], isLoading: loadingProductBatches } = useQuery<ProductBatchSummary[]>({
    queryKey: ['productBatches', selectedProductId],
    queryFn: () => batchService.getBatchesByProduct(String(selectedProductId)),
    enabled: Boolean(selectedProductId),
  });

  const selectedBatch = useMemo(
    () => (productBatches as any[]).find((batch) => String(batch.id) === String(selectedBatchId)),
    [productBatches, selectedBatchId],
  );

  const { data: batchPackages = [], isLoading: loadingBatchPackages } = useQuery<ProductPackage[]>({
    queryKey: ['batchPackages', selectedBatchId],
    queryFn: () => packageService.listByBatch(String(selectedBatchId)),
    enabled: Boolean(selectedBatchId),
  });

  const resetPackageSelections = () => setPackageSelections({});

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value);
    setSelectedProductId('');
    setSelectedBatchId('');
    resetPackageSelections();
  };

  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
    setSelectedBatchId('');
    resetPackageSelections();
  };

  const handleBatchChange = (value: string) => {
    setSelectedBatchId(value);
    resetPackageSelections();
  };

  const handlePackageQuantityChange = (packageId: string, quantity: string) => {
    setPackageSelections((prev) => {
      const sanitized = quantity.trim();
      if (!sanitized) {
        const { [packageId]: _ignored, ...rest } = prev;
        return rest;
      }
      return { ...prev, [packageId]: sanitized };
    });
  };

  // Manufacturer shipment builder state
  const [destUUID, setDestUUID] = useState('');
  const [legs, setLegs] = useState<Array<{ startId: string; endId: string; estArrival: string; expectedShip: string; timeTolerance: string; requiredAction: string }>>([
    { startId: '', endId: '', estArrival: '', expectedShip: '', timeTolerance: '', requiredAction: '' },
  ]);
  const [createOpen, setCreateOpen] = useState(false);
  const [acceptingShipmentId, setAcceptingShipmentId] = useState<string | null>(null);
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<SupplierShipmentRecord | null>(null);
  const [handoverForm, setHandoverForm] = useState<HandoverFormState>({
    handoverToUUID: "",
    checkpointNote: "",
    temperatureCheck: "",
  });
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [areaQuery, setAreaQuery] = useState('');

  const createShipment = useMutation({
    mutationFn: shipmentService.create,
    onSuccess: () => {
      toast.success('Shipment created');
      setDestUUID('');
      setSelectedCategoryId('');
      setSelectedProductId('');
      setSelectedBatchId('');
      resetPackageSelections();
      setLegs([{ startId: '', endId: '', estArrival: '', expectedShip: '', timeTolerance: '', requiredAction: '' }]);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['myShipments'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create shipment'),
  });

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategoryId) {
      return toast.error('Select a product category');
    }
    if (!selectedProductId) {
      return toast.error('Select a product');
    }
    if (!selectedBatchId) {
      return toast.error('Select a batch');
    }

    const shipmentItems = Object.entries(packageSelections)
      .map(([packageId, quantity]) => ({
        product_category_id: String(selectedCategoryId),
        product_uuid: String(selectedProductId),
        batch_id: String(selectedBatchId),
        package_id: packageId,
        quantity: Number(quantity),
      }))
      .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

    if (shipmentItems.length === 0) {
      return toast.error('Add at least one package with quantity');
    }

    if (!destUUID.trim()) {
      return toast.error('Enter destination party UUID');
    }

    const toISO = (s: string) => {
      if (!s) return '';
      try { return new Date(s).toISOString(); } catch { return s; }
    };

    const checkpointsPayload = legs
      .filter((l) => l.startId && l.endId)
      .map((l) => ({
        start_checkpoint_id: isFinite(Number(l.startId)) ? Number(l.startId) : l.startId,
        end_checkpoint_id: isFinite(Number(l.endId)) ? Number(l.endId) : l.endId,
        estimated_arrival_date: toISO(l.estArrival),
        time_tolerance: l.timeTolerance || '2h',
        expected_ship_date: toISO(l.expectedShip),
        required_action: l.requiredAction || 'None',
      }));

    if (checkpointsPayload.length === 0) {
      return toast.error('Add at least one route checkpoint leg');
    }

    createShipment.mutate({
      manufacturerUUID: uuid!,
      destinationPartyUUID: destUUID.trim(),
      shipmentItems,
      checkpoints: checkpointsPayload,
    });
  };

  const acceptShipment = useMutation({
    mutationFn: (shipmentId: string) => shipmentService.accept(shipmentId),
    onMutate: (shipmentId: string) => {
      setAcceptingShipmentId(shipmentId);
    },
    onSuccess: () => {
      toast.success('Shipment accepted');
      queryClient.invalidateQueries({ queryKey: ['incomingShipments'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to accept shipment'),
    onSettled: () => {
      setAcceptingShipmentId(null);
    },
  });

  const mockSupplierShipments = {
    pool: [
      {
        id: "POOL-1024",
        manufacturerName: "Acme Manufacturing",
        fromUUID: "0xA1F4…2dc1",
        status: "PENDING_ACCEPTANCE",
        expectedArrival: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
        shipmentItems: [
          { productName: "COVID Test Kits", quantity: 500 },
          { productName: "Protective Gloves", quantity: 1000 },
        ],
      },
    ],
    accepted: [
      {
        id: "ACC-2048",
        manufacturerName: "MedTech Labs",
        fromUUID: "0xB7C2…9a51",
        status: "ACCEPTED",
        expectedArrival: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        acceptedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        shipmentItems: [{ productName: "Immuno Booster Packs", quantity: 250 }],
      },
    ],
    pickedUp: [
      {
        id: "PICK-3056",
        manufacturerName: "PharmaX",
        fromUUID: "0x9931…7f1d",
        status: "IN_TRANSIT",
        expectedArrival: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
        acceptedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        destinationCheckpoint: "Central Cold Chain Hub",
        shipmentItems: [{ productName: "Proximity Sensor Kit", quantity: 25 }],
      },
    ],
    delivered: [
      {
        id: "DELIV-4096",
        manufacturerName: "BioSecure Inc.",
        fromUUID: "0x71A3…5c42",
        status: "HANDOVER_READY",
        expectedArrival: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        handedOverAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        destinationCheckpoint: "Receiver Warehouse",
        shipmentItems: [{ productName: "Thermal Packaging Units", quantity: 40 }],
      },
    ],
    history: [
      {
        id: "HIST-5120",
        manufacturerName: "Acme Manufacturing",
        fromUUID: "0xA1F4…2dc1",
        status: "COMPLETED",
        handedOverAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        shipmentItems: [{ productName: "COVID Test Kits", quantity: 600 }],
      },
    ],
  };

  const supplierShipments: SupplierShipmentRecord[] = Array.isArray(incoming)
    ? (incoming as SupplierShipmentRecord[])
    : [];

  const normalizeStatus = (status?: string) => (status ?? 'PENDING_ACCEPTANCE').toUpperCase();

  const pendingStatuses = [
    'PENDING_ACCEPTANCE',
    'PREPARING',
    'AWAITING_SUPPLIER_CONFIRMATION',
  ];
  const activeStatuses = [
    'ACCEPTED',
    'IN_TRANSIT',
    'READY_FOR_HANDOVER',
    'HANDOVER_PENDING',
  ];
  const historyStatuses = [
    'HANDOVER_READY',
    'HANDOVER_COMPLETED',
    'COMPLETED',
    'DELIVERED',
    'CLOSED',
    'REJECTED',
  ];

  const supplierPendingRaw = supplierShipments.filter((s) =>
    pendingStatuses.includes(normalizeStatus(s.status))
  );
  const supplierActiveRaw = supplierShipments.filter((s) =>
    activeStatuses.includes(normalizeStatus(s.status))
  );
  const supplierHistoryRaw = supplierShipments.filter((s) =>
    historyStatuses.includes(normalizeStatus(s.status))
  );

  const supplierPool =
    supplierPendingRaw.length > 0
      ? supplierPendingRaw
      : mockSupplierShipments.pool;
  const supplierActive =
    supplierActiveRaw.length > 0
      ? supplierActiveRaw
      : mockSupplierShipments.accepted.concat(mockSupplierShipments.pickedUp);
  const supplierDelivered =
    supplierShipments.filter((s) =>
      ['HANDOVER_READY', 'HANDOVER_COMPLETED', 'COMPLETED', 'DELIVERED'].includes(
        normalizeStatus(s.status)
      )
    ).length > 0
      ? supplierShipments.filter((s) =>
        ['HANDOVER_READY', 'HANDOVER_COMPLETED', 'COMPLETED', 'DELIVERED'].includes(
          normalizeStatus(s.status)
        )
      )
      : mockSupplierShipments.delivered;

  const supplierHistory =
    supplierHistoryRaw.length > 0
      ? supplierHistoryRaw
      : mockSupplierShipments.history;

  const deriveEntityLabel = (value?: string) => {
    if (!value) return undefined;
    const normalized = value.toString().trim().toUpperCase();
    switch (normalized) {
      case 'MANUFACTURER':
        return 'Manufacturer';
      case 'WAREHOUSE':
        return 'Warehouse';
      case 'SUPPLIER':
        return 'Supplier';
      case 'CONSUMER':
        return 'Consumer';
      case 'DISTRIBUTOR':
        return 'Distributor';
      default:
        return value;
    }
  };

  const deriveRouteLabel = (shipment: SupplierShipmentRecord) => {
    if ((shipment as any).routeType) {
      return (shipment as any).routeType;
    }
    const origin =
      deriveEntityLabel(shipment.originType) ??
      (shipment.manufacturerName ? 'Manufacturer' : 'Warehouse');
    const destination =
      deriveEntityLabel(shipment.destinationType) ??
      (shipment.destinationCheckpoint ? 'Warehouse' : 'Consumer');
    return `${origin} → ${destination}`;
  };

  const resolveShipmentAreas = (shipment: SupplierShipmentRecord) => {
    const areaCandidates: Array<string | undefined> = [
      shipment.destinationArea,
      shipment.originArea,
      shipment.area,
      shipment.pickupArea,
      shipment.dropoffArea,
      shipment.destinationCheckpoint,
      (shipment as any).destinationPartyArea,
      (shipment as any).originPartyArea,
    ];

    const tags = Array.isArray((shipment as any).areaTags)
      ? (shipment as any).areaTags
      : shipment.areaTags;
    if (Array.isArray(tags)) {
      areaCandidates.push(...tags);
    }

    return Array.from(
      new Set(
        areaCandidates
          .filter((token): token is string => typeof token === 'string')
          .map((token) => token.trim())
          .filter(Boolean)
      )
    );
  };

  const matchesAreaQuery = (shipment: SupplierShipmentRecord, search: string) => {
    if (!search) return true;
    const tokens = resolveShipmentAreas(shipment);
    const lowered = search.toLowerCase();
    return tokens.some((token) => token.toLowerCase().includes(lowered));
  };

  const trimmedAreaQuery = areaQuery.trim();

  const filterShipmentsByArea = (shipments: SupplierShipmentRecord[]) =>
    shipments.filter((shipment) => matchesAreaQuery(shipment, trimmedAreaQuery));

  const filteredSupplierPool = filterShipmentsByArea(supplierPool);
  const filteredSupplierActive = filterShipmentsByArea(supplierActive);
  const filteredSupplierDelivered = filterShipmentsByArea(supplierDelivered);
  const filteredSupplierHistory = filterShipmentsByArea(supplierHistory);
  const hasAreaFilter = trimmedAreaQuery.length > 0;
  const showSupplierSampleCard = !hasAreaFilter && supplierShipments.length === 0;

  const extractShipmentItems = (shipment: SupplierShipmentRecord) => {
    const entries =
      shipment.shipmentItems ?? shipment.items ?? (shipment as any).shipmentItems ?? [];
    if (entries && entries.length > 0) {
      return entries.map((item: any) => ({
        productName: item.productName ?? item.name ?? item.product_uuid ?? 'Product',
        quantity: item.quantity ?? 0,
      }));
    }

    const fallbackIds: string[] = (shipment as any).productIds ?? [];
    return fallbackIds.map((id) => ({
      productName: id,
      quantity: 1,
    }));
  };

  const openHandoverDialog = (shipment: SupplierShipmentRecord) => {
    setHandoverTarget(shipment);
    setHandoverDialogOpen(true);
  };

  const handleMarkPickedUp = (shipment: SupplierShipmentRecord) => {
    toast.success(`Shipment ${shipment.id} marked as picked up (demo)`);
    // In future: call shipmentService.markPickedUp and refetch.
  };

  const resetHandoverForm = () => {
    setHandoverForm({
      handoverToUUID: "",
      checkpointNote: "",
      temperatureCheck: "",
    });
  };

  const handleHandoverSubmit = async () => {
    if (!handoverTarget) return;
    if (!handoverForm.handoverToUUID.trim()) {
      toast.error('Please provide the receiving party UUID.');
      return;
    }

    setHandoverLoading(true);
    try {
      // TODO: replace with shipmentService.handover once API details are available.
      await new Promise((resolve) => setTimeout(resolve, 900));
      toast.success('Handover details submitted.');
      setHandoverDialogOpen(false);
      setHandoverTarget(null);
      resetHandoverForm();
      queryClient.invalidateQueries({ queryKey: ['incomingShipments'] });
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit handover details.');
    } finally {
      setHandoverLoading(false);
    }
  };

  const renderSupplierShipmentCard = (
    shipment: SupplierShipmentRecord,
    actions?: React.ReactNode
  ) => {
    const normalized = normalizeStatus(shipment.status);
    const arrivalText = shipment.expectedArrival
      ? formatDistanceToNow(new Date(shipment.expectedArrival), { addSuffix: true })
      : 'Unknown ETA';
    const items = extractShipmentItems(shipment);
    const itemPreview = items.slice(0, 2);
    const remainingItems = Math.max(items.length - itemPreview.length, 0);
    const routeLabel = deriveRouteLabel(shipment);
    const areaTokens = resolveShipmentAreas(shipment);
    const displayedAreas = areaTokens.slice(0, 2);
    const remainingAreas = Math.max(areaTokens.length - displayedAreas.length, 0);

    return (
      <Card
        key={shipment.id}
        className="border border-border/50 shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Shipment</p>
              <p className="text-base font-semibold leading-tight break-all">{shipment.id}</p>
              <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-primary/20">
                {routeLabel}
              </Badge>
            </div>
            <Badge className={cn("text-xs whitespace-nowrap", supplierStatusBadgeClass(normalized))}>
              {humanizeSupplierStatus(normalized)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {displayedAreas.length > 0 ? (
              displayedAreas.map((area) => (
                <span
                  key={`${shipment.id}-${area}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-1 text-muted-foreground"
                >
                  <MapPin className="w-3 h-3 text-primary/80" />
                  {area}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-2 py-1 text-muted-foreground/80">
                <MapPin className="w-3 h-3 opacity-60" />
                Area not provided
              </span>
            )}
            {remainingAreas > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                +{remainingAreas} more
              </span>
            )}
          </div>

          <div className="space-y-1">
            {itemPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items listed</p>
            ) : (
              itemPreview.map((item, idx) => (
                <div
                  key={`${shipment.id}-item-${idx}`}
                  className="flex justify-between text-sm"
                >
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary/70" />
                    {item.productName}
                  </span>
                  <span className="text-muted-foreground">x{item.quantity}</span>
                </div>
              ))
            )}
            {remainingItems > 0 && (
              <p className="text-xs text-muted-foreground">
                +{remainingItems} more item{remainingItems > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {normalized === 'PENDING_ACCEPTANCE' ? 'Arrives' : 'Arrived'} {arrivalText}
            </span>
            {shipment.acceptedAt && (
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Accepted {formatDistanceToNow(new Date(shipment.acceptedAt), { addSuffix: true })}
              </span>
            )}
            {shipment.destinationCheckpoint && (
              <span className="inline-flex items-center gap-2">
                <Bus className="w-3 h-3 text-primary/70" />
                Next checkpoint: {shipment.destinationCheckpoint}
              </span>
            )}
            {shipment.handedOverAt && (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                Handover {formatDistanceToNow(new Date(shipment.handedOverAt), { addSuffix: true })}
              </span>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <ViewShipmentButton shipmentId={String(shipment.id)} />
            {actions}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Shipments</h1>
          <p className="text-muted-foreground">Transfer custody across the supply chain</p>
        </div>
        {role === 'MANUFACTURER' && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> New Shipment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Shipment</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateShipment} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Destination Party UUID</label>
                  <Input placeholder="DST-003" value={destUUID} onChange={(e) => setDestUUID(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">Select Packages</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Product Category</label>
                      {loadingCategories ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading categories...
                        </div>
                      ) : categories.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No product categories available yet. Ask an administrator or add one before creating shipments.
                        </p>
                      ) : (
                        <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={String(category.id)}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Product</label>
                      {!selectedCategoryId ? (
                        <p className="text-xs text-muted-foreground">Select a product category first.</p>
                      ) : loadingProducts ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading products...
                        </div>
                      ) : productsForSelectedCategory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No products registered for this category.</p>
                      ) : (
                        <Select value={selectedProductId} onValueChange={handleProductChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose product" />
                          </SelectTrigger>
                          <SelectContent>
                            {productsForSelectedCategory.map((product) => (
                              <SelectItem key={product.id} value={String(product.id)}>
                                {product.productName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Batch</label>
                      {!selectedProductId ? (
                        <p className="text-xs text-muted-foreground">Pick a product to view batches.</p>
                      ) : loadingProductBatches ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading batches...
                        </div>
                      ) : productBatches.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No batches linked to this product yet.</p>
                      ) : (
                        <Select value={selectedBatchId} onValueChange={handleBatchChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {productBatches.map((batch) => {
                              const batchLabel = deriveBatchLabel(batch);
                              const details = buildBatchDetails(batch);
                              return (
                                <SelectItem key={batch.id} value={String(batch.id)}>
                                  <div className="flex flex-col gap-0.5">
                                    <span>{batchLabel}</span>
                                    {details ? (
                                      <span className="text-xs text-muted-foreground">{details}</span>
                                    ) : null}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Packages</label>
                      {!selectedBatchId ? (
                        <p className="text-xs text-muted-foreground">Select a batch to allocate packages.</p>
                      ) : loadingBatchPackages ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading packages...
                        </div>
                      ) : batchPackages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No packages registered for this batch.</p>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-2">
                          {batchPackages.map((pkg) => {
                            const packageId = String(pkg.id);
                            const availableQuantity =
                              pkg.quantityAvailable ?? pkg.quantity ?? (pkg as any).availableQuantity;
                            return (
                              <div key={packageId} className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/10 p-3 text-sm">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {pkg.packageCode ?? pkg.id ?? 'Package'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {availableQuantity !== undefined
                                      ? `Available: ${availableQuantity}${pkg.unit ? ` ${pkg.unit}` : ''}`
                                      : 'No availability data'}
                                    {pkg.status ? ` • ${pkg.status}` : ''}
                                  </p>
                                  {pkg.notes ? (
                                    <p className="text-xs text-muted-foreground truncate">{pkg.notes}</p>
                                  ) : null}
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="Qty"
                                  className="w-24"
                                  value={packageSelections[packageId] ?? ''}
                                  onChange={(event) => handlePackageQuantityChange(packageId, event.target.value)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Route Checkpoint Legs</p>
                  {loadingCheckpoints ? (
                    <div className="py-4 text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading checkpoints...</div>
                  ) : (checkpoints as any[]).length === 0 ? (
                    <p className="text-muted-foreground">No checkpoints found</p>
                  ) : (
                    <div className="space-y-3">
                      {legs.map((leg, idx) => (
                        <div key={idx} className="border rounded-md p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Start Checkpoint</label>
                            <Select value={leg.startId} onValueChange={(v) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, startId: v } : l))}>
                              <SelectTrigger><SelectValue placeholder="Select start" /></SelectTrigger>
                              <SelectContent>
                                {(checkpoints as any[]).map((c: any) => (
                                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">End Checkpoint</label>
                            <Select value={leg.endId} onValueChange={(v) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, endId: v } : l))}>
                              <SelectTrigger><SelectValue placeholder="Select end" /></SelectTrigger>
                              <SelectContent>
                                {(checkpoints as any[]).map((c: any) => (
                                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Expected Ship Date</label>
                            <Input type="datetime-local" value={leg.expectedShip} onChange={(e) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, expectedShip: e.target.value } : l))} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Estimated Arrival</label>
                            <Input type="datetime-local" value={leg.estArrival} onChange={(e) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, estArrival: e.target.value } : l))} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Time Tolerance</label>
                            <Input placeholder="2h" value={leg.timeTolerance} onChange={(e) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, timeTolerance: e.target.value } : l))} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Required Action</label>
                            <Input placeholder="Temperature check" value={leg.requiredAction} onChange={(e) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, requiredAction: e.target.value } : l))} />
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="secondary" size="sm" onClick={() => setLegs((arr) => [...arr, { startId: '', endId: '', estArrival: '', expectedShip: '', timeTolerance: '', requiredAction: '' }])}><Plus className="w-4 h-4 mr-1" /> Add Leg</Button>
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={createShipment.isPending} className="w-full">{createShipment.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>) : 'Create Shipment'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Manufacturer view: create shipment and review products */}
      {role === 'MANUFACTURER' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>My Shipments</CardTitle></CardHeader>
            <CardContent>
              {loadingMyShipments ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : (myShipments as any[]).length === 0 ? (
                <p className="text-muted-foreground">No shipments yet</p>
              ) : (
                <div className="space-y-3 max-h-[28rem] overflow-y-auto">
                  {(myShipments as any[]).map((s: any) => (
                    <div key={s.id} className="border rounded-lg p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Shipment: {s.id}</p>
                          <p className="text-xs text-muted-foreground">To: {s.destinationPartyUUID ?? s.toUUID}</p>
                        </div>
                        <Badge variant={s.status === 'PREPARING' ? 'outline' : 'secondary'}>{s.status ?? 'PREPARING'}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>Items: {(s.shipmentItems?.length ?? s.productIds?.length ?? 0)}</span>
                        <span>Legs: {(s.checkpoints?.length ?? s.checkpointIds?.length ?? 0)}</span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <ViewShipmentButton shipmentId={s.id} />
                        <EditShipmentButton shipment={s} checkpoints={checkpoints as any[]} onUpdated={() => queryClient.invalidateQueries({ queryKey: ['myShipments'] })} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Your Products</CardTitle></CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : userProducts.length === 0 ? (
                <p className="text-muted-foreground">No products</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {userProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">ID: {product.id}</p>
                      </div>
                      <Badge variant="secondary">{(product as any).status ?? 'UNKNOWN'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {role === 'SUPPLIER' && (
        <div className="space-y-6">
          <Tabs defaultValue="incoming" className="space-y-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="incoming" className="sm:min-w-[160px]">Incoming</TabsTrigger>
              <TabsTrigger value="active" className="sm:min-w-[160px]">Active</TabsTrigger>
              <TabsTrigger value="delivered" className="sm:min-w-[160px]">Delivered</TabsTrigger>
              <TabsTrigger value="history" className="sm:min-w-[160px]">History</TabsTrigger>
            </TabsList>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={areaQuery}
                  onChange={(event) => setAreaQuery(event.target.value)}
                  placeholder="Search by area, checkpoint, or delivery zone"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:justify-end">
                <span className="max-w-xs">
                  Filters supplier consignments across all tabs by logistics area.
                </span>
                {hasAreaFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setAreaQuery('')}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="incoming">
              <SupplierSectionHeader
                title="Awaiting your acceptance"
                description="Inspect consignment details and accept once the shipment is received."
              />

              {/* {showSupplierSampleCard && <SupplierSampleCard />} */}

              {loadingIncoming ? (
                <SupplierEmptyState
                  icon={Truck}
                  title="Loading consignments"
                  description="Fetching the latest shipments assigned to your organisation."
                  isLoading
                />
              ) : filteredSupplierPool.length === 0 ? (
                <SupplierEmptyState
                  icon={hasAreaFilter ? MapPin : Truck}
                  title={hasAreaFilter ? 'No consignments in this area' : 'No shipments to accept'}
                  description={
                    hasAreaFilter
                      ? 'Adjust the area filter or clear it to view all assigned consignments.'
                      : 'Once a manufacturer assigns a shipment to you it will appear here.'
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredSupplierPool.map((shipment) =>
                    renderSupplierShipmentCard(
                      shipment,
                      <AlertDialog key={`${shipment.id}-accept`}>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="gap-2"
                            disabled={acceptShipment.isPending && acceptingShipmentId === shipment.id}
                          >
                            {acceptShipment.isPending && acceptingShipmentId === shipment.id ? (
                              <>
                                <LoaderIndicator />
                                Accepting…
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Accept Shipment
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Accept shipment {shipment.id}?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <p className="text-sm text-muted-foreground">
                            Confirm contents and quantities before accepting. This will notify the manufacturer.
                          </p>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => acceptShipment.mutate(shipment.id)}
                              disabled={acceptShipment.isPending && acceptingShipmentId === shipment.id}
                            >
                              Confirm acceptance
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active">
              <SupplierSectionHeader
                title="Active consignments"
                description="Prepare handovers for downstream checkpoints or partners."
              />

              {loadingIncoming ? (
                <SupplierEmptyState
                  icon={ShieldCheck}
                  title="Loading active shipments"
                  description="Fetching accepted consignments."
                  isLoading
                />
              ) : filteredSupplierActive.length === 0 ? (
                <SupplierEmptyState
                  icon={hasAreaFilter ? MapPin : ShieldCheck}
                  title={hasAreaFilter ? 'Area filter returned no active consignments' : 'No active consignments'}
                  description={
                    hasAreaFilter
                      ? 'Try a different area or clear the filter to see all active consignments.'
                      : 'Accepted consignments awaiting handover will appear here.'
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredSupplierActive.map((shipment) => {
                    const normalized = normalizeStatus(shipment.status);
                    const isPickedUp = activeStatuses.includes(normalized);
                    return renderSupplierShipmentCard(
                      shipment,
                      <Button variant="outline" onClick={() => openHandoverDialog(shipment)}>
                        {isPickedUp ? "Prepare Handover" : "Mark as Picked Up"}
                      </Button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="delivered">
              <SupplierSectionHeader
                title="Delivered consignments"
                description="Recently handed over shipments awaiting confirmation."
              />

              {loadingIncoming ? (
                <SupplierEmptyState
                  icon={Truck}
                  title="Loading delivered shipments"
                  description="Retrieving consignments handed over recently."
                  isLoading
                />
              ) : filteredSupplierDelivered.length === 0 ? (
                <SupplierEmptyState
                  icon={hasAreaFilter ? MapPin : Truck}
                  title={hasAreaFilter ? 'No delivered consignments in this area' : 'No delivered consignments'}
                  description={
                    hasAreaFilter
                      ? 'Broaden the search area to review recently delivered consignments.'
                      : 'Shipments you handover will appear here before entering history.'
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredSupplierDelivered.map((shipment) =>
                    renderSupplierShipmentCard(shipment)
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <SupplierSectionHeader
                title="Handover history"
                description="Traceability records for completed consignments."
              />

              {loadingIncoming ? (
                <SupplierEmptyState
                  icon={CheckCircle2}
                  title="Loading history"
                  description="Retrieving recorded handovers."
                  isLoading
                />
              ) : filteredSupplierHistory.length === 0 ? (
                <SupplierEmptyState
                  icon={hasAreaFilter ? MapPin : CheckCircle2}
                  title={hasAreaFilter ? 'No historical consignments in this area' : 'No historical consignments'}
                  description={
                    hasAreaFilter
                      ? 'Reset the filter to review the complete handover history.'
                      : 'Completed handovers will be archived here for traceability.'
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredSupplierHistory.map((shipment) => renderSupplierShipmentCard(shipment))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Dialog open={handoverDialogOpen} onOpenChange={setHandoverDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Prepare handover</DialogTitle>
                <DialogDescription>
                  Provide the receiving party and any checkpoint notes. Once confirmed the shipment will move to the next leg.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="handoverToUUID" className="text-sm font-medium">
                    Receiving party UUID
                  </label>
                  <Input
                    id="handoverToUUID"
                    placeholder="0x1234…abcd"
                    value={handoverForm.handoverToUUID}
                    onChange={(e) =>
                      setHandoverForm((prev) => ({ ...prev, handoverToUUID: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="checkpointNote" className="text-sm font-medium">
                    Checkpoint / logistics note
                  </label>
                  <Textarea
                    id="checkpointNote"
                    rows={3}
                    placeholder="e.g., Handover scheduled at Central Logistics Hub, dock #4."
                    value={handoverForm.checkpointNote}
                    onChange={(e) =>
                      setHandoverForm((prev) => ({ ...prev, checkpointNote: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="temperatureCheck" className="text-sm font-medium">
                    Temperature compliance check
                  </label>
                  <Input
                    id="temperatureCheck"
                    placeholder="e.g., 4°C on departure"
                    value={handoverForm.temperatureCheck}
                    onChange={(e) =>
                      setHandoverForm((prev) => ({ ...prev, temperatureCheck: e.target.value }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setHandoverDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleHandoverSubmit} disabled={handoverLoading}>
                  {handoverLoading ? (
                    <>
                      <LoaderIndicator />
                      Submitting…
                    </>
                  ) : (
                    'Confirm handover'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {role === 'WAREHOUSE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Incoming Shipments</CardTitle></CardHeader>
            <CardContent>
              {loadingIncoming ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : (incoming as any[]).length === 0 ? (
                <p className="text-muted-foreground">No incoming shipments</p>
              ) : (
                <div className="space-y-3">
                  {(incoming as any[]).map((s: any) => (
                    <div key={s.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Shipment: {s.id}</p>
                          <p className="text-xs text-muted-foreground">Products: {(s.productIds || []).length}</p>
                        </div>
                        <Badge variant={s.status === 'PREPARING' ? 'outline' : 'secondary'}>{s.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>From: {s.fromUUID}</span>
                        <span>Checkpoints: {(s.checkpointIds || []).length}</span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <ViewShipmentButton shipmentId={s.id} />
                        <Button size="sm" disabled={acceptShipment.isPending && acceptingShipmentId === s.id} onClick={() => acceptShipment.mutate(s.id)}>
                          {acceptShipment.isPending && acceptingShipmentId === s.id ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Accepting...</>) : 'Accept'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Handover Guidelines</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3"><div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div><div><p className="font-medium">Scan QR Code</p><p className="text-muted-foreground">Scan the product QR to verify handover details.</p></div></div>
              <div className="flex gap-3"><div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div><div><p className="font-medium">Verify Sender</p><p className="text-muted-foreground">Confirm the origin and route checkpoints before accepting.</p></div></div>
              <div className="flex gap-3"><div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div><div><p className="font-medium">Record Issues</p><p className="text-muted-foreground">Note any discrepancies or damages during receipt.</p></div></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

function SupplierSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SupplierEmptyState({
  icon: Icon,
  title,
  description,
  isLoading,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/30 bg-muted/10">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
        {isLoading ? <LoaderIndicator /> : <Icon className="w-10 h-10 text-muted-foreground" />}
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

function SupplierSampleCard() {
  return (
    <Card className="border border-dashed border-primary/30 bg-primary/5 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          API Field Expectations
        </CardTitle>
        <CardDescription className="text-sm">
          Example payload the frontend expects from `/shipments/incoming/:supplierUuid`.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-muted-foreground">
        <dl className="grid gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <dt className="font-medium text-foreground">Shipment ID</dt>
            <dd><code>SHIP-4723</code></dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <dt className="font-medium text-foreground">Manufacturer</dt>
            <dd><code>manufacturerName</code> + <code>fromUUID</code></dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <dt className="font-medium text-foreground">Status</dt>
            <dd><code>PENDING_ACCEPTANCE</code> | <code>ACCEPTED</code> | …</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <dt className="font-medium text-foreground">ETA</dt>
            <dd><code>expectedArrival (ISO)</code></dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <dt className="font-medium text-foreground">Route</dt>
            <dd><code>originType</code> → <code>destinationType</code></dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <dt className="font-medium text-foreground">Area Data</dt>
            <dd>
              <code>originArea</code>, <code>destinationArea</code>, <code>areaTags: string[]</code>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-medium text-foreground">Items</dt>
            <dd>
              <code>{'shipmentItems: Array<{ product_uuid, productName, quantity }>'}</code>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-medium text-foreground">Optional</dt>
            <dd>
              <code>destinationCheckpoint</code>, <code>acceptedAt</code>, <code>handoverDetails</code>, <code>routeType</code>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function LoaderIndicator() {
  return (
    <span className="inline-flex items-center justify-center">
      <svg
        className="animate-spin h-4 w-4 text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </span>
  );
}

function supplierStatusBadgeClass(status: string) {
  switch (status) {
    case 'PENDING_ACCEPTANCE':
    case 'PREPARING':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'ACCEPTED':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'IN_TRANSIT':
    case 'READY_FOR_HANDOVER':
    case 'HANDOVER_PENDING':
      return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'HANDOVER_READY':
    case 'HANDOVER_COMPLETED':
    case 'COMPLETED':
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'CLOSED':
      return 'bg-muted text-muted-foreground border';
    case 'REJECTED':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-muted text-muted-foreground border';
  }
}

function humanizeSupplierStatus(status: string) {
  return status.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export default Handover;

// Inline edit component for shipments
function EditShipmentButton({ shipment, checkpoints, onUpdated }: { shipment: any; checkpoints: any[]; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [dest, setDest] = useState<string>(shipment.destinationPartyUUID ?? shipment.toUUID ?? '');
  const [legs, setLegs] = useState<Array<{ startId: string; endId: string; estArrival: string; expectedShip: string; timeTolerance: string; requiredAction: string }>>(
    (shipment.checkpoints || []).map((c: any) => ({
      startId: String(c.start_checkpoint_id ?? c.startId ?? ''),
      endId: String(c.end_checkpoint_id ?? c.endId ?? ''),
      estArrival: c.estimated_arrival_date ?? c.estArrival ?? '',
      expectedShip: c.expected_ship_date ?? c.expectedShip ?? '',
      timeTolerance: c.time_tolerance ?? c.timeTolerance ?? '',
      requiredAction: c.required_action ?? c.requiredAction ?? '',
    }))
  );

  const qc = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (payload: any) => shipmentService.update(String(shipment.id), payload),
    onSuccess: () => {
      onUpdated();
      setOpen(false);
    },
  });

  const toISO = (s: string) => {
    if (!s) return '';
    try { return new Date(s).toISOString(); } catch { return s; }
  };

  const handleSave = () => {
    const checkpointsPayload = (legs || [])
      .filter((l) => l.startId && l.endId)
      .map((l) => ({
        start_checkpoint_id: isFinite(Number(l.startId)) ? Number(l.startId) : l.startId,
        end_checkpoint_id: isFinite(Number(l.endId)) ? Number(l.endId) : l.endId,
        estimated_arrival_date: toISO(l.estArrival),
        time_tolerance: l.timeTolerance || '2h',
        expected_ship_date: toISO(l.expectedShip),
        required_action: l.requiredAction || 'None',
      }));
    updateMutation.mutate({ destinationPartyUUID: dest, checkpoints: checkpointsPayload });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Shipment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Destination Party UUID</label>
            <Input value={dest} onChange={(e) => setDest(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Route Legs</p>
            {(legs || []).map((leg, idx) => (
              <div key={idx} className="border rounded-md p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Start Checkpoint</label>
                  <Select value={leg.startId} onValueChange={(v) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, startId: v } : l))}>
                    <SelectTrigger><SelectValue placeholder="Select start" /></SelectTrigger>
                    <SelectContent>
                      {checkpoints.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Checkpoint</label>
                  <Select value={leg.endId} onValueChange={(v) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, endId: v } : l))}>
                    <SelectTrigger><SelectValue placeholder="Select end" /></SelectTrigger>
                    <SelectContent>
                      {checkpoints.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Expected Ship Date</label>
                  <Input type="datetime-local" value={leg.expectedShip} onChange={(e) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, expectedShip: e.target.value } : l))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Estimated Arrival</label>
                  <Input type="datetime-local" value={leg.estArrival} onChange={(e) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, estArrival: e.target.value } : l))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Time Tolerance</label>
                  <Input placeholder="2h" value={leg.timeTolerance} onChange={(e) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, timeTolerance: e.target.value } : l))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Required Action</label>
                  <Input placeholder="Temperature check" value={leg.requiredAction} onChange={(e) => setLegs((arr) => arr.map((l, i) => i === idx ? { ...l, requiredAction: e.target.value } : l))} />
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => setLegs((arr) => [...arr, { startId: '', endId: '', estArrival: '', expectedShip: '', timeTolerance: '', requiredAction: '' }])}>
              <Plus className="w-4 h-4 mr-1" /> Add Leg
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline view component for shipments
function ViewShipmentButton({ shipmentId }: { shipmentId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => shipmentService.getById(shipmentId),
    enabled: open,
  });

  const s: any = data || {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">View</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Shipment Details</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><p className="text-muted-foreground">Shipment ID</p><p className="font-medium break-all">{s.id}</p></div>
              <div><p className="text-muted-foreground">Status</p><p className="font-medium">{s.status ?? 'PREPARING'}</p></div>
              <div><p className="text-muted-foreground">Manufacturer</p><p className="font-medium break-all">{s.manufacturerUUID ?? s.fromUUID}</p></div>
              <div><p className="text-muted-foreground">Destination</p><p className="font-medium break-all">{s.destinationPartyUUID ?? s.toUUID}</p></div>
            </div>

            <div>
              <p className="text-muted-foreground mb-1">Items</p>
              {(s.shipmentItems && s.shipmentItems.length > 0) ? (
                <div className="border rounded-md divide-y">
                  {s.shipmentItems.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-2">
                      <span className="truncate">{it.product_uuid}</span>
                      <span className="text-muted-foreground">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No items listed</p>
              )}
            </div>

            <div>
              <p className="text-muted-foreground mb-1">Route Checkpoints</p>
              {(s.checkpoints && s.checkpoints.length > 0) ? (
                <div className="border rounded-md divide-y">
                  {s.checkpoints.map((c: any, idx: number) => (
                    <div key={idx} className="p-2 space-y-1">
                      <p className="font-medium text-xs">Leg {idx + 1}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Start</span>: {c.start_checkpoint_id}</div>
                        <div><span className="text-muted-foreground">End</span>: {c.end_checkpoint_id}</div>
                        <div><span className="text-muted-foreground">Exp Ship</span>: {c.expected_ship_date}</div>
                        <div><span className="text-muted-foreground">ETA</span>: {c.estimated_arrival_date}</div>
                        <div><span className="text-muted-foreground">Tolerance</span>: {c.time_tolerance}</div>
                        <div><span className="text-muted-foreground">Action</span>: {c.required_action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No checkpoints listed</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
