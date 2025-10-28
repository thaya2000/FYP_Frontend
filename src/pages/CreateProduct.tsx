import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { productCategoryService } from "@/services/productCategoryService";
import { productRegistryService, type CreateProductRequest, type UpdateProductRequest } from "@/services/productService";
import { batchService, type CreateBatchRequest } from "@/services/batchService";
import type { Product, ProductCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ProductFormState = CreateProductRequest;

const emptyProductForm: ProductFormState = {
  productName: "",
  productCategoryId: "",
  requiredStartTemp: "",
  requiredEndTemp: "",
  handlingInstructions: "",
};

type BatchFormState = {
  productId: string;
  facility: string;
  productionStartTime: string;
  productionEndTime: string;
  quantityProduced: string;
  expiryDate: string;
};

const emptyBatchForm: BatchFormState = {
  productId: "",
  facility: "",
  productionStartTime: "",
  productionEndTime: "",
  quantityProduced: "",
  expiryDate: "",
};

const normalizeDateTimeToIso = (value: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (trimmed.endsWith("Z")) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}Z`;
  }
  const maybeDate = new Date(trimmed);
  if (!Number.isNaN(maybeDate.getTime())) {
    return maybeDate.toISOString();
  }
  return trimmed;
};

export default function CreateProduct() {
  const { role, uuid } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(() => (role === "ADMIN" ? "categories" : "products"));
  const [categoryName, setCategoryName] = useState("");
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [batchForm, setBatchForm] = useState<BatchFormState>(emptyBatchForm);
  const [productListCategory, setProductListCategory] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);

  const categoriesEnabled = role === "ADMIN" || role === "MANUFACTURER";

  const { data: categories = [], isLoading: loadingCategories } = useQuery<ProductCategory[]>({
    queryKey: ["productCategories"],
    queryFn: () => productCategoryService.list(),
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["products", productListCategory],
    queryFn: () =>
      productRegistryService.getAllProducts(
        productListCategory ? { categoryId: productListCategory } : undefined,
      ),
  });

  const { data: allProducts = [], isLoading: loadingAllProducts } = useQuery<Product[]>({
    queryKey: ["products", "all"],
    queryFn: () => productRegistryService.getAllProducts(),
  });

  const handleProductListCategoryChange = (value: string) => {
    setProductListCategory(value === "ALL" ? "" : value);
  };

  const productListSelectValue = productListCategory || "ALL";

  const categoryLookup = useMemo<Record<string, string>>(
    () =>
      categories.reduce((acc, category) => {
        acc[category.id] = category.name;
        return acc;
      }, {} as Record<string, string>),
    [categories],
  );

  const createCategory = useMutation({
    mutationFn: () => productCategoryService.create({ name: categoryName.trim() }),
    onSuccess: () => {
      toast({ title: "Category created" });
      setCategoryName("");
      queryClient.invalidateQueries({ queryKey: ["productCategories"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create category",
        description: error?.response?.data?.error ?? "Try again later.",
        variant: "destructive",
      });
    },
  });

  const createProduct = useMutation({
    mutationFn: (payload: CreateProductRequest) => productRegistryService.registerProduct(payload),
    onSuccess: () => {
      toast({ title: "Product created" });
      setProductForm(emptyProductForm);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productCategories"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create product",
        description: error?.response?.data?.error ?? "Try again later.",
        variant: "destructive",
      });
    },
  });

  const registerBatch = useMutation({
    mutationFn: (payload: CreateBatchRequest) => batchService.createBatch(payload),
    onSuccess: () => {
      toast({ title: "Batch registered" });
      resetBatchForm(true);
      queryClient.invalidateQueries({ queryKey: ["productBatches"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to register batch",
        description: error?.response?.data?.error ?? "Try again later.",
        variant: "destructive",
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductRequest }) => productRegistryService.updateProduct(id, data),
    onSuccess: () => {
      toast({ title: "Product updated" });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update product",
        description: error?.response?.data?.error ?? "Try again later.",
        variant: "destructive",
      });
    },
  });

  const selectedCategoryName = useMemo(() => {
    return categories.find((c) => c.id === productForm.productCategoryId)?.name ?? "";
  }, [categories, productForm.productCategoryId]);

  const handleProductSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = productForm.productName.trim();
    if (!trimmedName) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }
    if (!productForm.productCategoryId) {
      toast({ title: "Select a product category", variant: "destructive" });
      return;
    }
    if (!productForm.requiredStartTemp.trim() || !productForm.requiredEndTemp.trim()) {
      toast({ title: "Provide the required temperature range", variant: "destructive" });
      return;
    }
    if (!productForm.handlingInstructions.trim()) {
      toast({ title: "Handling instructions are required", variant: "destructive" });
      return;
    }

    createProduct.mutate({
      productName: trimmedName,
      productCategoryId: productForm.productCategoryId,
      requiredStartTemp: productForm.requiredStartTemp.trim(),
      requiredEndTemp: productForm.requiredEndTemp.trim(),
      handlingInstructions: productForm.handlingInstructions.trim(),
    });
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      productName: product.productName,
      productCategoryId: product.productCategoryId,
      requiredStartTemp: product.requiredStartTemp ?? "",
      requiredEndTemp: product.requiredEndTemp ?? "",
      handlingInstructions: product.handlingInstructions ?? "",
    });
    setIsProductDialogOpen(true);
  };

  const handleUpdateProduct = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingProduct) return;

    updateProduct.mutate({
      id: editingProduct.id,
      data: {
        productName: productForm.productName.trim(),
        productCategoryId: productForm.productCategoryId,
        requiredStartTemp: productForm.requiredStartTemp.trim(),
        requiredEndTemp: productForm.requiredEndTemp.trim(),
        handlingInstructions: productForm.handlingInstructions.trim(),
      },
    });
  };

  const resetProductForm = () => setProductForm(emptyProductForm);

  const resetBatchForm = (preserveProduct = false) => {
    if (preserveProduct) {
      setBatchForm((current) => ({
        ...emptyBatchForm,
        productId: current.productId,
      }));
      return;
    }
    setBatchForm(emptyBatchForm);
  };

  const handleBatchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!uuid) {
      toast({
        title: "Missing manufacturer ID",
        description: "Please sign in again to refresh your manufacturer profile.",
        variant: "destructive",
      });
      return;
    }
    if (!batchForm.productId) {
      toast({ title: "Select a product for this batch", variant: "destructive" });
      return;
    }
    const facility = batchForm.facility.trim();
    if (!facility) {
      toast({ title: "Facility name is required", variant: "destructive" });
      return;
    }
    const productionStartIso = normalizeDateTimeToIso(batchForm.productionStartTime);
    const productionEndIso = normalizeDateTimeToIso(batchForm.productionEndTime);
    const startMs = Date.parse(productionStartIso);
    const endMs = Date.parse(productionEndIso);
    if (!productionStartIso || Number.isNaN(startMs)) {
      toast({ title: "Enter a valid production start time", variant: "destructive" });
      return;
    }
    if (!productionEndIso || Number.isNaN(endMs)) {
      toast({ title: "Enter a valid production end time", variant: "destructive" });
      return;
    }
    if (startMs > endMs) {
      toast({ title: "Start time cannot be after end time", variant: "destructive" });
      return;
    }
    const quantity = batchForm.quantityProduced.trim();
    if (!quantity || Number.isNaN(Number(quantity)) || Number(quantity) <= 0) {
      toast({ title: "Enter a valid quantity produced", variant: "destructive" });
      return;
    }
    if (!batchForm.expiryDate) {
      toast({ title: "Expiry date is required", variant: "destructive" });
      return;
    }

    const payload: CreateBatchRequest = {
      productId: batchForm.productId,
      manufacturerUUID: uuid,
      facility,
      productionStartTime: productionStartIso,
      productionEndTime: productionEndIso,
      quantityProduced: quantity,
      expiryDate: batchForm.expiryDate,
    };
    registerBatch.mutate(payload);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground">Maintain product categories and register new products.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          {categoriesEnabled && <TabsTrigger value="categories">Categories</TabsTrigger>}
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Product</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Product Name</label>
                  <Input
                    value={productForm.productName}
                    onChange={(event) => setProductForm({ ...productForm, productName: event.target.value })}
                    placeholder="Pfizer"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Category</label>
                  {loadingCategories ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading categories...
                    </div>
                  ) : categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {categoriesEnabled ? "Create a category first." : "No categories available."}
                    </p>
                  ) : (
                    <Select
                      value={productForm.productCategoryId}
                      onValueChange={(value) => setProductForm({ ...productForm, productCategoryId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Category (preview)</label>
                  <Input value={selectedCategoryName} readOnly />
                </div>

                <div>
                  <label className="text-sm font-medium">Required Start Temp</label>
                  <Input
                    value={productForm.requiredStartTemp}
                    onChange={(event) => setProductForm({ ...productForm, requiredStartTemp: event.target.value })}
                    placeholder="2C"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Required End Temp</label>
                  <Input
                    value={productForm.requiredEndTemp}
                    onChange={(event) => setProductForm({ ...productForm, requiredEndTemp: event.target.value })}
                    placeholder="8C"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Handling Instructions</label>
                  <Textarea
                    value={productForm.handlingInstructions}
                    onChange={(event) => setProductForm({ ...productForm, handlingInstructions: event.target.value })}
                    placeholder="Keep upright"
                    rows={3}
                    required
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetProductForm}>
                    Clear
                  </Button>
                  <Button type="submit" disabled={createProduct.isPending}>
                    {createProduct.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      "Create Product"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Register Batch</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBatchSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Product</label>
                  {loadingAllProducts ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading products...
                    </div>
                  ) : allProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Create a product before registering batches.</p>
                  ) : (
                    <Select
                      value={batchForm.productId}
                      onValueChange={(value) => setBatchForm((prev) => ({ ...prev, productId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {allProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.productName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Manufacturer UUID</label>
                  <Input value={uuid ?? ""} readOnly placeholder="Not available" />
                  {!uuid ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Manufacturer identifier unavailable. Please reauthenticate to populate this field.
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Facility</label>
                  <Input
                    value={batchForm.facility}
                    onChange={(event) => setBatchForm((prev) => ({ ...prev, facility: event.target.value }))}
                    placeholder="Plant A"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Production Start</label>
                  <Input
                    type="datetime-local"
                    value={batchForm.productionStartTime}
                    onChange={(event) => setBatchForm((prev) => ({ ...prev, productionStartTime: event.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Production End</label>
                  <Input
                    type="datetime-local"
                    value={batchForm.productionEndTime}
                    onChange={(event) => setBatchForm((prev) => ({ ...prev, productionEndTime: event.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Quantity Produced</label>
                  <Input
                    type="number"
                    min="0"
                    value={batchForm.quantityProduced}
                    onChange={(event) => setBatchForm((prev) => ({ ...prev, quantityProduced: event.target.value }))}
                    placeholder="7500"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Expiry Date</label>
                  <Input
                    type="date"
                    value={batchForm.expiryDate}
                    onChange={(event) => setBatchForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
                    required
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => resetBatchForm()}>
                    Clear
                  </Button>
                  <Button type="submit" disabled={registerBatch.isPending || !uuid || allProducts.length === 0}>
                    {registerBatch.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Registering...
                      </span>
                    ) : (
                      "Register Batch"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Registered Products</CardTitle>
              <div className="w-full sm:w-64">
                <Select value={productListSelectValue} onValueChange={handleProductListCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-muted-foreground py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <p className="text-muted-foreground">No products have been created yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <Card key={product.id} className="border border-border/60">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{product.productName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Category</p>
                          <p className="font-medium">
                            {product.productCategoryName ?? categoryLookup[product.productCategoryId] ?? "—"}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-muted-foreground text-xs uppercase">Start Temp</p>
                            <p className="font-medium">{product.requiredStartTemp ?? "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs uppercase">End Temp</p>
                            <p className="font-medium">{product.requiredEndTemp ?? "—"}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase">Handling</p>
                          <p className="font-medium whitespace-pre-wrap">{product.handlingInstructions ?? "—"}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-2"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {categoriesEnabled && (
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Category</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!categoryName.trim()) {
                      toast({ title: "Category name is required", variant: "destructive" });
                      return;
                    }
                    createCategory.mutate();
                  }}
                  className="flex flex-col md:flex-row gap-2"
                >
                  <Input
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="Vaccine"
                    required
                  />
                  <Button type="submit" disabled={createCategory.isPending}>
                    {createCategory.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      "Create Category"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCategories ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-muted-foreground">No categories created yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {categories.map((category) => (
                      <li key={category.id} className="rounded-md border border-border/60 px-4 py-3">
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {category.createdAt ? new Date(category.createdAt).toLocaleString() : "unknown"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={isProductDialogOpen} onOpenChange={(open) => setIsProductDialogOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update the key attributes for this product.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Product Name</label>
              <Input
                value={productForm.productName}
                onChange={(event) => setProductForm({ ...productForm, productName: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                value={productForm.productCategoryId}
                onValueChange={(value) => setProductForm({ ...productForm, productCategoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Required Start Temp</label>
                <Input
                  value={productForm.requiredStartTemp}
                  onChange={(event) => setProductForm({ ...productForm, requiredStartTemp: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Required End Temp</label>
                <Input
                  value={productForm.requiredEndTemp}
                  onChange={(event) => setProductForm({ ...productForm, requiredEndTemp: event.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Handling Instructions</label>
              <Textarea
                value={productForm.handlingInstructions}
                onChange={(event) => setProductForm({ ...productForm, handlingInstructions: event.target.value })}
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProduct.isPending}>
                {updateProduct.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
