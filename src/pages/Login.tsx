import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useSignMessage, useDisconnect, useConnect } from "wagmi";
import { wagmiConfig } from "@/lib/web3/wagmi";
import {
  connectMetaMaskSDK,
  getMetaMaskProvider,
} from "@/lib/web3/metamask-sdk";
import {
  Loader2,
  Shield,
  Lock,
  Sparkles,
  Package,
  CheckCircle2,
  Info,
  Wallet,
  FileSignature,
  CheckCheck,
  Zap,
  Network,
  LogOut,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import metamaskFox from "@/img/metamask_fox.png";

type LoginStep =
  | "idle"
  | "connecting"
  | "fetching_nonce"
  | "ready_to_sign"
  | "signing"
  | "verifying"
  | "success"
  | "error";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Connect your wallet to continue");
  const [step, setStep] = useState<LoginStep>("idle");
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);
  const [usingSdk, setUsingSdk] = useState(false);
  const [sdkAddress, setSdkAddress] = useState<string | null>(null);

  const navigate = useNavigate();
  const { signMessageAsync } = useSignMessage();
  const {
    address: connectedAddress,
    isConnected,
    status: accountStatus,
  } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Detect mobile browser (not MetaMask browser)
  const isMobileBrowser = () => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const ethereum = (window as any).ethereum;

    // Check if it's truly MetaMask browser (not just injected provider)
    const isMetaMaskBrowser =
      ethereum?.isMetaMask &&
      (ua.includes("metamask") || ethereum?.isMetaMaskMobile);

    const shouldUseSDK = isMobile && !isMetaMaskBrowser;

    console.log("[Mobile Detection]", {
      isMobile,
      hasEthereum: !!ethereum,
      isMetaMask: ethereum?.isMetaMask,
      isMetaMaskBrowser,
      shouldUseSDK,
      userAgent: ua,
    });

    return shouldUseSDK;
  };

  const clearWalletConnectStorage = () => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const { localStorage, sessionStorage } = window;
      const wcKeys = Object.keys(localStorage).filter(
        (key) =>
          key.startsWith("wc@2") ||
          key.startsWith("walletconnect") ||
          key.startsWith("wagmi")
      );
      wcKeys.forEach((key) => localStorage.removeItem(key));
      sessionStorage.removeItem("wagmi.store");
    } catch (error) {
      console.warn("[Login] Failed to clear WalletConnect cache", error);
    }
  };

  // Abort pending requests on mount/cleanup (fixes "Connection declined" on mobile)
  useEffect(() => {
    const abortController = new AbortController();

    return () => {
      // Cleanup: abort any pending requests to prevent stale connection errors
      abortController.abort();
    };
  }, []);

  type WalletErrorInfo = { message: string; code?: number };

  const extractWalletError = (err: unknown): WalletErrorInfo => {
    if (typeof err === "string") {
      return { message: err, code: undefined };
    }
    if (err && typeof err === "object") {
      const maybeMessage =
        "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : "";
      const maybeCode =
        "code" in err ? Number((err as { code?: unknown }).code) : undefined;
      return {
        message: maybeMessage,
        code: Number.isFinite(maybeCode) ? maybeCode : undefined,
      };
    }
    return { message: "", code: undefined };
  };

  const setAuth = useAppStore((s) => s.setAuth);
  const setWalletConnection = useAppStore((s) => s.setWalletConnection);

  useEffect(() => {
    if (connectedAddress) {
      setWalletConnection(connectedAddress as `0x${string}`);

      // Pre-fetch nonce silently to enable 1-click login
      const prefetchNonce = async () => {
        try {
          console.log("[Login] Pre-fetching nonce...");
          const { data } = await api.get("/auth/nonce", {
            params: { address: connectedAddress },
          });
          setNonce(data.nonce);
          console.log("[Login] Nonce pre-fetched");
        } catch (err) {
          console.error("[Login] Failed to pre-fetch nonce:", err);
          // Ignore error, fallback to manual fetch on click
        }
      };
      prefetchNonce();
    } else {
      setWalletConnection(null);
      setNonce(null);
    }
  }, [connectedAddress, setWalletConnection]);

  // Reset loading state when connected so user can click "Login"
  useEffect(() => {
    if (
      isConnected &&
      step !== "ready_to_sign" &&
      step !== "signing" &&
      step !== "verifying" &&
      step !== "success"
    ) {
      setLoading(false);
      setWalletConnecting(false);
      setStatus("Wallet connected! Click 'Sign In' to verify ownership.");
    }
  }, [isConnected, step]);

  // Handle reconnecting state
  useEffect(() => {
    if (accountStatus === "reconnecting") {
      setLoading(true);
      setStatus("Restoring wallet connection...");
    } else if (accountStatus === "connected" && !loading && step === "idle") {
      setLoading(false);
    }
  }, [accountStatus]);

  // Reset state if disconnected
  useEffect(() => {
    if (!isConnected && accountStatus !== "reconnecting") {
      console.log("[Login] Disconnected, resetting state");
      setLoading(false);
      setWalletConnecting(false);
      setStep("idle");
      setStatus("Connect your wallet to continue");
    }
  }, [isConnected, accountStatus]);

  const [rpcError, setRpcError] = useState(false);

  // Check if RPC is reachable (diagnose Firewall issues)
  useEffect(() => {
    const checkRpcConnection = async () => {
      try {
        // We use the same logic as wagmi.ts to get the RPC URL
        const rpcUrl = wagmiConfig.chains[0].rpcUrls.default.http[0];
        console.log("[Login] Checking RPC connection to:", rpcUrl);

        // Simple fetch to check connectivity (POST to avoid GET issues with some RPCs)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(rpcUrl, {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "net_version",
            params: [],
            id: 1,
          }),
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        setRpcError(false);
      } catch (err) {
        console.error(
          "[Login] RPC Connection failed. Firewall might be blocking port 7545.",
          err
        );
        setRpcError(true);
      }
    };

    checkRpcConnection();
  }, []);

  const describeWalletError = (
    err: unknown,
    info: WalletErrorInfo = extractWalletError(err)
  ) => {
    const { message, code } = info;
    const normalized = message?.toLowerCase?.() ?? "";

    if (message === "WALLET_CONNECTION_CANCELLED") {
      return "Wallet connection was closed. Re-open the Connect Wallet modal and approve the request.";
    }
    if (code === -32002) {
      return "Your wallet already has a pending request. We cleared the stale WalletConnect session—open MetaMask, finish the prompt, then tap Connect Wallet again.";
    }
    if (
      normalized.includes("user rejected") ||
      normalized.includes("user denied")
    ) {
      return "Signature cancelled. Please try again when ready.";
    }
    if (normalized.includes("network") || normalized.includes("rpc")) {
      return "Network error. Make sure Ganache is reachable and that you've selected the correct chain (Chain ID 1337).";
    }
    if (message) {
      return `Connection failed: ${message}`;
    }
    return "Connection failed. Please try again.";
  };

  const handleWalletError = (
    err: unknown,
    { markStepError = true }: { markStepError?: boolean } = {}
  ) => {
    const info = extractWalletError(err);
    console.error("Wallet error:", err);

    let shouldMarkError = markStepError;

    if (info.code === -32002) {
      console.warn(
        "[Login] Stale WalletConnect session detected. Clearing cache and disconnecting."
      );
      clearWalletConnectStorage();
      disconnect();
      setWalletConnecting(false);
      setStep("idle");
      shouldMarkError = false;
    }

    setStatus(describeWalletError(err, info));
    if (shouldMarkError) {
      setStep("error");
    }
  };
  // Step 1: Fetch Nonce
  const initiateLogin = async (address: `0x${string}`) => {
    try {
      setLoading(true);
      setStep("fetching_nonce");
      setStatus("Preparing secure login...");

      // Request nonce from backend with retry logic for mobile
      let retries = 0;
      const maxRetries = 3;
      let nonceData;

      while (retries < maxRetries) {
        try {
          const { data } = await api.get("/auth/nonce", {
            params: { address },
          });
          nonceData = data;
          break;
        } catch (err: unknown) {
          retries++;
          if (retries >= maxRetries) throw err;

          const waitTime = Math.pow(2, retries - 1) * 1000; // Exponential backoff
          console.warn(
            `[Login] Nonce fetch attempt ${retries} failed, retrying in ${waitTime}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

      setNonce(nonceData.nonce);

      // Stop loading and ask user to sign
      setLoading(false);
      setStep("ready_to_sign");
      setStatus("Ready! Click 'Sign Message' to open your wallet.");
    } catch (err: unknown) {
      console.error("[Login] Nonce fetch error:", err);
      handleWalletError(err);
      setLoading(false);
    }
  };

  // Step 2: Sign Message (Must be direct user action for mobile deep links)
  const performSignature = async () => {
    const activeAddress = connectedAddress || (sdkAddress as `0x${string}`);
    if (!activeAddress || !nonce) return;

    try {
      setLoading(true);
      setStep("signing");
      setStatus("Please sign the message in your wallet...");

      const message = `Registry Login\nAddress: ${activeAddress.toLowerCase()}\nNonce: ${nonce}`;

      let signature: string;

      // Use SDK for mobile browsers, wagmi for desktop
      if (usingSdk && sdkAddress) {
        console.log("[Login] Signing with MetaMask SDK...");
        signature = await signWithSDK(message);
      } else {
        console.log("[Login] Signing with wagmi...");
        signature = await signMessageAsync({
          account: activeAddress,
          message,
        });
      }

      // Send signature back to backend with retry logic
      setStep("verifying");
      setStatus("Verifying signature...");

      let retries = 0;
      const maxRetries = 3;
      let loginResponse;

      while (retries < maxRetries) {
        try {
          loginResponse = await api.post("/auth/login", {
            address: activeAddress,
            signature,
          });
          break;
        } catch (err: unknown) {
          retries++;
          if (retries >= maxRetries) throw err;

          const waitTime = Math.pow(2, retries - 1) * 1000; // Exponential backoff
          console.warn(
            `[Login] Login attempt ${retries} failed, retrying in ${waitTime}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

      const res = loginResponse!;

      // Store JWT + role + address in Zustand store
      setAuth({
        token: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        role: res.data.role,
        address: res.data.address,
        uuid: res.data.uuid,
        expiresIn: res.data.expiresIn,
      });

      setStep("success");
      setStatus("✅ Login successful! Redirecting...");
      setTimeout(() => navigate("/"), 1000);
    } catch (err: unknown) {
      console.error("[Login] Authentication error:", err);
      handleWalletError(err);
      setLoading(false);
      setWalletConnecting(false);
      // Allow retry
      setStep("ready_to_sign");
    }
  };

  const resetConnection = async () => {
    console.log("[Login] Resetting connection state...");
    clearWalletConnectStorage();
    disconnect();
    setUsingSdk(false);
    setSdkAddress(null);

    // Disconnect MetaMask SDK
    try {
      const { disconnectMetaMaskSDK } = require("@/lib/web3/metamask-sdk");
      await disconnectMetaMaskSDK();
    } catch (e) {
      console.warn("[Login] SDK disconnect warning:", e);
    }

    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  // MetaMask SDK connection handler for mobile browsers
  const connectWithSDK = async () => {
    try {
      setStep("connecting");
      setStatus("Opening MetaMask app...");
      setWalletConnecting(true);
      setLoading(true);

      console.log("[MetaMask SDK] Initiating connection...");
      const accounts = await connectMetaMaskSDK();

      if (accounts && accounts.length > 0) {
        const address = accounts[0] as string;
        console.log("[MetaMask SDK] Connected:", address);
        setSdkAddress(address);
        setUsingSdk(true);
        setStatus("Wallet connected! Preparing login...");

        // Auto-fetch nonce
        await initiateLogin(address as `0x${string}`);
      }
    } catch (error) {
      console.error("[MetaMask SDK] Connection failed:", error);
      setStatus("Connection failed. Please try again.");
      setStep("error");
      setLoading(false);
      setWalletConnecting(false);
    }
  };

  // SDK signature handler
  const signWithSDK = async (message: string) => {
    try {
      const provider = await getMetaMaskProvider();
      if (!provider || !sdkAddress) {
        throw new Error("Provider or address not available");
      }

      console.log(
        "[MetaMask SDK] Requesting signature - will open MetaMask app..."
      );

      // Request signature through MetaMask SDK
      // This should automatically trigger deep link to MetaMask app
      const signature = (await provider.request({
        method: "personal_sign",
        params: [message, sdkAddress],
      })) as string;

      console.log("[MetaMask SDK] Signature received");
      return signature;
    } catch (error) {
      console.error("[MetaMask SDK] Signature error:", error);
      throw error;
    }
  };

  const handleMainButtonClick = async () => {
    try {
      // Check if mobile browser - use SDK
      if (isMobileBrowser() && !isConnected && !usingSdk) {
        await connectWithSDK();
        return;
      }

      // 1. If not connected, connect (desktop/MetaMask browser)
      if (!isConnected && !sdkAddress) {
        console.log("[Login] Connecting wallet via injected connector");
        setStep("connecting");
        setStatus("Opening wallet connection...");
        setWalletConnecting(true);
        setLoading(true);

        // Get the injected connector (MetaMask)
        const injectedConnector = connectors.find((c) => c.id === "injected");
        if (injectedConnector) {
          await connect({ connector: injectedConnector });
        }
        return;
      }

      const activeAddress = connectedAddress || (sdkAddress as `0x${string}`);
      if (!activeAddress) return;

      // 2. Check if we can fast-track (One-Click)
      if (nonce && step !== "ready_to_sign") {
        console.log("[Login] Nonce available, fast-tracking to signature");
        await performSignature();
        return;
      }

      // 3. If connected but no nonce, fetch nonce (Two-Step Fallback)
      if (
        step === "idle" ||
        step === "error" ||
        ((isConnected || sdkAddress) && step !== "ready_to_sign")
      ) {
        await initiateLogin(activeAddress);
        return;
      }

      // 4. If nonce fetched, sign
      if (step === "ready_to_sign") {
        await performSignature();
        return;
      }
    } catch (err: unknown) {
      console.error("[Login] Error in handleMainButtonClick:", err);
      handleWalletError(err);
      setLoading(false);
      setWalletConnecting(false);
    }
  };

  return (
    <div className="h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a8a15_1px,transparent_1px),linear-gradient(to_bottom,#1e3a8a15_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>

        {/* Floating particles */}
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Main content - no scrolling */}
      <div className="relative z-10 h-full flex items-center justify-center p-3 md:p-4">
        <div className="w-full max-w-lg">
          {/* Logo and branding */}
          <div className="text-center mb-3 md:mb-4 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 mb-2 md:mb-3 shadow-2xl shadow-blue-500/50 animate-float relative group/logo">
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-xl animate-pulse"></div>
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300"></div>
              <Package className="w-7 h-7 md:w-8 md:h-8 text-white relative z-10 drop-shadow-lg" />
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 drop-shadow-lg">
                TrackChain
              </span>
            </h1>
            <p className="text-gray-300 md:text-gray-400 text-[10px] md:text-xs font-medium tracking-wide">
              Enterprise Supply Chain on Blockchain
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[9px] md:text-[10px] text-gray-400 md:text-gray-500">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
              <Network className="w-2.5 h-2.5" />
              <span>Ganesh Testnet</span>
            </div>
          </div>

          {/* Login card */}
          <Card className="backdrop-blur-xl bg-white/[0.08] md:bg-white/[0.04] border-white/[0.2] md:border-white/[0.12] shadow-2xl overflow-hidden relative group hover:border-white/[0.25] md:hover:border-white/[0.18] hover:shadow-blue-500/10 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.12] md:from-blue-500/[0.08] via-transparent to-purple-500/[0.12] md:to-purple-500/[0.08]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 md:from-black/30 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15),transparent_50%)]"></div>

            <CardHeader className="relative space-y-2 pb-4 px-4 md:px-6 pt-4 md:pt-6">
              {rpcError && (
                <Alert
                  variant="destructive"
                  className="mb-4 bg-red-900/50 border-red-500/50 text-red-200"
                >
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Network Error:</strong> Cannot reach Blockchain
                    (Port 7545).
                    <br />
                    Please check your <strong>Windows Firewall</strong> rules to
                    allow access to Ganache.
                  </AlertDescription>
                </Alert>
              )}
              <CardTitle className="text-xl md:text-2xl font-bold text-center text-white">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400">
                  {isConnected ? "Verify Identity" : "Welcome Back"}
                </span>
              </CardTitle>
              <CardDescription className="text-center text-gray-300 md:text-gray-400 text-xs md:text-sm font-medium">
                {status}
              </CardDescription>

              {/* Connected Wallet Badge */}
              {(isConnected && connectedAddress) || (usingSdk && sdkAddress) ? (
                <div className="flex items-center justify-center mt-2 animate-fade-in">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    {usingSdk && sdkAddress ? (
                      <>
                        <Smartphone className="w-3 h-3 text-emerald-400" />
                        {sdkAddress.slice(0, 6)}...{sdkAddress.slice(-4)}
                      </>
                    ) : (
                      <>
                        {connectedAddress?.slice(0, 6)}...
                        {connectedAddress?.slice(-4)}
                      </>
                    )}
                    <button
                      onClick={async () => {
                        disconnect();
                        setSdkAddress(null);
                        setUsingSdk(false);

                        // Disconnect MetaMask SDK
                        try {
                          const {
                            disconnectMetaMaskSDK,
                          } = require("@/lib/web3/metamask-sdk");
                          await disconnectMetaMaskSDK();
                        } catch (e) {
                          console.warn("[Disconnect] SDK warning:", e);
                        }
                      }}
                      className="ml-2 p-1 hover:bg-blue-500/20 rounded-full transition-colors"
                      title="Disconnect Wallet"
                    >
                      <LogOut className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Step indicator */}
              {loading && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      step === "connecting"
                        ? "bg-blue-400 scale-125"
                        : step === "signing" ||
                          step === "verifying" ||
                          step === "success"
                        ? "bg-emerald-400"
                        : "bg-gray-600"
                    }`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      step === "signing"
                        ? "bg-blue-400 scale-125"
                        : step === "verifying" || step === "success"
                        ? "bg-emerald-400"
                        : "bg-gray-600"
                    }`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      step === "verifying"
                        ? "bg-blue-400 scale-125"
                        : step === "success"
                        ? "bg-emerald-400"
                        : "bg-gray-600"
                    }`}
                  ></div>
                </div>
              )}
            </CardHeader>

            <CardContent className="relative px-4 md:px-6 pb-6">
              <div className="flex flex-col items-center justify-center space-y-6">
                {/* Wallet Icon with enhanced glow effect */}
                <div className="relative group/fox">
                  <div
                    className={`absolute -inset-4 bg-gradient-to-r from-orange-500/40 via-orange-400/40 to-orange-600/40 rounded-full blur-3xl ${
                      loading
                        ? "animate-pulse"
                        : "group-hover/fox:opacity-100 opacity-60"
                    } transition-opacity duration-500`}
                  ></div>
                  <div className="relative p-5 md:p-6 rounded-3xl bg-gradient-to-br from-orange-500/[0.15] to-orange-600/[0.15] border border-orange-500/30 backdrop-blur-sm shadow-2xl shadow-orange-500/25 group-hover/fox:border-orange-500/50 group-hover/fox:shadow-orange-500/40 transition-all duration-300">
                    <img
                      src={metamaskFox}
                      alt="Wallet"
                      className={`relative w-20 h-20 md:w-24 md:h-24 ${
                        loading ? "animate-bounce" : "animate-float"
                      } drop-shadow-2xl`}
                    />
                    {isConnected && (
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-slate-900 shadow-lg animate-scale-in">
                        <CheckCheck className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Contextual Help Messages */}
                {!loading && !isConnected && (
                  <div className="w-full max-w-sm space-y-2 animate-fade-in">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-blue-400">
                          New here?
                        </span>{" "}
                        Click the button below to connect your Web3 wallet
                      </div>
                    </div>
                  </div>
                )}

                {/* Ready to Sign Message */}
                {step === "ready_to_sign" && (
                  <div className="w-full max-w-sm space-y-2 animate-fade-in">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <Zap className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-emerald-400">
                          Ready!
                        </span>{" "}
                        Tap the button below to open your wallet and sign.
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Steps - Shows during loading */}
                {loading && (
                  <div className="w-full max-w-sm space-y-4 animate-fade-in">
                    {/* What's happening box */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold text-blue-400">
                          What's happening?
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                              step === "connecting" ||
                              step === "fetching_nonce" ||
                              step === "ready_to_sign" ||
                              step === "signing" ||
                              step === "verifying" ||
                              step === "success"
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-gray-600"
                            }`}
                          ></div>
                          <div>
                            <div
                              className={`text-xs font-medium ${
                                step === "connecting" ||
                                step === "fetching_nonce" ||
                                step === "ready_to_sign" ||
                                step === "signing" ||
                                step === "verifying" ||
                                step === "success"
                                  ? "text-emerald-400"
                                  : "text-gray-500"
                              }`}
                            >
                              1. Connecting Wallet
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Approve the connection
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                              step === "signing" ||
                              step === "verifying" ||
                              step === "success"
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-gray-600"
                            }`}
                          ></div>
                          <div>
                            <div
                              className={`text-xs font-medium ${
                                step === "signing" ||
                                step === "verifying" ||
                                step === "success"
                                  ? "text-emerald-400"
                                  : "text-gray-500"
                              }`}
                            >
                              2. Sign Message
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Prove ownership securely
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                              step === "verifying" || step === "success"
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-gray-600"
                            }`}
                          ></div>
                          <div>
                            <div
                              className={`text-xs font-medium ${
                                step === "verifying" || step === "success"
                                  ? "text-emerald-400"
                                  : "text-gray-500"
                              }`}
                            >
                              3. Verifying
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Confirming identity
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Current action hint */}
                    {step === "signing" && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 animate-pulse">
                        <FileSignature className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-yellow-400 font-medium">
                          Check your wallet for the signature request
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="relative flex flex-col gap-3 px-4 md:px-6 pb-4 md:pb-6">
              <Button
                disabled={loading}
                onClick={handleMainButtonClick}
                size="lg"
                className={`w-full font-semibold text-sm md:text-base py-5 md:py-6 text-white bg-gradient-to-r bg-size-200 hover:bg-pos-100 border-0 shadow-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group/btn rounded-xl ${
                  isConnected
                    ? "from-emerald-500 via-emerald-600 to-emerald-500 shadow-emerald-500/40 hover:shadow-emerald-500/60"
                    : "from-orange-500 via-orange-600 to-orange-500 shadow-orange-500/40 hover:shadow-orange-500/60"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>

                {loading ? (
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <Loader2 className="animate-spin w-5 h-5" />
                    <span>
                      {step === "signing"
                        ? "Check Wallet to Sign..."
                        : "Processing..."}
                    </span>
                  </div>
                ) : step === "ready_to_sign" ? (
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <FileSignature className="w-5 h-5" />
                    <span>Sign Message Now</span>
                    <ArrowRight className="w-4 h-4 animate-pulse" />
                  </div>
                ) : isConnected ? (
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <FileSignature className="w-5 h-5" />
                    <span>Sign In with Wallet</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <Wallet className="w-5 h-5" />
                    <span>Connect Wallet</span>
                  </div>
                )}
              </Button>

              {/* Reset Connection Button */}
              <button
                onClick={resetConnection}
                className="text-[10px] md:text-xs text-gray-500 hover:text-red-400 transition-colors underline decoration-dotted underline-offset-4"
              >
                Trouble connecting? Reset
              </button>
            </CardFooter>
          </Card>

          {/* Security badges */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors duration-300 cursor-default">
              <Shield className="w-3.5 h-3.5" />
              <span>Secure</span>
            </div>
            <div className="w-px h-4 bg-gray-700/50"></div>
            <div className="flex items-center gap-1.5 hover:text-blue-400 transition-colors duration-300 cursor-default">
              <Lock className="w-3.5 h-3.5" />
              <span>Encrypted</span>
            </div>
            <div className="w-px h-4 bg-gray-700/50"></div>
            <div className="flex items-center gap-1.5 hover:text-purple-400 transition-colors duration-300 cursor-default">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Web3</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .bg-size-200 {
          background-size: 200% 100%;
        }

        .bg-pos-100 {
          background-position: 100% 0;
        }
      `}</style>
    </div>
  );
}
