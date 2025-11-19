import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle } from "lucide-react";
import { batchService, type CreateBatchRequest, type UpdateBatchRequest } from "@/services/batchService";
import { productRegistryService } from "@/services/productService";
import type { Product, ProductBatchSummary } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";

const emptyBatchForm = (manufacturerUUID: string): CreateBatchRequest => ({
  productId: "",
  manufacturerUUID,
  facility: "",
  productionStartTime: "",
  productionEndTime: "",
  quantityProduced: "",
  expiryDate: "",
});

const batchUpdatePayload = (form: CreateBatchRequest, manufacturerUUID: string): UpdateBatchRequest => ({
  productId: form.productId,
  manufacturerUUID,
  facility: form.facility,
  productionStartTime: form.productionStartTime,
  productionEndTime: form.productionEndTime,
  quantityProduced: form.quantityProduced,
  expiryDate: form.expiryDate,
});

const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

const normaliseDateTime = (value: string) => {
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

const formatDateTime = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatFriendlyDateTime = (value?: string) => {
  if (!value) return "Not specified";
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

export function BatchManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { uuid } = useAppStore();
  const manufacturerUUID = uuid ?? "";

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBatchRequest>(emptyBatchForm(manufacturerUUID));

  const [editingBatch, setEditingBatch] = useState<ProductBatchSummary | null>(null);
  const [editForm, setEditForm] = useState<CreateBatchRequest>(emptyBatchForm(manufacturerUUID));

  const [viewingBatch, setViewingBatch] = useState<ProductBatchSummary | null>(null);
  const [batchFilter, setBatchFilter] = useState("");

  const {
    data: batches = [],
    isLoading: loadingBatches,
    isError: batchesError,
    error: batchesErrorDetails,
  } = useQuery<ProductBatchSummary[]>({
    queryKey: ["batches", manufacturerUUID],
    queryFn: () => batchService.getAllBatches(manufacturerUUID),
    enabled: Boolean(manufacturerUUID),
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["products", "all-for-batches"],
    queryFn: () => productRegistryService.getAllProducts(),
  });

  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.id, label: product.productName || product.name || "Product" })),
    [products],
  );

  const productLookup = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const filteredBatches = useMemo(() => {
    const term = batchFilter.trim().toLowerCase();
    if (!term) return batches;

    return batches.filter((batch) => {
      const product = batch.productId ? productLookup.get(batch.productId) : null;
      const productName =
        batch.product?.name ??
        batch.product?.productName ??
        product?.productName ??
        product?.name ??
        "";
      const fields = [
        batch.batchCode,
        batch.id,
        productName,
        batch.facility,
        batch.quantityProduced,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return fields.some((value) => value.includes(term));
    });
  }, [batches, batchFilter, productLookup]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateBatchRequest) => batchService.createBatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setIsCreateDialogOpen(false);
      setCreateForm(emptyBatchForm(manufacturerUUID));
      toast({
        title: "Batch created",
        description: "The batch has been registered successfully.",
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: "destructive",
        title: "Failed to create batch",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: UpdateBatchRequest }) => batchService.updateBatch(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setEditingBatch(null);
      toast({
        title: "Batch updated",
        description: "Batch details saved successfully.",
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: "destructive",
        title: "Failed to update batch",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manufacturerUUID) {
      toast({
        variant: "destructive",
        title: "Manufacturer profile required",
        description: "Your account must include a manufacturer UUID before creating batches.",
      });
      return;
    }
    if (!createForm.productId) {
      toast({
        variant: "destructive",
        title: "Select a product",
        description: "Batches must be associated with a product.",
      });
      return;
    }
    createMutation.mutate({
      ...createForm,
      manufacturerUUID,
      productionStartTime: normaliseDateTime(createForm.productionStartTime),
      productionEndTime: normaliseDateTime(createForm.productionEndTime),
      expiryDate: normaliseDateTime(createForm.expiryDate),
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBatch) return;
    if (!manufacturerUUID) {
      toast({
        variant: "destructive",
        title: "Manufacturer profile required",
      });
      return;
    }
    updateMutation.mutate({
      id: String(editingBatch.id),
      data: batchUpdatePayload(
        {
          ...editForm,
          productionStartTime: normaliseDateTime(editForm.productionStartTime),
          productionEndTime: normaliseDateTime(editForm.productionEndTime),
          expiryDate: normaliseDateTime(editForm.expiryDate),
        },
        manufacturerUUID,
      ),
    });
  };

  const renderBatches = () => {
  const hasFilter = Boolean(batchFilter.trim());

  if (loadingBatches) {
    return (
      <div className="rounded-lg border border-border/60">
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Production window</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={`batch-skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-44" />
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

  if (batchesError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {(batchesErrorDetails as Error)?.message ?? "Unable to load batches right now."}
      </div>
    );
  }

  if (!batches.length && !hasFilter) {
    return (
      <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">
        No batches found. Register a batch to begin tracking production.
      </div>
    );
  }

  if (!filteredBatches.length) {
    return (
      <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">
        No batches match your current filter.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60">
      <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Production window</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBatches.map((batch) => {
              const product = batch.productId ? productLookup.get(batch.productId) : null;
              const productName =
                batch.product?.name ??
                batch.product?.productName ??
                product?.productName ??
                product?.name ??
                "Product";
              const productionStart = batch.productionStart ?? batch.productionStartTime ?? batch.productionWindow;
              const productionEnd = batch.productionEnd ?? batch.productionEndTime ?? null;
              const productionWindow = productionStart
                ? productionEnd
                  ? `${formatFriendlyDateTime(productionStart)} - ${formatFriendlyDateTime(productionEnd)}`
                  : formatFriendlyDateTime(productionStart)
                : "Not specified";
              return (
                <TableRow key={batch.id}>
                  <TableCell>{batch.batchCode || `Batch ${batch.id}`}</TableCell>
                  <TableCell>{productName}</TableCell>
                  <TableCell>{batch.facility || "Not specified"}</TableCell>
                  <TableCell>{batch.quantityProduced || "Not specified"}</TableCell>
                  <TableCell>{productionWindow}</TableCell>
                  <TableCell>{formatFriendlyDateTime(batch.expiryDate)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewingBatch(batch)}>
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingBatch(batch);
                          setEditForm({
                            productId:
                              batch.product?.id ??
                              batch.productId ??
                              batch.product_uuid ??
                              "",
                            manufacturerUUID,
                            facility: batch.facility ?? "",
                            productionStartTime: toDateTimeInputValue(
                              batch.productionStartTime ??
                                batch.productionStart ??
                                batch.productionWindow ??
                                "",
                            ),
                            productionEndTime: toDateTimeInputValue(
                              batch.productionEndTime ?? batch.productionEnd ?? "",
                            ),
                            quantityProduced: batch.quantityProduced
                              ? String(batch.quantityProduced)
                              : "",
                            expiryDate: toDateInputValue(batch.expiryDate),
                          });
                        }}
                        disabled={!manufacturerUUID}
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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Batches</h2>
          {/* <p className="text-sm text-muted-foreground">
            Monitor production batches and connect them to downstream packages.
          </p> */}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:justify-end">
          <div className="sm:w-64">
            <label htmlFor="batch-filter" className="sr-only">
              Search batches
            </label>
            <Input
              id="batch-filter"
              value={batchFilter}
              onChange={(event) => setBatchFilter(event.target.value)}
              placeholder="Search batches..."
            />
          </div>
          <Button
            onClick={() => {
              setIsCreateDialogOpen(true);
              setCreateForm(emptyBatchForm(manufacturerUUID));
            }}
            className="gap-2"
            disabled={!manufacturerUUID}
          >
            <PlusCircle className="h-4 w-4" />
            Create Batch
          </Button>
        </div>
      </header>

      {renderBatches()}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Batch</DialogTitle>
            <DialogDescription>Capture production details for traceability.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="space-y-2">
              <label htmlFor="batch-product" className="text-sm font-medium">
                Product
              </label>
              <Select
                value={createForm.productId}
                onValueChange={(value) => setCreateForm((current) => ({ ...current, productId: value }))}
                required
                disabled={loadingProducts}
              >
                <SelectTrigger id="batch-product">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="batch-facility" className="text-sm font-medium">
                Facility
              </label>
              <Input
                id="batch-facility"
                placeholder="Manufacturing facility name"
                value={createForm.facility}
                onChange={(event) => setCreateForm((current) => ({ ...current, facility: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="batch-start" className="text-sm font-medium">
                  Production start
                </label>
                <Input
                  id="batch-start"
                  type="datetime-local"
                  value={createForm.productionStartTime}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, productionStartTime: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="batch-end" className="text-sm font-medium">
                  Production end
                </label>
                <Input
                  id="batch-end"
                  type="datetime-local"
                  value={createForm.productionEndTime}
                  onChange={(event) => setCreateForm((current) => ({ ...current, productionEndTime: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="batch-quantity" className="text-sm font-medium">
                  Quantity produced
                </label>
                <Input
                  id="batch-quantity"
                  placeholder="e.g. 10000"
                  value={createForm.quantityProduced}
                  onChange={(event) => setCreateForm((current) => ({ ...current, quantityProduced: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="batch-expiry" className="text-sm font-medium">
                  Expiry date
                </label>
                <Input
                  id="batch-expiry"
                  type="date"
                  value={createForm.expiryDate}
                  onChange={(event) => setCreateForm((current) => ({ ...current, expiryDate: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create batch
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingBatch)} onOpenChange={(open) => (!open ? setEditingBatch(null) : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>Update production details for this batch.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <label htmlFor="edit-batch-product" className="text-sm font-medium">
                Product
              </label>
              <Select
                value={editForm.productId}
                onValueChange={(value) => setEditForm((current) => ({ ...current, productId: value }))}
              >
                <SelectTrigger id="edit-batch-product">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-batch-facility" className="text-sm font-medium">
                Facility
              </label>
              <Input
                id="edit-batch-facility"
                value={editForm.facility}
                onChange={(event) => setEditForm((current) => ({ ...current, facility: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-batch-start" className="text-sm font-medium">
                  Production start
                </label>
                <Input
                  id="edit-batch-start"
                  type="datetime-local"
                  value={editForm.productionStartTime}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, productionStartTime: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-batch-end" className="text-sm font-medium">
                  Production end
                </label>
                <Input
                  id="edit-batch-end"
                  type="datetime-local"
                  value={editForm.productionEndTime}
                  onChange={(event) => setEditForm((current) => ({ ...current, productionEndTime: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-batch-quantity" className="text-sm font-medium">
                  Quantity produced
                </label>
                <Input
                  id="edit-batch-quantity"
                  value={editForm.quantityProduced}
                  onChange={(event) => setEditForm((current) => ({ ...current, quantityProduced: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-batch-expiry" className="text-sm font-medium">
                  Expiry date
                </label>
                <Input
                  id="edit-batch-expiry"
                  type="date"
                  value={editForm.expiryDate}
                  onChange={(event) => setEditForm((current) => ({ ...current, expiryDate: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingBatch(null)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingBatch)} onOpenChange={(open) => (!open ? setViewingBatch(null) : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingBatch?.batchCode || `Batch ${viewingBatch?.id}`}</DialogTitle>
            <DialogDescription>Batch details</DialogDescription>
          </DialogHeader>
          {viewingBatch ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Product</p>
                <p className="text-foreground">
                  {viewingBatch.product?.name ??
                    (viewingBatch.productId
                      ? productLookup.get(viewingBatch.productId)?.productName ?? productLookup.get(viewingBatch.productId)?.name ?? "Product"
                      : "Not linked")}
                </p>
                <p className="text-muted-foreground">Facility</p>
                <p className="text-foreground">{viewingBatch.facility || "Not specified"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p className="text-foreground">{viewingBatch.quantityProduced || "Not specified"}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Production start</p>
                  <p className="text-foreground">
                    {formatFriendlyDateTime(
                      viewingBatch.productionStart ??
                        viewingBatch.productionStartTime ??
                        viewingBatch.productionWindow
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Production end</p>
                  <p className="text-foreground">
                    {formatFriendlyDateTime(viewingBatch.productionEnd ?? viewingBatch.productionEndTime)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiry date</p>
                  <p className="text-foreground">{formatFriendlyDateTime(viewingBatch.expiryDate)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}





