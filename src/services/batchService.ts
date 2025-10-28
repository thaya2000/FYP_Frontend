import { api } from "./api";

export interface CreateBatchRequest {
  productId: string;
  manufacturerUUID: string;
  facility: string;
  productionStartTime: string;
  productionEndTime: string;
  quantityProduced: string;
  expiryDate: string;
}

export interface UpdateBatchRequest extends Partial<CreateBatchRequest> {}

export const batchService = {
  async getAllBatches(uuid: string) {
    const res = await api.get(`/api/batches/manufacturer/${uuid}`);
    return res.data;
  },

  async getBatchesByProduct(productId: string) {
    const res = await api.get(`/api/products/${productId}/batches`);
    return res.data;
  },

  async getBatchById(id: number | string) {
    const res = await api.get(`/api/batches/${id}`);
    return res.data;
  },

  async createBatch(data: CreateBatchRequest) {
    const res = await api.post("/api/batches", data);
    return res.data;
  },

  async updateBatch(id: string, data: UpdateBatchRequest) {
    const res = await api.put(`/api/batches/${id}`, data);
    return res.data;
  },
};
