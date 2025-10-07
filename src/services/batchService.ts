import { api } from "./api";

export const batchService = {
    async getAllBatches() {
        const res = await api.get("/batches");
        return res.data;
    },

    async getBatchById(id: number) {
        const res = await api.get(`/batches/${id}`);
        return res.data;
    },

    async createBatch(data: {
        productCategory: string;
        manufacturerUUID: string;
        facility: string;
        productionWindow: string;
        quantityProduced: string;
        releaseStatus: string;
    }) {
        const res = await api.post("/batches", data);
        return res.data;
    },
};
