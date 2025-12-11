import { HandoverProvider } from "./context";
import { HandoverHeader } from "./components/HandoverHeader";
import { ManufacturerShipmentsSection } from "./components/ManufacturerShipmentsSection";
import { SupplierSection } from "./components/SupplierSection";
import { WarehouseSection } from "./components/WarehouseSection";
import { RecentHandoversSection } from "./components/RecentHandoversSection";

function HandoverContent() {
  return (
    <div className="space-y-6">
      <HandoverHeader />
      <ManufacturerShipmentsSection />
      <SupplierSection />
      <WarehouseSection />
      <RecentHandoversSection />
    </div>
  );
}

export default function HandoverPage() {
  return (
    <HandoverProvider>
      <HandoverContent />
    </HandoverProvider>
  );
}
