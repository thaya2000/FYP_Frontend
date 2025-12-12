import { api } from "./api";

export interface ShipmentItem {
  id: string;
  manufacturerUUID: string;
  destinationPartyUUID: string;
  status: "PREPARING" | "IN_TRANSIT" | "DELIVERED" | "ACCEPTED" | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShipmentPackagePayload {
  package_uuid: string;
}

export interface ShipmentCheckpointPayload {
  start_checkpoint_id: number | string;
  end_checkpoint_id: number | string;
  estimated_arrival_date: string;
  time_tolerance?: string;
  expected_ship_date?: string;
  segment_order: number;
  required_action?: string;
}

export interface CreateShipmentRequest {
  manufacturerUUID: string;
  destinationPartyUUID: string;
  shipmentItems: ShipmentPackagePayload[];
  checkpoints: ShipmentCheckpointPayload[];
}

export const shipmentService = {
  async create(data: CreateShipmentRequest): Promise<any> {
    const res = await api.post("/api/shipments", data);
    return res.data;
  },

  async update(id: string, data: Partial<CreateShipmentRequest>): Promise<any> {
    const res = await api.put(`/api/shipments/${id}`, data);
    return res.data;
  },

  async getIncoming(ownerUUID?: string): Promise<any[]> {
    const config = ownerUUID ? { params: { ownerUUID } } : undefined;
    const res = await api.get(`/api/shipment-segments/pending`, config);
    const payload = res.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }
    return [];
  },

  async getSupplierSegments(params?: {
    status?: string;
    ownerUUID?: string;
    cursor?: string;
    limit?: number;
  }): Promise<any[]> {
    const res = await api.get(`/api/shipment-segments/supplier`, { params });
    const payload = res.data;
    if (payload && Array.isArray(payload.segments)) {
      return payload;
    }
    if (Array.isArray(payload)) {
      return { segments: payload, cursor: null, hasMore: false };
    }
    if (payload && Array.isArray(payload.data)) {
      return { segments: payload.data, cursor: payload.cursor ?? null, hasMore: false };
    }
    return { segments: [], cursor: null, hasMore: false };
  },

  async getByManufacturer(
    uuid: string,
    options?: { status?: string; cursor?: string; limit?: number }
  ): Promise<any> {
    const params: Record<string, any> = { manufacturerUUID: uuid };
    if (options?.status) params.status = options.status;
    if (options?.cursor) params.cursor = options.cursor;
    if (options?.limit) params.limit = options.limit;

    const res = await api.get("/api/shipments", { params });
    return res.data;
  },

  async getById(id: string | number): Promise<any> {
    const res = await api.get(`/api/shipments/${id}`);
    return res.data;
  },

  async getSegmentById(id: string | number): Promise<any> {
    const res = await api.get(`/api/shipment-segments/${id}`);
    return res.data;
  },

  async accept(segmentId: string): Promise<any> {
    const res = await api.post(`/api/shipment-segments/accept/${segmentId}`);
    return res.data;
  },

  async takeOver(
    segmentId: string,
    coords: { latitude: number; longitude: number }
  ): Promise<any> {
    const res = await api.post(
      `/api/shipment-segments/takeover/${segmentId}`,
      coords
    );
    return res.data;
  },

  async handover(
    segmentId: string,
    coords: { latitude: number; longitude: number }
  ): Promise<any> {
    const res = await api.post(
      `/api/shipment-segments/handover/${segmentId}`,
      coords
    );
    return res.data;
  },
};
