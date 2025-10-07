import axios from "axios";
import { useAppStore } from "@/lib/store";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
    baseURL: BASE_URL,
});

// ✅ attach JWT token automatically
api.interceptors.request.use((config) => {
    const { token } = useAppStore.getState();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
