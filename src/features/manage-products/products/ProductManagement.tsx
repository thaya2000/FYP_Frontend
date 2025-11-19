import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { productRegistryService, type CreateProductRequest, type UpdateProductRequest } from "@/services/productService";
import { productCategoryService } from "@/services/productCategoryService";
import type { Product, ProductCategory } from "@/types";
import { Loader2, PlusCircle } from "lucide-react";

const emptyProductForm: CreateProductRequest = {
  productName: "",
  productCategoryId: "",
  requiredStartTemp: "",
  requiredEndTemp: "",
  handlingInstructions: "",
};

const formatDateTime = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatDetailedDateTime = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} - ${timePart}`;
};

export function ProductManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProductRequest>(emptyProductForm);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<UpdateProductRequest>(emptyProductForm);

  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const { data: categories = [], isLoading: loadingCategories } = useQuery<ProductCategory[]>({
    queryKey: ["productCategories"],
    queryFn: () => productCategoryService.list(),
  });

  const {
    data: products = [],
    isLoading: loadingProducts,
    isError,
    error,
  } = useQuery<Product[]>({
    queryKey: ["products", categoryFilter],
    queryFn: () =>
      categoryFilter === "all"
        ? productRegistryService.getAllProducts()
        : productRegistryService.getAllProducts({ categoryId: categoryFilter }),
  });

  const createMutation = useMutation({
    mutationFn: () => productRegistryService.registerProduct(createForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsCreateDialogOpen(false);
      setCreateForm(emptyProductForm);
      toast({
        title: "Product created",
        description: "The product has been added to your catalogue.",
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: "destructive",
        title: "Failed to create product",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: UpdateProductRequest }) =>
      productRegistryService.updateProduct(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingProduct(null);
      toast({
        title: "Product updated",
        description: "Product details saved successfully.",
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: "destructive",
        title: "Failed to update product",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const filteredCategories = useMemo(() => {
    const options = categories.map((category) => ({
      value: category.id,
      label: category.name,
    }));
    return options;
  }, [categories]);

  const categoryLookup = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  const visibleProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => {
      const categoryName =
        product.productCategory?.name ??
        categoryLookup.get(product.productCategoryId ?? "") ??
        "";
      const fields = [
        product.productName,
        product.name,
        categoryName,
        product.requiredStartTemp,
        product.requiredEndTemp,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return fields.some((value) => value.includes(term));
    });
  }, [products, productSearch, categoryLookup]);

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.productName.trim() || !createForm.productCategoryId) {
      toast({
        variant: "destructive",
        title: "Fill in required fields",
        description: "Product name and category are required.",
      });
      return;
    }
    createMutation.mutate();
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProduct) return;
    if (!editForm.productName?.trim() || !editForm.productCategoryId) {
      toast({
        variant: "destructive",
        title: "Fill in required fields",
        description: "Product name and category are required.",
      });
      return;
    }
    updateMutation.mutate({ id: editingProduct.id, data: editForm });
  };

  const renderProducts = () => {
  const hasFilter = Boolean(productSearch.trim());

  if (loadingProducts) {
    return (
      <div className="rounded-lg border border-border/60">
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Temperature range</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={`product-skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-2 h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {(error as Error)?.message ?? "Unable to load products right now."}
      </div>
    );
  }

  if (!products.length && !hasFilter) {
    return (
      <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">
        No products found. Use the Create Product button to add one.
      </div>
    );
  }

  if (!visibleProducts.length) {
    return (
      <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">
        No products match your current filter.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60">
      <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Temperature range</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProducts.map((product) => {
              const categoryLabel =
                product.productCategory?.name ??
                categoryLookup.get(product.productCategoryId) ??
                "Uncategorised";
              const tempLabel =
                product.requiredStartTemp && product.requiredEndTemp
                  ? `${product.requiredStartTemp} - ${product.requiredEndTemp}`
                  : "Not specified";
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {product.productName}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {product.handlingInstructions || "No handling notes"}
                    </p>
                  </TableCell>
                  <TableCell>{categoryLabel}</TableCell>
                  <TableCell>{tempLabel}</TableCell>
                  <TableCell>{formatDateTime(product.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewingProduct(product)}>
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingProduct(product);
                          setEditForm({
                            productName: product.productName ?? "",
                            productCategoryId: product.productCategory?.id ?? product.productCategoryId ?? "",
                            requiredStartTemp: product.requiredStartTemp ?? "",
                            requiredEndTemp: product.requiredEndTemp ?? "",
                            handlingInstructions: product.handlingInstructions ?? "",
                          });
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Products</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="sm:w-48">
            <label htmlFor="product-search-filter" className="sr-only">
              Search products
            </label>
            <Input
              id="product-search-filter"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search products..."
            />
          </div>
          <div className="sm:w-52">
            <label htmlFor="product-category-filter" className="sr-only">
              Category filter
            </label>
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              disabled={loadingCategories && categories.length === 0}
            >
              <SelectTrigger id="product-category-filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {filteredCategories.map((category) => (
                  <SelectItem value={category.value} key={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Product
          </Button>
        </div>
      </header>

      {renderProducts()}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
            <DialogDescription>
              Capture the critical handling details for your new product.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="space-y-2">
              <label htmlFor="product-name" className="text-sm font-medium">
                Product name
              </label>
              <Input
                id="product-name"
                placeholder="e.g. Comirnaty mRNA Vaccine"
                value={createForm.productName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    productName: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="product-category" className="text-sm font-medium">
                Category
              </label>
              <Select
                value={createForm.productCategoryId}
                onValueChange={(value) =>
                  setCreateForm((current) => ({
                    ...current,
                    productCategoryId: value,
                  }))
                }
                required
              >
                <SelectTrigger id="product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem value={category.value} key={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="product-temp-start"
                  className="text-sm font-medium"
                >
                  Required start temperature
                </label>
                <Input
                  id="product-temp-start"
                  placeholder="-70 deg C"
                  value={createForm.requiredStartTemp}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      requiredStartTemp: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="product-temp-end"
                  className="text-sm font-medium"
                >
                  Required end temperature
                </label>
                <Input
                  id="product-temp-end"
                  placeholder="-60 deg C"
                  value={createForm.requiredEndTemp}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      requiredEndTemp: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="product-instructions"
                className="text-sm font-medium"
              >
                Handling instructions
              </label>
              <Textarea
                id="product-instructions"
                placeholder="Keep frozen. Thaw at room temperature before administration."
                value={createForm.handlingInstructions}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    handlingInstructions: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Create product
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingProduct)}
        onOpenChange={(open) => (!open ? setEditingProduct(null) : null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Adjust product details to keep information accurate.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="edit-product-name"
                className="text-sm font-medium"
              >
                Product name
              </label>
              <Input
                id="edit-product-name"
                value={editForm.productName}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    productName: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="edit-product-category"
                className="text-sm font-medium"
              >
                Category
              </label>
              <Select
                value={editForm.productCategoryId ?? ""}
                onValueChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    productCategoryId: value,
                  }))
                }
                required
              >
                <SelectTrigger id="edit-product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem value={category.value} key={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="edit-product-temp-start"
                  className="text-sm font-medium"
                >
                  Required start temperature
                </label>
                <Input
                  id="edit-product-temp-start"
                  value={editForm.requiredStartTemp ?? ""}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      requiredStartTemp: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="edit-product-temp-end"
                  className="text-sm font-medium"
                >
                  Required end temperature
                </label>
                <Input
                  id="edit-product-temp-end"
                  value={editForm.requiredEndTemp ?? ""}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      requiredEndTemp: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="edit-product-instructions"
                className="text-sm font-medium"
              >
                Handling instructions
              </label>
              <Textarea
                id="edit-product-instructions"
                value={editForm.handlingInstructions ?? ""}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    handlingInstructions: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewingProduct)}
        onOpenChange={(open) => (!open ? setViewingProduct(null) : null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingProduct?.productName}</DialogTitle>
            <DialogDescription>Product details</DialogDescription>
          </DialogHeader>
          {viewingProduct ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  {
                    label: "Category",
                    value:
                      viewingProduct.productCategory?.name ??
                      categoryLookup.get(viewingProduct.productCategoryId) ??
                      "Uncategorised",
                  },
                  {
                    label: "Temperature range",
                    value:
                      viewingProduct.requiredStartTemp &&
                      viewingProduct.requiredEndTemp
                        ? `${viewingProduct.requiredStartTemp} - ${viewingProduct.requiredEndTemp}`
                        : "Not specified",
                  },
                ].map((detail) => (
                  <div
                    key={detail.label}
                    className="rounded-lg border border-border/60 bg-background px-4 py-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {detail.label}
                    </p>
                    <p className="font-medium text-foreground">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Handling instructions
                </p>
                <p className="text-foreground">
                  {viewingProduct.handlingInstructions?.trim() ||
                    "Not provided"}
                </p>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  {
                    label: "Created",
                    value: formatDetailedDateTime(viewingProduct.createdAt),
                  },
                  {
                    label: "Updated",
                    value: formatDetailedDateTime(viewingProduct.updatedAt),
                  },
                ].map((detail) => (
                  <div
                    key={detail.label}
                    className="rounded-lg border border-border/60 bg-background px-4 py-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {detail.label}
                    </p>
                    <p className="font-medium text-foreground">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}











