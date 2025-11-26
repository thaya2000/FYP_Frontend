import MetaMaskSDK from "@metamask/sdk";

let sdkInstance: MetaMaskSDK | null = null;
let isInitializing = false;

export const getMetaMaskSDK = async () => {
  // If already initializing, wait for it
  if (isInitializing) {
    console.log("[MetaMask SDK] Already initializing, waiting...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    return sdkInstance || getMetaMaskSDK();
  }

  // If instance exists and not terminated, return it
  if (sdkInstance) {
    return sdkInstance;
  }

  isInitializing = true;
  console.log("[MetaMask SDK] Creating new instance...");

  try {
    sdkInstance = new MetaMaskSDK({
      dappMetadata: {
        name: "TrackChain",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:8080",
      },
      // Force fresh connection each time
      shouldShimWeb3: false,
      // Enable mobile deep linking
      enableDebug: true,
      // Use deep linking for mobile browsers
      useDeeplink: true,
      // CRITICAL: Prefer deep link over other communication methods
      preferDesktop: false,
      // Communication options
      communicationLayerPreference: "socket",
      // Improve mobile experience
      checkInstallationImmediately: false,
      // CRITICAL: Force delete provider to prevent reusing cached connection
      forceDeleteProvider: true,
      forceInjectProvider: false,
      // Ensure deep link opens for every request
      modals: {
        install: () => {},
        otp: () => {},
      },
      openDeeplink: (link: string) => {
        console.log("[MetaMask SDK] Opening deep link:", link);
        // Force open in same window to ensure it works on mobile
        window.location.href = link;
      },
    });

    // Small delay to ensure SDK is ready
    await new Promise((resolve) => setTimeout(resolve, 300));
    return sdkInstance;
  } finally {
    isInitializing = false;
  }
};

export const connectMetaMaskSDK = async () => {
  try {
    console.log("[MetaMask SDK] Initiating fresh connection...");

    // IMPORTANT: Clear ALL SDK session storage to force wallet selection
    if (typeof window !== "undefined") {
      const { localStorage, sessionStorage } = window;

      // Clear MetaMask SDK cached sessions
      const sdkKeys = Object.keys(localStorage).filter(
        (key) =>
          key.startsWith("MMSDK") ||
          key.startsWith("metamask") ||
          key.startsWith("MM_SDK")
      );
      sdkKeys.forEach((key) => {
        console.log("[MetaMask SDK] Clearing storage:", key);
        localStorage.removeItem(key);
      });

      // Also clear session storage
      const sessionKeys = Object.keys(sessionStorage).filter(
        (key) =>
          key.startsWith("MMSDK") ||
          key.startsWith("metamask") ||
          key.startsWith("MM_SDK")
      );
      sessionKeys.forEach((key) => {
        console.log("[MetaMask SDK] Clearing session:", key);
        sessionStorage.removeItem(key);
      });

      // CRITICAL: Delete any existing ethereum provider
      try {
        if ((window as any).ethereum) {
          console.log("[MetaMask SDK] Deleting cached ethereum provider");
          delete (window as any).ethereum;
        }
      } catch (e) {
        console.warn("[MetaMask SDK] Could not delete ethereum provider:", e);
      }
    }

    // IMPORTANT: Always disconnect previous session to force wallet selection
    if (sdkInstance) {
      console.log("[MetaMask SDK] Terminating previous session...");
      try {
        const provider = sdkInstance.getProvider();
        if (provider) {
          await provider.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          });
        }
      } catch (e) {
        console.warn("[MetaMask SDK] Permission revoke warning:", e);
      }
      sdkInstance.terminate();
      sdkInstance = null;
      isInitializing = false;

      // Wait a bit to ensure complete cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Create fresh SDK instance for new connection
    const sdk = await getMetaMaskSDK();

    // This will open MetaMask app on mobile via deep link
    const accounts = await sdk.connect();
    console.log("[MetaMask SDK] Connected accounts:", accounts);
    return accounts;
  } catch (error) {
    console.error("[MetaMask SDK] Connection error:", error);
    // Reset on error
    isInitializing = false;
    sdkInstance = null;
    throw error;
  }
};

export const getMetaMaskProvider = async () => {
  const sdk = await getMetaMaskSDK();
  return sdk.getProvider();
};

export const disconnectMetaMaskSDK = async () => {
  console.log("[MetaMask SDK] Disconnecting...");

  if (sdkInstance) {
    try {
      // Get provider and disconnect
      const provider = sdkInstance.getProvider();
      if (provider) {
        // Clear accounts
        try {
          await provider.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch (e) {
          console.warn("[MetaMask SDK] Revoke permissions warning:", e);
        }
      }

      // Terminate SDK
      sdkInstance.terminate();
      sdkInstance = null;
      isInitializing = false;
      console.log("[MetaMask SDK] Disconnected and terminated");
    } catch (e) {
      console.error("[MetaMask SDK] Disconnect error:", e);
      sdkInstance = null;
      isInitializing = false;
    }
  }

  // Clear MetaMask SDK storage
  if (typeof window !== "undefined") {
    const { localStorage, sessionStorage } = window;

    const sdkKeys = Object.keys(localStorage).filter(
      (key) =>
        key.startsWith("MMSDK") ||
        key.startsWith("metamask") ||
        key.startsWith("MM_SDK")
    );
    sdkKeys.forEach((key) => localStorage.removeItem(key));

    const sessionKeys = Object.keys(sessionStorage).filter(
      (key) =>
        key.startsWith("MMSDK") ||
        key.startsWith("metamask") ||
        key.startsWith("MM_SDK")
    );
    sessionKeys.forEach((key) => sessionStorage.removeItem(key));

    console.log("[MetaMask SDK] Cleared storage");
  }
};
