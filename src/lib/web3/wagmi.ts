import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { defineChain, type Chain } from "viem";
import { injected } from "wagmi/connectors";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function isLocalHost(host?: string | null) {
  if (!host) {
    return false;
  }
  return LOCAL_HOSTS.has(host);
}

function resolveRpcUrl() {
  const fallbackPort = import.meta.env.VITE_CHAIN_RPC_PORT?.trim() || "7545";
  const configured =
    import.meta.env.VITE_CHAIN_RPC_URL?.trim() ||
    import.meta.env.VITE_RPC_URL?.trim(); // Check both variable names

  const locationHost =
    typeof window !== "undefined" ? window.location.hostname : undefined;
  const locationProtocol =
    typeof window !== "undefined" ? window.location.protocol : "http:";

  if (configured) {
    try {
      const parsed = new URL(
        configured.startsWith("http") ? configured : `http://${configured}`
      );

      if (
        locationHost &&
        !isLocalHost(locationHost) &&
        isLocalHost(parsed.hostname)
      ) {
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

const chainId = Number.parseInt(
  import.meta.env.VITE_CHAIN_ID?.trim() || "1337",
  10
);

const rpcUrl = resolveRpcUrl();

export const ganache = defineChain({
  id: Number.isFinite(chainId) ? chainId : 1337,
  name: import.meta.env.VITE_CHAIN_NAME?.trim() || "Ganache",
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

const chains: readonly [Chain, ...Chain[]] = [ganache, mainnet];

export const wagmiConfig = createConfig({
  chains,
  transports: {
    [ganache.id]: http(rpcUrl),
  },
  connectors: [injected({ shimDisconnect: true })],
});
