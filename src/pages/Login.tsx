import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useSignMessage } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { getAccount } from "@wagmi/core";
import { wagmiConfig } from "@/lib/web3/wagmi";
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
  | "signing"
  | "verifying"
  | "success"
  | "error";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Connect your wallet to continue");
  const [step, setStep] = useState<LoginStep>("idle");
  const [walletConnecting, setWalletConnecting] = useState(false);

  const navigate = useNavigate();
  const { signMessageAsync } = useSignMessage();
  const { address: connectedAddress, isConnected } = useAccount();
  const { open } = useWeb3Modal();

  const setAuth = useAppStore((s) => s.setAuth);
  const setWalletConnection = useAppStore((s) => s.setWalletConnection);

  useEffect(() => {
    if (connectedAddress) {
      setWalletConnection(connectedAddress as `0x${string}`);
    } else {
      setWalletConnection(null);
    }
  }, [connectedAddress, setWalletConnection]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (["verifying", "signing", "success", "connecting", "error"].includes(step)) {
      return;
    }
    if (connectedAddress) {
      setStatus("Wallet connected. Continue with your wallet to sign in.");
    } else if (!walletConnecting) {
      setStatus("Connect your wallet to continue");
    }
  }, [connectedAddress, loading, step, walletConnecting]);

  const ensureWalletConnection = async (): Promise<`0x${string}`> => {
    let account = getAccount(wagmiConfig);
    if (account.address) {
      return account.address as `0x${string}`;
    }

    await open({ view: "Connect" });

    account = getAccount(wagmiConfig);
    if (account.address) {
      return account.address as `0x${string}`;
    }

    throw new Error("WALLET_CONNECTION_CANCELLED");
  };

  const walletButtonLabel = connectedAddress
    ? `Wallet: ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
    : "Connect Wallet";

  const handleWalletButtonClick = async () => {
    if (connectedAddress) {
      await open({ view: "Account" });
      return;
    }

    try {
      setWalletConnecting(true);
      setStep("connecting");
      setStatus("Opening wallet modal...");
      await ensureWalletConnection();
      setStep("idle");
      setStatus("Wallet connected. Continue with your wallet to sign in.");
    } catch (err) {
      handleWalletError(err, { markStepError: false });
    } finally {
      setWalletConnecting(false);
    }
  };

  const describeWalletError = (err: unknown) => {
    const errorMessage =
      err && typeof err === "object" && "message" in err
        ? String(err.message)
        : "";
    const errorCode =
      typeof err === "object" && err && "code" in err
        ? Number((err as { code?: number }).code)
        : undefined;

    if (errorMessage === "WALLET_CONNECTION_CANCELLED") {
      return "Wallet connection was closed. Re-open the Connect Wallet modal and approve the request.";
    }
    if (errorCode === -32002) {
      return "Your wallet already has a pending request. Open the wallet app, finish that prompt, then retry.";
    }
    if (
      errorMessage.toLowerCase().includes("user rejected") ||
      errorMessage.toLowerCase().includes("user denied")
    ) {
      return "❌ Signature cancelled. Please try again when ready.";
    }
    if (
      errorMessage.toLowerCase().includes("network") ||
      errorMessage.toLowerCase().includes("rpc")
    ) {
      return "❌ Network error. Make sure Ganache is reachable and that you've selected the correct chain (Chain ID 1337).";
    }
    if (errorMessage) {
      return `❌ Connection failed: ${errorMessage}`;
    }
    return "❌ Connection failed. Please try again.";
  };

  const handleWalletError = (
    err: unknown,
    { markStepError = true }: { markStepError?: boolean } = {}
  ) => {
    console.error("Wallet error:", err);
    setStatus(describeWalletError(err));
    if (markStepError) {
      setStep("error");
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setStep("connecting");
      setStatus("Connecting wallet via Web3Modal...");
      setWalletConnecting(true);

      const address = await ensureWalletConnection();
      setWalletConnection(address);

      // ✅ Step 2: Request nonce from backend
      setStatus("Requesting authentication challenge...");
      const { data } = await api.get("/auth/nonce", { params: { address } });

      // ✅ Step 3: Ask the connected wallet to sign message
      setStep("signing");
      setStatus("Please sign the message in your wallet...");

      const message = `Registry Login\nAddress: ${address.toLowerCase()}\nNonce: ${
        data.nonce
      }`;

      const signature = await signMessageAsync({
        account: address,
        message,
      });

      // ✅ Step 4: Send signature back to backend
      setStep("verifying");
      setStatus("Verifying signature...");
      const res = await api.post("/auth/login", { address, signature });

      // ✅ Step 5: Store JWT + role + address in Zustand store
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
      handleWalletError(err);
    } finally {
      setWalletConnecting(false);
      setLoading(false);
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
            <p className="text-gray-400 text-[10px] md:text-xs font-medium tracking-wide">
              Enterprise Supply Chain on Blockchain
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[9px] md:text-[10px] text-gray-500">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
              <Network className="w-2.5 h-2.5" />
              <span>Ganesh Testnet</span>
            </div>
          </div>

          {/* Login card */}
          <Card className="backdrop-blur-xl bg-white/[0.04] border-white/[0.12] shadow-2xl overflow-hidden relative group hover:border-white/[0.18] hover:shadow-blue-500/10 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.08] via-transparent to-purple-500/[0.08]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent_50%)]"></div>

            <CardHeader className="relative space-y-1 md:space-y-1.5 pb-2 md:pb-3 px-3 md:px-4 pt-3 md:pt-4">
              <CardTitle className="text-lg md:text-xl font-bold text-center text-white flex items-center justify-center gap-1.5 md:gap-2">
                <div className="p-1 md:p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
                  <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                  Secure Authentication
                </span>
              </CardTitle>
              <CardDescription className="text-center text-gray-300 text-[10px] md:text-xs font-medium">
                {status}
              </CardDescription>
            </CardHeader>

            <CardContent className="relative px-3 md:px-4">
              <div className="flex flex-col items-center justify-center space-y-3 md:space-y-4 py-2 md:py-3">
                {/* Wallet Icon with enhanced glow effect */}
                <div className="relative group/fox">
                  <div
                    className={`absolute -inset-3 bg-gradient-to-r from-orange-500/40 via-orange-400/40 to-orange-600/40 rounded-full blur-2xl ${
                      loading
                        ? "animate-pulse"
                        : "group-hover/fox:opacity-100 opacity-70"
                    } transition-opacity duration-500`}
                  ></div>
                  <div className="relative p-3 md:p-4 rounded-2xl bg-gradient-to-br from-orange-500/[0.12] to-orange-600/[0.12] border border-orange-500/30 backdrop-blur-sm shadow-lg shadow-orange-500/20 group-hover/fox:border-orange-500/40 group-hover/fox:shadow-orange-500/30 transition-all duration-300">
                    <img
                      src={metamaskFox}
                      alt="Fox wallet icon"
                      className={`relative w-16 h-16 md:w-20 md:h-20 ${
                        loading ? "animate-bounce" : "animate-float"
                      } drop-shadow-2xl`}
                    />
                  </div>
                </div>

                {/* Helper Alert - Shows during signing step */}
                {step === "signing" && (
                  <Alert className="bg-blue-500/10 border-blue-500/30 text-blue-200 animate-fade-in py-2">
                    <FileSignature className="h-3 w-3 md:h-3.5 md:w-3.5 text-blue-400" />
                    <AlertDescription className="text-[9px] md:text-[10px]">
                      <strong>Sign the message in your wallet popup.</strong>{" "}
                      This
                      is free and won't trigger any transaction.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Progress Steps Indicator */}
                {loading && (
                  <div className="w-full space-y-1 md:space-y-1.5 animate-fade-in">
                    <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs">
                      <div
                        className={`p-1 md:p-1.5 rounded-lg ${
                          step === "connecting" ||
                          step === "signing" ||
                          step === "verifying" ||
                          step === "success"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/5 text-gray-500"
                        }`}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      </div>
                      <span
                        className={
                          step === "connecting" ||
                          step === "signing" ||
                          step === "verifying" ||
                          step === "success"
                            ? "text-emerald-400"
                            : "text-gray-500"
                        }
                      >
                        Wallet Connected
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs">
                      <div
                        className={`p-1 md:p-1.5 rounded-lg ${
                          step === "signing"
                            ? "bg-blue-500/20 text-blue-400 animate-pulse"
                            : step === "verifying" || step === "success"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/5 text-gray-500"
                        }`}
                      >
                        {step === "signing" ? (
                          <Loader2 className="w-2.5 h-2.5 md:w-3 md:h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        )}
                      </div>
                      <span
                        className={
                          step === "signing" ||
                          step === "verifying" ||
                          step === "success"
                            ? "text-white"
                            : "text-gray-500"
                        }
                      >
                        Message Signed
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs">
                      <div
                        className={`p-1 md:p-1.5 rounded-lg ${
                          step === "verifying"
                            ? "bg-blue-500/20 text-blue-400 animate-pulse"
                            : step === "success"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/5 text-gray-500"
                        }`}
                      >
                        {step === "verifying" ? (
                          <Loader2 className="w-2.5 h-2.5 md:w-3 md:h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        )}
                      </div>
                      <span
                        className={
                          step === "verifying" || step === "success"
                            ? "text-white"
                            : "text-gray-500"
                        }
                      >
                        Authentication Verified
                      </span>
                    </div>
                  </div>
                )}

                {/* Feature badges - Show only when idle */}
                {!loading && (
                  <div className="grid grid-cols-3 gap-1.5 md:gap-2 w-full animate-fade-in">
                    <div className="flex flex-col items-center gap-1 p-2 md:p-2.5 rounded-lg bg-gradient-to-br from-blue-500/[0.05] to-blue-600/[0.05] border border-white/10 hover:bg-gradient-to-br hover:from-blue-500/[0.1] hover:to-blue-600/[0.1] hover:border-blue-500/30 transition-all duration-300 group/badge cursor-default">
                      <div className="p-1 md:p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover/badge:bg-blue-500/20 group-hover/badge:scale-110 transition-all duration-300">
                        <Lock className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-400" />
                      </div>
                      <span className="text-[8px] md:text-[9px] text-gray-300 font-medium">
                        Encrypted
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 md:p-2.5 rounded-lg bg-gradient-to-br from-purple-500/[0.05] to-purple-600/[0.05] border border-white/10 hover:bg-gradient-to-br hover:from-purple-500/[0.1] hover:to-purple-600/[0.1] hover:border-purple-500/30 transition-all duration-300 group/badge cursor-default">
                      <div className="p-1 md:p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 group-hover/badge:bg-purple-500/20 group-hover/badge:scale-110 transition-all duration-300">
                        <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-purple-400" />
                      </div>
                      <span className="text-[8px] md:text-[9px] text-gray-300 font-medium">
                        Web3
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 md:p-2.5 rounded-lg bg-gradient-to-br from-emerald-500/[0.05] to-emerald-600/[0.05] border border-white/10 hover:bg-gradient-to-br hover:from-emerald-500/[0.1] hover:to-emerald-600/[0.1] hover:border-emerald-500/30 transition-all duration-300 group/badge cursor-default">
                      <div className="p-1 md:p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover/badge:bg-emerald-500/20 group-hover/badge:scale-110 transition-all duration-300">
                        <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-400" />
                      </div>
                      <span className="text-[8px] md:text-[9px] text-gray-300 font-medium">
                        Fast
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="relative flex flex-col gap-1.5 md:gap-2 px-3 md:px-4 pb-3 md:pb-4">
              <Button
                type="button"
                variant="outline"
                disabled={loading || walletConnecting}
                onClick={handleWalletButtonClick}
                className="w-full font-semibold text-[10px] md:text-xs py-3 md:py-3.5 border-white/20 text-white bg-white/[0.02] hover:bg-white/[0.1] hover:border-white/40 transition-all duration-300 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  {walletConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-300" />
                  ) : (
                    <Wallet className="w-4 h-4 text-orange-300" />
                  )}
                  <span>
                    {walletConnecting ? "Connecting..." : walletButtonLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-gray-300">
                  <Network className="w-3 h-3" />
                  <span>
                    {walletConnecting
                      ? "Check wallet"
                      : isConnected
                      ? "Ready"
                      : "Tap to connect"}
                  </span>
                </div>
              </Button>

              <Button
                disabled={loading}
                onClick={handleLogin}
                size="lg"
                className="w-full font-semibold text-xs md:text-sm py-4 md:py-5 text-white bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-size-200 hover:bg-pos-100 border-0 shadow-xl shadow-orange-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none relative overflow-hidden group/btn"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                {loading ? (
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 relative z-10">
                    <Loader2 className="animate-spin w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 relative z-10">
                    <img
                      src={metamaskFox}
                      alt=""
                      className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:scale-110 transition-transform duration-300"
                    />
                    <span>Continue with your wallet</span>
                  </div>
                )}
              </Button>

              {/* First-time user help - Only show when not loading */}
              {!loading && (
                <Alert className="bg-gradient-to-br from-blue-500/[0.08] to-purple-500/[0.08] border-blue-400/20 text-gray-200 backdrop-blur-sm shadow-lg shadow-blue-500/10 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30 mt-0.5">
                      <Info className="h-3 w-3 md:h-3.5 md:w-3.5 text-blue-300" />
                    </div>
                    <AlertDescription className="text-[9px] md:text-[10px] leading-relaxed">
                      <strong className="text-white font-semibold block mb-0.5">
                        📱 Using Mobile?
                      </strong>
                      <span className="text-gray-300">
                        Use{" "}
                        <span className="text-orange-400 font-medium">
                          Connect Wallet
                        </span>{" "}
                        above to launch MetaMask, WalletConnect, or any supported
                        wallet. On mobile browsers it deep-links into the
                        MetaMask app automatically. Make sure the{" "}
                        <span className="text-emerald-400 font-medium">
                          Ganache network
                        </span>{" "}
                        (Chain ID: 1337, RPC:{" "}
                        {typeof window !== "undefined"
                          ? `${window.location.protocol}//${window.location.hostname}:7545`
                          : "http://your-ip:7545"}
                        ) is added in your wallet before signing.
                      </span>
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardFooter>
          </Card>

          {/* Security badges */}
          <div className="mt-2 md:mt-3 flex items-center justify-center gap-2 md:gap-3 text-[8px] md:text-[9px] text-gray-500 font-medium">
            <div className="flex items-center gap-0.5 md:gap-1 hover:text-emerald-400 transition-colors duration-300 group/sec cursor-default">
              <CheckCircle2 className="w-2 h-2 md:w-2.5 md:h-2.5 text-emerald-500 group-hover/sec:scale-125 transition-transform duration-300" />
              <span>Decentralized</span>
            </div>
            <div className="w-px h-2 md:h-2.5 bg-gray-700/50"></div>
            <div className="flex items-center gap-0.5 md:gap-1 hover:text-blue-400 transition-colors duration-300 group/sec cursor-default">
              <CheckCircle2 className="w-2 h-2 md:w-2.5 md:h-2.5 text-emerald-500 group-hover/sec:scale-125 transition-transform duration-300" />
              <span>Secure</span>
            </div>
            <div className="w-px h-2 md:h-2.5 bg-gray-700/50"></div>
            <div className="flex items-center gap-0.5 md:gap-1 hover:text-purple-400 transition-colors duration-300 group/sec cursor-default">
              <CheckCircle2 className="w-2 h-2 md:w-2.5 md:h-2.5 text-emerald-500 group-hover/sec:scale-125 transition-transform duration-300" />
              <span>Transparent</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2 text-center">
            <p className="text-[8px] md:text-[9px] text-gray-600 flex items-center justify-center gap-1">
              <span>Powered by Ethereum</span>
              <span className="text-gray-700">•</span>
              <span className="flex items-center gap-0.5">
                Built with{" "}
                <span className="text-red-500 animate-pulse">❤️</span> for
                Supply Chain
              </span>
            </p>
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
