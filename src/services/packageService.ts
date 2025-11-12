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

export interface UpdatePackagePayload extends Partial<PackagePayload> { }

export interface PackageResponse {
  id?: string;
  package_uuid?: string;
  batchId?: string;
  packageCode?: string;
  quantity?: number;
  quantityAvailable?: number;
  unit?: string;
  status?: string;
  notes?: string;
  manufacturerUUID?: string;
  microprocessorMac?: string;
  sensorTypes?: string[] | string;
  createdAt?: string;
  updatedAt?: string;
  payloadHash?: string | null;
  txHash?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  pinataCid?: string | null;
  pinataPinnedAt?: string | null;
  batch?: {
    id: string;
    batchCode?: string | null;
    product?: {
      id: string;
      name?: string | null;
      productName?: string | null;
    } | null;
  } | null;
}

export interface PackageRegistryPayload {
  manufacturerUUID: string;
  batchId: string;
  microprocessorMac: string;
  sensorTypes: string[];
}

export const packageService = {
  async listByManufacturer(manufacturerUUID: string) {
    const res = await api.get<PackageResponse[]>(
      `/api/package-registry/manufacturer/${manufacturerUUID}`,
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

  async register(payload: PackageRegistryPayload) {
    const res = await api.post("/api/package-registry", payload);
    return res.data;
  },
};
