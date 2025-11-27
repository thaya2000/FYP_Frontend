import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard";
import { useAppStore } from "@/lib/store";

// ✅ Pages
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import CreateProduct from "./pages/CreateProduct";
import Handover from "./pages/Handover";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import LiveTracking from "./pages/LiveTracking";
import Analytics from "./pages/Analytics";
import QRScannerPage from "./pages/QRScannerPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import Checkpoints from "./pages/Checkpoints";
// 🆕 (Optional placeholders for admin/supplier/warehouse)
import ManageUsers from "./pages/ManageUsers"; // For ADMIN
// import Inventory from "./pages/Inventory"; // For WAREHOUSE

const queryClient = new QueryClient();

const App = () => {
  const { user, role } = useAppStore();
  const userRole = user?.role || role;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <AuthGuard requireAuth={false}>
                  <Login />
                </AuthGuard>
              }
            />


            {/* Protected routes (Dashboard Layout) */}
            <Route
              path="/"
              element={
                <AuthGuard>
                  <DashboardLayout />
                </AuthGuard>
              }
            >


              {/* 🔹 Role-based routes */}

              {/* 🧩 ADMIN */}
              {userRole === "ADMIN" && (
                <>
                  <Route path="users" element={<ManageUsers />} />
                </>
              )}

              {/* 🧩 MANUFACTURER */}
              {userRole === "MANUFACTURER" && (
                <>
                  <Route index element={<Index />} />
                  <Route path="products" element={<Products />} />
                  <Route path="register" element={<Register />} />
                  <Route path="products/create" element={<CreateProduct />} />
                  <Route path="products/:id" element={<ProductDetail />} />
                  <Route path="handover" element={<Handover />} />
                  <Route path="alerts" element={<Alerts />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="qr-scan" element={<QRScannerPage />} />

                </>
              )}

              {/* 🧩 SUPPLIER */}
              {userRole === "SUPPLIER" && (
                <>
                  <Route index element={<Index />} />
                  <Route path="register" element={<Register />} />
                  <Route path="handover" element={<Handover />} />
                  <Route path="products" element={<Products />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="qr-scan" element={<QRScannerPage />} />

                </>
              )}

              {/* 🧩 WAREHOUSE */}
              {userRole === "WAREHOUSE" && (
                <>
                  <Route index element={<Index />} />
                  <Route path="register" element={<Register />} />
                  {/* <Route path="inventory" element={<Inventory />} /> */}
                  <Route path="checkpoints" element={<Checkpoints />} />
                  <Route path="handover" element={<Handover />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="qr-scan" element={<QRScannerPage />} />

                </>
              )}

              {/* 🧩 USER */}
              {userRole === "USER" && (
                <>
                  <Route index element={<QRScannerPage />} />
                  <Route path="register" element={<Register />} />
                  <Route path="qr-scan" element={<QRScannerPage />} />
                  <Route path="qr-scan" element={<QRScannerPage />} />

                </>
              )}

              {/* Fallback for unknown role */}
              {!userRole && (
                <>
                  <Route path="qr-scan" element={<QRScannerPage />} />
                  <Route path="register" element={<Register />} />
                </>
              )}

              {/* Ensure Checkpoints route is available regardless of initial role hydration */}
              <Route path="checkpoints" element={<Checkpoints />} />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
