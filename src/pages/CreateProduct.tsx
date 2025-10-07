import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { batchService } from "@/services/batchService";
import { productRegistryService } from "@/services/productRegistryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

// 🔹 Utility — Simple ISO Date Validator
const isValidISODate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

export default function CreateProduct() {
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  const [batchForm, setBatchForm] = useState({
    productCategory: "vaccine",
    manufacturerUUID: "MF-017",
    facility: "",
    productionWindow: "",
    quantityProduced: "",
    releaseStatus: "",
  });

  const [productForm, setProductForm] = useState({
    productName: "",
    requiredStorageTemp: "",
    handlingInstructions: "",
    expiryDate: "",
    sensorDeviceUUID: "",
    microprocessorMac: "",
    sensorTypes: "",
    qrId: "",
    wifiSSID: "",
    wifiPassword: "",
    originFacilityAddr: "",
  });

  // ============================
  // 🔹 Fetch Data
  // ============================
  const { data: batches, isLoading: loadingBatches } = useQuery({
    queryKey: ["batches"],
    queryFn: batchService.getAllBatches,
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/product-registry`);
      return res.json();
    },
  });

  // ============================
  // 🔹 Mutations
  // ============================
  const createBatchMutation = useMutation({
    mutationFn: batchService.createBatch,
    onSuccess: () => {
      toast.success("✅ Batch created successfully!");
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setBatchForm({
        productCategory: "vaccine",
        manufacturerUUID: "MF-017",
        facility: "",
        productionWindow: "",
        quantityProduced: "",
        releaseStatus: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create batch");
    },
  });

  const createProductMutation = useMutation({
    mutationFn: productRegistryService.registerProduct,
    onSuccess: () => {
      toast.success("✅ Product created successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setProductForm({
        productName: "",
        requiredStorageTemp: "",
        handlingInstructions: "",
        expiryDate: "",
        sensorDeviceUUID: "",
        microprocessorMac: "",
        sensorTypes: "",
        qrId: "",
        wifiSSID: "",
        wifiPassword: "",
        originFacilityAddr: "",
      });
      setSelectedBatch("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create product");
    },
  });

  // ============================
  // 🔹 Input Handlers
  // ============================
  const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setBatchForm({ ...batchForm, [e.target.name]: e.target.value });

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProductForm({ ...productForm, [e.target.name]: e.target.value });

  // ============================
  // 🔹 Validations
  // ============================
  const validateBatchForm = () => {
    const { facility, productionWindow, quantityProduced, releaseStatus } = batchForm;

    if (!facility.trim()) return "Facility name is required.";
    if (!productionWindow.trim() || !/^\d{4}-\d{2}-\d{2}\sto\s\d{4}-\d{2}-\d{2}$/.test(productionWindow))
      return "Production window must be in format 'YYYY-MM-DD to YYYY-MM-DD'.";
    if (!quantityProduced.trim() || isNaN(Number(quantityProduced)))
      return "Quantity produced must be a valid number.";
    if (!releaseStatus.trim() || !isValidISODate(releaseStatus))
      return "Release status must be a valid date (YYYY-MM-DD).";

    return null;
  };

  const validateProductForm = () => {
    const f = productForm;

    if (!selectedBatch) return "Select a batch first.";
    if (!f.productName.trim()) return "Product name is required.";
    if (!f.requiredStorageTemp.trim()) return "Required storage temperature is required.";
    if (!f.handlingInstructions.trim()) return "Handling instructions are required.";
    if (!f.expiryDate.trim() || !isValidISODate(f.expiryDate))
      return "Expiry date must be in valid format YYYY-MM-DD.";
    if (!f.sensorDeviceUUID.trim()) return "Sensor Device UUID is required.";
    if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(f.microprocessorMac.trim()))
      return "Microprocessor MAC must be in format 00:1A:2B:3C:4D:5E.";
    if (!f.sensorTypes.trim()) return "Sensor types (e.g., GPS,Temperature) required.";
    if (!f.qrId.trim()) return "QR ID is required.";
    if (!f.wifiSSID.trim()) return "Wi-Fi SSID is required.";
    if (!f.wifiPassword.trim()) return "Wi-Fi Password is required.";
    if (!f.originFacilityAddr.trim()) return "Origin facility address is required.";

    return null;
  };

  // ============================
  // 🔹 Form Submit Handlers
  // ============================
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateBatchForm();
    if (error) return toast.error(error);

    createBatchMutation.mutate({
      productCategory: batchForm.productCategory.trim(),
      manufacturerUUID: batchForm.manufacturerUUID.trim(),
      facility: batchForm.facility.trim(),
      productionWindow: batchForm.productionWindow.trim(),
      quantityProduced: batchForm.quantityProduced.trim(),
      releaseStatus: batchForm.releaseStatus.trim(),
    });
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateProductForm();
    if (error) return toast.error(error);

    createProductMutation.mutate({
      productUUID: `PROD-${Date.now()}`,
      productName: productForm.productName.trim(),
      productCategory: "vaccine",
      batchLotId: Number(selectedBatch),
      requiredStorageTemp: productForm.requiredStorageTemp.trim(),
      transportRoutePlanId: "ROUTE-001",
      handlingInstructions: productForm.handlingInstructions.trim(),
      expiryDate: productForm.expiryDate.trim(),
      sensorDeviceUUID: productForm.sensorDeviceUUID.trim(),
      microprocessorMac: productForm.microprocessorMac.trim().toUpperCase(),
      sensorTypes: productForm.sensorTypes.trim(),
      qrId: productForm.qrId.trim(),
      wifiSSID: productForm.wifiSSID.trim(),
      wifiPassword: productForm.wifiPassword.trim(),
      manufacturerUUID: "MF-001",
      originFacilityAddr: productForm.originFacilityAddr.trim(),
      status: 0,
    });
  };

  // ============================
  // 🔹 UI
  // ============================
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Products & Batches</h1>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
        </TabsList>

        {/* 🧾 Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div className="flex flex-col justify-center mr-auto">
                <CardTitle>All Products</CardTitle>
                <CardDescription>Manage vaccine product registry</CardDescription>
              </div>

              {/* ➕ Create Product Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="ml-auto">
                    <Plus className="w-4 h-4 mr-1" /> Create Product
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-3xl mx-auto p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Create New Product</DialogTitle>
                    <DialogDescription>
                      Link a new product to an existing batch.
                    </DialogDescription>
                  </DialogHeader>

                  <form
                    onSubmit={handleCreateProduct}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
                  >
                    {/* 🧩 Left Column */}
                    <div className="space-y-3">
                      <div>
                        <label className="font-medium text-sm mb-1 block">Select Batch</label>
                        <Select
                          value={selectedBatch}
                          onValueChange={(v) => setSelectedBatch(v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches?.map((b: any) => (
                              <SelectItem key={b.id} value={b.id.toString()}>
                                #{b.id} — {b.facility}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Input
                        name="productName"
                        placeholder="Pfizer Vaccine"
                        value={productForm.productName}
                        onChange={handleProductChange}
                      />
                      <Input
                        name="requiredStorageTemp"
                        placeholder="2–8°C"
                        value={productForm.requiredStorageTemp}
                        onChange={handleProductChange}
                      />
                      <Input
                        name="expiryDate"
                        type="date"
                        value={productForm.expiryDate}
                        onChange={handleProductChange}
                      />
                      <Input
                        name="sensorDeviceUUID"
                        placeholder="SENSOR-1001"
                        value={productForm.sensorDeviceUUID}
                        onChange={handleProductChange}
                      />
                      <Input
                        name="microprocessorMac"
                        placeholder="00:1A:2B:3C:4D:5E"
                        value={productForm.microprocessorMac}
                        onChange={handleProductChange}
                      />
                    </div>

                    {/* 🧩 Right Column */}
                    <div className="space-y-3">
                      <Textarea
                        name="handlingInstructions"
                        placeholder="Handle with care. Do not freeze."
                        value={productForm.handlingInstructions}
                        onChange={handleProductChange}
                        className="h-[100px]"
                      />
                      <Input
                        name="sensorTypes"
                        placeholder="GPS, Temperature"
                        value={productForm.sensorTypes}
                        onChange={handleProductChange}
                      />
                      <Input
                        name="qrId"
                        placeholder="QR-12345"
                        value={productForm.qrId}
                        onChange={handleProductChange}
                      />
                      <Input
                        name="wifiSSID"
                        placeholder="PfizerNet"
                        value={productForm.wifiSSID}
                        onChange={handleProductChange}
                      />
                      <Input
                        name="wifiPassword"
                        placeholder="securepass123"
                        value={productForm.wifiPassword}
                        onChange={handleProductChange}
                      />
                      <Input
                        name="originFacilityAddr"
                        placeholder="Pfizer Lab NY - Line 1"
                        value={productForm.originFacilityAddr}
                        onChange={handleProductChange}
                      />
                    </div>

                    {/* 🧭 Full-width submit button */}
                    <div className="md:col-span-2 pt-2">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createProductMutation.isPending}
                      >
                        {createProductMutation.isPending ? (
                          <>
                            <Loader2 className="animate-spin w-4 h-4 mr-2" /> Creating...
                          </>
                        ) : (
                          "Create Product"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin w-6 h-6" />
                </div>
              ) : products?.length === 0 ? (
                <p className="text-muted-foreground">No products found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead> <tr className="bg-muted">
                      <th className="p-2 border text-left">Product UUID</th>
                      <th className="p-2 border text-left">Name</th>
                      <th className="p-2 border text-left">Batch</th>
                      <th className="p-2 border text-left">Expiry Date</th>
                      <th className="p-2 border text-left">Status</th>
                    </tr>
                    </thead>
                    <tbody>
                      {products?.map((p: any) => (
                        <tr key={p.productUUID} className="hover:bg-muted/30">
                          <td className="p-2 border">{p.productUUID}</td>
                          <td className="p-2 border">{p.productName}</td>
                          <td className="p-2 border">{p.batchLotId}</td>
                          <td className="p-2 border">{p.expiryDate}</td>
                          <td className="p-2 border">{p.status}</td>
                        </tr>))}
                    </tbody>
                  </table>
                </div>)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🧱 Batches Tab */}
        <TabsContent value="batches">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div className="flex flex-col justify-center mr-auto">
                <CardTitle>All Batches</CardTitle>
                <CardDescription>Manage all production batches</CardDescription>
              </div>

              {/* ➕ Create Batch Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="ml-auto">
                    <Plus className="w-4 h-4 mr-1" /> Create Batch
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Batch</DialogTitle>
                    <DialogDescription>Fill in details to create a new batch.</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateBatch} className="space-y-3 mt-4">
                    <Input name="facility" placeholder="Pfizer Lab NY - Line 1" value={batchForm.facility} onChange={handleBatchChange} />
                    <Input name="productionWindow" placeholder="2025-09-20 to 2025-09-23" value={batchForm.productionWindow} onChange={handleBatchChange} />
                    <Input name="quantityProduced" placeholder="10020" value={batchForm.quantityProduced} onChange={handleBatchChange} />
                    <Input name="releaseStatus" type="date" value={batchForm.releaseStatus} onChange={handleBatchChange} />

                    <Button type="submit" disabled={createBatchMutation.isPending} className="w-full">
                      {createBatchMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin w-4 h-4 mr-2" /> Creating...
                        </>
                      ) : (
                        "Create Batch"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingBatches ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin w-6 h-6" />
                </div>
              ) :
                batches?.length === 0 ? (
                  <p className="text-muted-foreground">No batches found.</p>
                ) :
                  (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-muted">
                            <th className="p-2 border text-left">ID</th>
                            <th className="p-2 border text-left">Facility</th>
                            <th className="p-2 border text-left">Quantity</th>
                            <th className="p-2 border text-left">Production Window</th>
                            <th className="p-2 border text-left">Release Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batches?.map((b: any) => (
                            <tr key={b.id} className="hover:bg-muted/30">
                              <td className="p-2 border">{b.id}</td>
                              <td className="p-2 border">{b.facility}</td>
                              <td className="p-2 border">{b.quantityProduced}</td>
                              <td className="p-2 border">{b.productionWindow}</td>
                              <td className="p-2 border">{b.releaseStatus}</td>
                            </tr>))}
                        </tbody>
                      </table>
                    </div>
                  )} </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
