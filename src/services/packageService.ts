import { api } from "./api";

export interface PackagePayload {
  batchId: string;
  packageCode: string;
  quantity: number;
  unit?: string;
  status?: string;
  notes?: string;
  manufacturerUUID?: string;
}

export interface UpdatePackagePayload extends Partial<PackagePayload> {}

export interface PackageResponse {
  id: string;
  batchId: string;
  packageCode?: string;
  quantity?: number;
  quantityAvailable?: number;
  unit?: string;
  status?: string;
  notes?: string;
  manufacturerUUID?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const packageService = {
  async listByManufacturer(manufacturerUUID: string) {
    const res = await api.get<PackageResponse[]>(
      `/api/packages/manufacturer/${manufacturerUUID}`,
    );
    return res.data;
  },

  async listByBatch(batchId: string) {
    const res = await api.get<PackageResponse[]>(
      `/api/batches/${batchId}/packages`,
    );
    return res.data;
  },

  async create(payload: PackagePayload) {
    const res = await api.post<PackageResponse>("/api/packages", payload);
    return res.data;
  },

  async update(id: string, payload: UpdatePackagePayload) {
    const res = await api.put<PackageResponse>(`/api/packages/${id}`, payload);
    return res.data;
  },
};
