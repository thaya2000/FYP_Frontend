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
import { useAppStore } from "@/lib/store";

// 🔹 Utility — Simple ISO Date Validator
const isValidISODate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

export default function CreateProduct() {
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  const { uuid } = useAppStore();
  const [batchForm, setBatchForm] = useState({
    productCategory: "vaccine",
    manufacturerUUID: uuid,
    facility: "",
    productionStart: "",
    productionEnd: "",
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
        manufacturerUUID: uuid,
        facility: "",
        productionStart: "",
        productionEnd: "",
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
    const { facility, productionStart, productionEnd, quantityProduced, releaseStatus } = batchForm;

    if (!facility.trim()) return "Facility name is required.";
    if (!productionStart || !isValidISODate(productionStart)) return "Production start date is required (YYYY-MM-DD).";
    if (!productionEnd || !isValidISODate(productionEnd)) return "Production end date is required (YYYY-MM-DD).";

    const start = new Date(productionStart);
    const end = new Date(productionEnd);
    if (start > end) return "Production start date must be before or equal to end date.";

    if (!quantityProduced.trim() || isNaN(Number(quantityProduced)))
      return "Quantity produced must be a valid number.";
    if (!releaseStatus.trim() || !isValidISODate(releaseStatus))
      return "Release date must be a valid date (YYYY-MM-DD).";

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

    const productionWindow = `${batchForm.productionStart} to ${batchForm.productionEnd}`;

    createBatchMutation.mutate({
      productCategory: batchForm.productCategory.trim(),
      manufacturerUUID: batchForm.manufacturerUUID.trim(),
      facility: batchForm.facility.trim(),
      productionWindow, // send as "YYYY-MM-DD to YYYY-MM-DD"
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
                        <label htmlFor="select-batch" className="font-medium text-sm mb-1 block">
                          Select Batch
                        </label>
                        <Select
                          value={selectedBatch}
                          onValueChange={(v) => setSelectedBatch(v)}
                        >
                          <SelectTrigger id="select-batch" aria-label="Select Batch">
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

                      <div>
                        <label htmlFor="productName" className="font-medium text-sm mb-1 block">
                          Product Name
                        </label>
                        <Input
                          id="productName"
                          name="productName"
                          placeholder="Pfizer Vaccine"
                          value={productForm.productName}
                          onChange={handleProductChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="requiredStorageTemp" className="font-medium text-sm mb-1 block">
                          Required Storage Temperature
                        </label>
                        <Input
                          id="requiredStorageTemp"
                          name="requiredStorageTemp"
                          placeholder="2–8°C"
                          value={productForm.requiredStorageTemp}
                          onChange={handleProductChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="expiryDate" className="font-medium text-sm mb-1 block">
                          Expiry Date
                        </label>
                        <Input
                          id="expiryDate"
                          name="expiryDate"
                          type="date"
                          value={productForm.expiryDate}
                          onChange={handleProductChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="sensorDeviceUUID" className="font-medium text-sm mb-1 block">
                          Sensor Device UUID
                        </label>
                        <Input
                          id="sensorDeviceUUID"
                          name="sensorDeviceUUID"
                          placeholder="SENSOR-1001"
                          value={productForm.sensorDeviceUUID}
                          onChange={handleProductChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="microprocessorMac" className="font-medium text-sm mb-1 block">
                          Microprocessor MAC Address
                        </label>
                        <Input
                          id="microprocessorMac"
                          name="microprocessorMac"
                          placeholder="00:1A:2B:3C:4D:5E"
                          value={productForm.microprocessorMac}
                          onChange={handleProductChange}
                        />
                      </div>
                    </div>

                    {/* 🧩 Right Column */}
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="handlingInstructions" className="font-medium text-sm mb-1 block">
                          Handling Instructions
                        </label>
                        <Textarea
                          id="handlingInstructions"
                          name="handlingInstructions"
                          placeholder="Handle with care. Do not freeze."
                          value={productForm.handlingInstructions}
                          onChange={handleProductChange}
                          className="h-[100px]"
                        />
                      </div>

                      <div>
                        <label htmlFor="sensorTypes" className="font-medium text-sm mb-1 block">
                          Sensor Types
                        </label>
                        <Input
                          id="sensorTypes"
                          name="sensorTypes"
                          placeholder="GPS, Temperature"
                          value={productForm.sensorTypes}
                          onChange={handleProductChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="qrId" className="font-medium text-sm mb-1 block">
                          QR ID
                        </label>
                        <Input
                          id="qrId"
                          name="qrId"
                          placeholder="QR-12345"
                          value={productForm.qrId}
                          onChange={handleProductChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="wifiSSID" className="font-medium text-sm mb-1 block">
                          Wi-Fi SSID
                        </label>
                        <Input
                          id="wifiSSID"
                          name="wifiSSID"
                          placeholder="PfizerNet"
                          value={productForm.wifiSSID}
                          onChange={handleProductChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="wifiPassword" className="font-medium text-sm mb-1 block">
                          Wi-Fi Password
                        </label>
                        <Input
                          id="wifiPassword"
                          name="wifiPassword"
                          placeholder="securepass123"
                          value={productForm.wifiPassword}
                          onChange={handleProductChange}
                        />
                      </div>

                      <div>
                        <label htmlFor="originFacilityAddr" className="font-medium text-sm mb-1 block">
                          Origin Facility Address
                        </label>
                        <Input
                          id="originFacilityAddr"
                          name="originFacilityAddr"
                          placeholder="Pfizer Lab NY - Line 1"
                          value={productForm.originFacilityAddr}
                          onChange={handleProductChange}
                        />
                      </div>
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
                    <thead>
                      <tr className="bg-muted">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                    <DialogDescription>
                      Fill in details to create a new batch.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateBatch} className="space-y-3 mt-4">
                    <div>
                      <label htmlFor="facility" className="font-medium text-sm mb-1 block">
                        Facility Name
                      </label>
                      <Input
                        id="facility"
                        name="facility"
                        placeholder="Pfizer Lab NY - Line 1"
                        value={batchForm.facility}
                        onChange={handleBatchChange}
                      />
                    </div>

                    {/* Production Window: start + end date pickers */}
                    <div>
                      <label className="font-medium text-sm mb-1 block">Production Window</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          id="productionStart"
                          name="productionStart"
                          type="date"
                          value={batchForm.productionStart}
                          onChange={handleBatchChange}
                          aria-label="Production start date"
                          placeholder="YYYY-MM-DD"
                        />
                        <Input
                          id="productionEnd"
                          name="productionEnd"
                          type="date"
                          value={batchForm.productionEnd}
                          onChange={handleBatchChange}
                          aria-label="Production end date"
                          placeholder="YYYY-MM-DD"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="quantityProduced" className="font-medium text-sm mb-1 block">
                        Quantity Produced
                      </label>
                      <Input
                        id="quantityProduced"
                        name="quantityProduced"
                        placeholder="10020"
                        value={batchForm.quantityProduced}
                        onChange={handleBatchChange}
                      />
                    </div>

                    <div>
                      <label htmlFor="releaseStatus" className="font-medium text-sm mb-1 block">
                        Release Date
                      </label>
                      <Input
                        id="releaseStatus"
                        name="releaseStatus"
                        type="date"
                        value={batchForm.releaseStatus}
                        onChange={handleBatchChange}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={createBatchMutation.isPending}
                      className="w-full"
                    >
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
              ) : batches?.length === 0 ? (
                <p className="text-muted-foreground">No batches found.</p>
              ) : (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
