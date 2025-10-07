import axios from "axios";
import { useAppStore } from "@/lib/store";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
    baseURL: BASE_URL,
});

// ✅ Automatically attach Bearer token
api.interceptors.request.use((config) => {
    const { token } = useAppStore.getState();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ✅ Service
export const registrationService = {
    async getPending() {
        const res = await api.get("/api/registrations/pending");
        return res.data;
    },

    async getApproved() {
        const res = await api.get("/api/registrations/approved");
        return res.data;
    },

    async getByUUID(client_uuid: string) {
        const res = await api.get(`/api/registrations/${client_uuid}`);
        return res.data;
    },

    async approve(client_uuid: string) {
        const res = await api.patch(`/api/registrations/${client_uuid}/approve`);
        return res.data;
    },
};
