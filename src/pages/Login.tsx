import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConnect, useSignMessage, useDisconnect } from "wagmi";
import { Loader2 } from "lucide-react";
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
import metamaskFox from "@/img/metamask_fox.png";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Connect your wallet to continue");

  const navigate = useNavigate();
  const { connectAsync, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const setAuth = useAppStore((s) => s.setAuth);
  const setWalletConnection = useAppStore((s) => s.setWalletConnection);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setStatus("Connecting to MetaMask...");

      // ✅ Step 1: Connect wallet
      const connector = connectors.find((c) => c.id === "injected") ?? connectors[0];
      const { accounts } = await connectAsync({ connector });
      const address = accounts[0] as `0x${string}`;
      setWalletConnection(address);

      // ✅ Step 2: Request nonce from backend
      setStatus("Requesting nonce from backend...");
      const { data } = await api.get("/auth/nonce", { params: { address } });

      // ✅ Step 3: Ask MetaMask to sign message
      setStatus("Please sign the message in MetaMask...");

      // After fetching nonce + address
      const message = `Registry Login\nAddress: ${address.toLowerCase()}\nNonce: ${data.nonce}`;

      const signature = await signMessageAsync({
        account: address,
        message,
      });


      // const signature = await signMessageAsync({
      //   account: address,
      //   message: data.message,
      // });

      // ✅ Step 4: Send signature back to backend
      setStatus("Verifying signature...");
      const res = await api.post("/auth/login", { address, signature });

      // ✅ Step 5: Store JWT + role + address in Zustand store
      setAuth({
        token: res.data.token,
        role: res.data.role,
        address: res.data.address,
      });

      setStatus("✅ Login successful! Redirecting...");
      setTimeout(() => navigate("/"), 1000);
    } catch (err: any) {
      console.error("Login error:", err);
      setStatus("❌ Failed to connect. Try again.");
      disconnect();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Card className="w-full max-w-md shadow-2xl bg-gray-900 border-gray-700 text-white transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-white">
            🔐 Blockchain Login
          </CardTitle>
          <CardDescription className="text-center text-gray-400">
            {status}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-6 mt-4">
            <img
              src={metamaskFox}
              alt="MetaMask"
              className={`w-24 h-24 mb-2 ${loading ? "animate-bounce" : "animate-pulse"}`}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button
            disabled={loading}
            onClick={handleLogin}
            className={`w-full font-semibold py-2 text-white ${loading
              ? "bg-gray-700 hover:bg-gray-700 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600"
              }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" />
                Connecting...
              </div>
            ) : (
              "🦊 Connect Wallet"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
