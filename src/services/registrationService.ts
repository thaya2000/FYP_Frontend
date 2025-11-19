import axios from "axios";
import { useAppStore } from "@/lib/store";
import { api } from "./api";

// const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// export const api = axios.create({
//     baseURL: BASE_URL,
// });

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

    async getById(registrationId: string) {
        const res = await api.get(`/api/registrations/${registrationId}`);
        return res.data;
    },

    async update(registrationId: string, payload: unknown) {
        const res = await api.put(`/api/registrations/${registrationId}`, payload);
        return res.data;
    },

    async approve(registrationId: string) {
        const res = await api.patch(`/api/registrations/${registrationId}/approve`);
        return res.data;
    },
};
