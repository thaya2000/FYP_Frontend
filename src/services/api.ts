import axios from "axios";
import { useAppStore } from "@/lib/store";
import { resolveApiBaseUrl } from "@/lib/api";

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const { token } = useAppStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
