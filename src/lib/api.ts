import axios from "axios";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function sanitizeUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveFromLocation(portFallback: string) {
  if (typeof window === "undefined") {
    return `http://127.0.0.1:${portFallback}`;
  }

  const protocol =
    import.meta.env.VITE_API_PROTOCOL?.trim() || window.location.protocol || "http:";
  const hostname = window.location.hostname || "127.0.0.1";
  const port = import.meta.env.VITE_API_PORT?.trim() || portFallback;

  return `${protocol}//${hostname}:${port}`;
}

function overrideLocalhostUrl(url: URL, portFallback: string) {
  if (typeof window === "undefined") {
    return url.toString();
  }

  const currentHost = window.location.hostname || "";
  if (!currentHost || isLocalHost(currentHost)) {
    return url.toString();
  }

  const port = url.port || import.meta.env.VITE_API_PORT?.trim() || portFallback;
  const protocol = url.protocol || window.location.protocol || "http:";
  return `${protocol}//${currentHost}:${port}`;
}

export function resolveApiBaseUrl() {
  const defaultPort = "5000";
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configured) {
    try {
      const parsed = new URL(configured);
      if (isLocalHost(parsed.hostname)) {
        return sanitizeUrl(overrideLocalhostUrl(parsed, defaultPort));
      }
      return sanitizeUrl(parsed.toString());
    } catch {
      // fall through to location based resolution
    }
  }

  return sanitizeUrl(resolveFromLocation(defaultPort));
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
