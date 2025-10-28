import { api } from "./api";
import type { Product } from "@/types";

export interface CreateProductRequest {
  productName: string;
  productCategoryId: string;
  requiredStartTemp: string;
  requiredEndTemp: string;
  handlingInstructions: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface ProductQuery {
  categoryId?: string;
}

const buildQueryString = (params?: ProductQuery) => {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  if (params.categoryId) {
    searchParams.set("categoryId", params.categoryId);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const productRegistryService = {
  async registerProduct(data: CreateProductRequest): Promise<Product> {
    const res = await api.post("/api/products", data);
    return res.data;
  },

  async getAllProducts(params?: ProductQuery): Promise<Product[]> {
    const res = await api.get(`/api/products${buildQueryString(params)}`);
    return res.data;
  },

  async getProductById(id: string): Promise<Product> {
    const res = await api.get(`/api/products/${id}`);
    return res.data;
  },

  async updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
    const res = await api.put(`/api/products/${id}`, data);
    return res.data;
  },
};
