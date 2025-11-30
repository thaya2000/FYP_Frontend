import type { ProductBatchSummary } from "@/types";

export type ShipmentLegInput = {
  startId: string;
  endId: string;
  estArrival: string;
  expectedShip: string;
  timeTolerance: string;
  requiredAction?: string;
};

export type SupplierShipmentRecord = {
  id: string;
  segmentId?: string;
  manufacturerName?: string;
  consumerName?: string;
  destinationPartyName?: string;
  destinationPartyUUID?: string;
  fromUUID?: string;
  originType?:
    | "MANUFACTURER"
    | "WAREHOUSE"
    | "SUPPLIER"
    | "CONSUMER"
    | "DISTRIBUTOR"
    | string;
  destinationType?:
    | "MANUFACTURER"
    | "WAREHOUSE"
    | "SUPPLIER"
    | "CONSUMER"
    | "DISTRIBUTOR"
    | string;
  originArea?: string;
  destinationArea?: string;
  area?: string;
  areaTags?: string[];
  pickupArea?: string;
  dropoffArea?: string;
  status?: string;
  expectedArrival?: string;
  expectedShipDate?: string;
  acceptedAt?: string;
  handedOverAt?: string;
  destinationCheckpoint?: string;
  timeTolerance?: string;
  segmentOrder?: number;
  shipmentId?: string;
  actions?: {
    canAccept?: boolean;
    canTakeover?: boolean;
    canHandover?: boolean;
    canDeliver?: boolean;
    [key: string]: boolean | undefined;
  };
  shipmentItems?: Array<{
    product_uuid?: string;
    productName?: string;
    quantity?: number;
  }>;
  items?: Array<{
    product_uuid?: string;
    productName?: string;
    quantity?: number;
  }>;
  checkpoints?: Array<{
    start_checkpoint_id?: number | string;
    end_checkpoint_id?: number | string;
    estimated_arrival_date?: string;
    expected_ship_date?: string;
    time_tolerance?: string;
    required_action?: string;
  }>;
  startCheckpoint?: {
    id?: string;
    state?: string;
    country?: string;
    name?: string;
  };
  endCheckpoint?: {
    id?: string;
    state?: string;
    country?: string;
    name?: string;
  };
  [key: string]: unknown;
};

export type SupplierShipmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELLED";

export type ManufacturerShipmentRecord = {
  id: string;
  destinationPartyUUID?: string;
  destinationPartyName?: string;
  status?: string;
  createdAt?: string;
  totalPackages?: number;
  totalSegments?: number;
  segments?: Array<{
    id?: string;
    segmentOrder?: number;
    status?: string;
    expectedShipDate?: string;
    estimatedArrivalDate?: string;
    timeTolerance?: string;
    startCheckpoint?: {
      id?: string;
      name?: string;
      state?: string;
      country?: string;
    };
    endCheckpoint?: {
      id?: string;
      name?: string;
      state?: string;
      country?: string;
    };
  }>;
  [key: string]: unknown;
};

export type ShipmentsByStatus = {
  PENDING: ManufacturerShipmentRecord[];
  ACCEPTED: ManufacturerShipmentRecord[];
  IN_TRANSIT: ManufacturerShipmentRecord[];
  DELIVERED: ManufacturerShipmentRecord[];
  CLOSED: ManufacturerShipmentRecord[];
  CANCELLED: ManufacturerShipmentRecord[];
};

export type PaginatedShipmentsResponse = {
  shipments: ManufacturerShipmentRecord[];
  cursor: string | null;
  hasMore: boolean;
};

export type HandoverFormState = {
  latitude: string;
  longitude: string;
};

export type BatchFormatter = (batch: ProductBatchSummary) => string | undefined;

// Detailed shipment types for view dialog
export type CheckpointDetail = {
  id: number;
  name: string;
  address?: string;
  state?: string;
  country?: string;
};

export type SupplierDetail = {
  id: string;
  legalName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  type?: string;
};

export type ShipmentSegmentDetail = {
  id: string;
  segmentOrder: number;
  status: string;
  expectedShipDate?: string;
  estimatedArrivalDate?: string;
  timeTolerance?: string;
  createdAt?: string;
  updatedAt?: string;
  startCheckpoint: CheckpointDetail;
  endCheckpoint: CheckpointDetail;
  supplier?: SupplierDetail | null;
};

export type PackageDetail = {
  packageId: string;
  quantity: number;
  status?: string;
  productName: string;
  productCategory?: string;
  batchId?: string;
  expiryDate?: string;
  productionStartTime?: string;
  productionEndTime?: string;
  requiredTempStart?: number;
  requiredTempEnd?: number;
};

export type ShipmentDetailResponse = {
  id: string;
  manufacturer_uuid: string;
  consumer_uuid: string;
  status: string;
  created_at: string;
  updated_at?: string;
  manufacturer_legal_name?: string;
  manufacturer_company_name?: string;
  consumer_legal_name?: string;
  consumer_company_name?: string;
  segments: ShipmentSegmentDetail[];
  packages: PackageDetail[];
};
