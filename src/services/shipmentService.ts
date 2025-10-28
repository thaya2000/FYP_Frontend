import { api } from './api';

export interface ShipmentItem {
  id: string;
  productIds: string[];
  fromUUID: string;
  toUUID: string;
  checkpointIds: string[];
  status: 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'ACCEPTED' | string;
  createdAt?: string;
}

export interface ShipmentPackagePayload {
  product_category_id: string;
  product_uuid: string;
  batch_id: string;
  package_id: string;
  quantity: number;
}

// New backend schema for shipment creation
export interface CreateShipmentRequest {
  manufacturerUUID: string;
  destinationPartyUUID: string;
  shipmentItems: ShipmentPackagePayload[];
  checkpoints: Array<{
    start_checkpoint_id: number | string;
    end_checkpoint_id: number | string;
    estimated_arrival_date: string; // ISO
    time_tolerance: string; // e.g., "2h"
    expected_ship_date: string; // ISO
    required_action: string;
  }>;
}

export const shipmentService = {
  async create(data: CreateShipmentRequest): Promise<any> {
    const res = await api.post('/api/shipments', data);
    return res.data;
  },

  async update(id: string, data: Partial<CreateShipmentRequest>): Promise<any> {
    const res = await api.put(`/api/shipments/${id}`, data);
    return res.data;
  },

  async getIncoming(ownerUUID: string): Promise<ShipmentItem[]> {
    const res = await api.get(`/api/shipments/incoming/${ownerUUID}`);
    return res.data;
  },

  async getByManufacturer(uuid: string): Promise<any[]> {
    const res = await api.get(`/api/shipments`);
    return res.data;
  },

  async getById(id: string | number): Promise<any> {
    const res = await api.get(`/api/shipments/${id}`);
    return res.data;
  },

  async accept(id: string): Promise<ShipmentItem> {
    const res = await api.put(`/api/shipments/${id}/accept`);
    return res.data;
  },
};
