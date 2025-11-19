import { http } from "wagmi";
import { defineChain } from "viem";
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { createWeb3Modal } from "@web3modal/wagmi/react";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function isLocalHost(host?: string | null) {
  if (!host) {
    return false;
  }
  return LOCAL_HOSTS.has(host);
}

function resolveRpcUrl() {
  const fallbackPort = import.meta.env.VITE_CHAIN_RPC_PORT?.trim() || "7545";
  const configured = import.meta.env.VITE_CHAIN_RPC_URL?.trim();
  const locationHost =
    typeof window !== "undefined" ? window.location.hostname : undefined;
  const locationProtocol =
    typeof window !== "undefined" ? window.location.protocol : "http:";

  if (configured) {
    try {
      const parsed = new URL(
        configured.startsWith("http") ? configured : `http://${configured}`
      );

      if (locationHost && !isLocalHost(locationHost) && isLocalHost(parsed.hostname)) {
        const port = parsed.port || fallbackPort;
        const protocol = parsed.protocol || locationProtocol || "http:";
        return `${protocol}//${locationHost}:${port}`;
      }

      return parsed.toString();
    } catch {
      // fall through to the computed values below
    }
  }

  if (locationHost && locationProtocol) {
    return `${locationProtocol}//${locationHost}:${fallbackPort}`;
  }

  return `http://127.0.0.1:${fallbackPort}`;
}

const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "demo";

if (projectId === "demo") {
  console.warn(
    "[web3] VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will use the public demo key which is rate-limited. Create a free key at https://cloud.walletconnect.com."
  );
}

const appName =
  import.meta.env.VITE_WEB3MODAL_APP_NAME?.trim() || "Supply Chain Registry";
const appDescription =
  import.meta.env.VITE_WEB3MODAL_APP_DESCRIPTION?.trim() ||
  "Secure supply chain registry portal";
const appUrl =
  import.meta.env.VITE_WEB3MODAL_APP_URL?.trim() || "http://localhost:8080";
const appIcon =
  import.meta.env.VITE_WEB3MODAL_APP_ICON?.trim() ||
  "https://avatars.githubusercontent.com/u/37784886";

const chainId = Number.parseInt(
  import.meta.env.VITE_CHAIN_ID?.trim() || "1337",
  10
);

const rpcUrl = resolveRpcUrl();

export const ganache = defineChain({
  id: Number.isFinite(chainId) ? chainId : 1337,
  name: import.meta.env.VITE_CHAIN_NAME?.trim() || "Ganache Local",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
});

const chains = [ganache];

export const wagmiConfig = defaultWagmiConfig({
  projectId,
  chains,
  metadata: {
    name: appName,
    description: appDescription,
    url: appUrl,
    icons: [appIcon],
  },
  transports: {
    [ganache.id]: http(rpcUrl),
  },
  enableInjected: true,
  enableWalletConnect: true,
  enableCoinbase: false,
});

declare global {
  interface Window {
    __WEB3MODAL_INITIALIZED__?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__WEB3MODAL_INITIALIZED__) {
  window.__WEB3MODAL_INITIALIZED__ = true;
  createWeb3Modal({
    wagmiConfig,
    projectId,
    chains,
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#f97316",
    },
  });
}
