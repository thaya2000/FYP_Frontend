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
  originType?: "MANUFACTURER" | "WAREHOUSE" | "SUPPLIER" | "CONSUMER" | "DISTRIBUTOR" | string;
  destinationType?: "MANUFACTURER" | "WAREHOUSE" | "SUPPLIER" | "CONSUMER" | "DISTRIBUTOR" | string;
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
  shipmentItems?: Array<{ product_uuid?: string; productName?: string; quantity?: number }>;
  items?: Array<{ product_uuid?: string; productName?: string; quantity?: number }>;
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
  toUUID?: string;
  status?: string;
  shipmentItems?: Array<{ quantity?: number; product_uuid?: string }>;
  productIds?: string[];
  checkpoints?: Array<{
    start_checkpoint_id?: number | string;
    end_checkpoint_id?: number | string;
  }>;
  checkpointIds?: Array<number | string>;
  [key: string]: unknown;
};

export type HandoverFormState = {
  latitude: string;
  longitude: string;
};

export type BatchFormatter = (batch: ProductBatchSummary) => string | undefined;
