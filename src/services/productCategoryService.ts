import { api } from "./api";

export interface ProductCategoryPayload {
  name: string;
}

export interface UpdateProductCategoryPayload extends ProductCategoryPayload {}

export interface ProductCategoryResponse {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const productCategoryService = {
  async list() {
    const res = await api.get<ProductCategoryResponse[]>("/api/product-categories");
    return res.data;
  },

  async create(payload: ProductCategoryPayload) {
    const res = await api.post<ProductCategoryResponse>("/api/product-categories", payload);
    return res.data;
  },

  async update(id: string, payload: UpdateProductCategoryPayload) {
    const res = await api.put<ProductCategoryResponse>(`/api/product-categories/${id}`, payload);
    return res.data;
  },
};
