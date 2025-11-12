import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlusCircle } from "lucide-react";
import {
  packageService,
  type PackageRegistryPayload,
  type PackageResponse,
  type UpdatePackagePayload,
} from "@/services/packageService";
import { batchService } from "@/services/batchService";
import type { ProductBatchSummary } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";

type PackageFormState = {
  batchId: string;
  microprocessorMac: string;
  sensorTypes: string;
};

const emptyPackageForm = (): PackageFormState => ({
  batchId: "",
  microprocessorMac: "",
  sensorTypes: "",
});

const formatDateTime = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const parseSensors = (value: string) =>
  value
    .split(",")
    .map((sensor) => sensor.trim())
    .filter(Boolean);

const sensorsToLabel = (sensors?: string[] | string) => {
  if (!sensors) return "Not specified";
  if (Array.isArray(sensors)) {
    return sensors.length ? sensors.join(", ") : "Not specified";
  }
  return sensors.split(",").map((item) => item.trim()).filter(Boolean).join(", ") || "Not specified";
};

const formatHash = (value?: string | null) => {
  if (!value) return "Not available";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const productionTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const toProductionLabel = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return productionTimeFormatter.format(date);
};

const deriveBatchProductionWindow = (batch: ProductBatchSummary) => {
  const start = toProductionLabel(batch.productionStartTime ?? batch.productionStart);
  const end = toProductionLabel(batch.productionEndTime ?? batch.productionEnd);

  let detail: string | undefined;
  if (start && end) {
    detail = `${start} – ${end}`;
  } else if (start) {
    detail = start;
  } else if (end) {
    detail = end;
  } else {
    detail =
      typeof batch.productionWindow === "string" && batch.productionWindow.trim().length > 0
        ? batch.productionWindow.trim()
        : batch.batchCode ?? undefined;
  }

  const fallback = `Batch ${batch.id ?? ""}`.trim();
  const baseLabel = detail ?? fallback;

  if (baseLabel.toLowerCase().startsWith("batch")) {
    return baseLabel;
  }

  return `Batch - ${baseLabel}`;
};

export function PackageManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { uuid } = useAppStore();
  const manufacturerUUID = uuid ?? "";

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PackageFormState>(emptyPackageForm());

  const [editingPackage, setEditingPackage] = useState<PackageResponse | null>(null);
  const [editForm, setEditForm] = useState<UpdatePackagePayload>({});

  const [viewingPackage, setViewingPackage] = useState<PackageResponse | null>(null);

  const {
    data: packages = [],
    isLoading: loadingPackages,
    isError: packagesError,
    error: packagesErrorDetails,
  } = useQuery<PackageResponse[]>({
    queryKey: ["packages", manufacturerUUID],
    queryFn: () => packageService.listByManufacturer(manufacturerUUID),
    enabled: Boolean(manufacturerUUID),
  });

  const {
    data: batches = [],
    isLoading: loadingBatches,
    isError: batchesError,
    error: batchesErrorDetails,
  } = useQuery<ProductBatchSummary[]>({
    queryKey: ["batches", "for-packages", manufacturerUUID],
    queryFn: () => batchService.getAllBatches(manufacturerUUID),
    enabled: Boolean(manufacturerUUID),
  });

  const batchOptions = useMemo(
    () =>
      batches.map((batch) => ({
        value: String(batch.id),
        label: deriveBatchProductionWindow(batch),
      })),
    [batches],
  );

  const batchLookup = useMemo(() => new Map(batches.map((batch) => [String(batch.id), batch])), [batches]);

  const createMutation = useMutation({
    mutationFn: (payload: PackageRegistryPayload) => packageService.register(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages", manufacturerUUID] });
      setIsCreateDialogOpen(false);
      setCreateForm(emptyPackageForm());
      toast({
        title: "Package registered",
        description: "The package was registered successfully.",
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: "destructive",
        title: "Failed to register package",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: UpdatePackagePayload }) => packageService.update(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages", manufacturerUUID] });
      setEditingPackage(null);
      setEditForm({});
      toast({
        title: "Package updated",
        description: "Package details saved successfully.",
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: "destructive",
        title: "Failed to update package",
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
        description: "Sign in as a manufacturer to register packages.",
      });
      return;
    }
    if (!createForm.batchId) {
      toast({
        variant: "destructive",
        title: "Select batch",
        description: "Each package must be linked to a batch.",
      });
      return;
    }
    createMutation.mutate({
      manufacturerUUID,
      batchId: createForm.batchId,
      microprocessorMac: createForm.microprocessorMac.trim(),
      sensorTypes: parseSensors(createForm.sensorTypes),
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPackage) return;
    updateMutation.mutate({
      id: editingPackage.id,
      data: editForm,
    });
  };

  const renderPackages = () => {
    if (!manufacturerUUID) {
      return (
        <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">
          Sign in as a manufacturer to view packages registered for your organisation.
        </div>
      );
    }

    if (loadingPackages) {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={`package-skeleton-${index}`} className="border-border/50">
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    if (packagesError) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {(packagesErrorDetails as Error)?.message ?? "Unable to load packages right now."}
        </div>
      );
    }

    if (!packages.length) {
      return (
        <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">
          No packages registered yet. Use the Create Package button to add one.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {packages.map((pkg) => {
          const batchReference = pkg.batch ?? (pkg.batchId ? batchLookup.get(String(pkg.batchId)) ?? null : null);
          const batchLabel =
            batchReference?.batchCode ?? (pkg.batchId ? `Batch ${pkg.batchId}` : "No batch linked");
          const productLabel =
            batchReference?.product?.name ??
            batchReference?.product?.productName ??
            "Product not linked";
          return (
            <Card key={pkg.id} className="border-border/60 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2">
                  <div>
                    <span className="block text-lg font-semibold">{pkg.packageCode || `Package ${pkg.id}`}</span>
                    <p className="text-xs text-muted-foreground">Product: {productLabel}</p>
                  </div>
                  <Badge variant="outline">{batchLabel}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="text-foreground">Quantity:</span> {pkg.quantity ?? "N/A"}
                </p>
                <p>
                  <span className="text-foreground">Available:</span> {pkg.quantityAvailable ?? "N/A"}
                </p>
                <p>
                  <span className="text-foreground">Status:</span> {pkg.status ?? "Not specified"}
                </p>
                <p>
                  <span className="text-foreground">Sensors:</span> {sensorsToLabel(pkg.sensorTypes)}
                </p>
                <p>
                  <span className="text-foreground">Payload hash:</span> {formatHash(pkg.payloadHash)}
                </p>
                <p>
                  <span className="text-foreground">Pinata CID:</span>{" "}
                  {pkg.pinataCid ? formatHash(pkg.pinataCid) : "Not available"}
                </p>
                <p>
                  <span className="text-foreground">Registered:</span> {formatDateTime(pkg.createdAt)}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewingPackage(pkg)}>
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingPackage(pkg);
                    setEditForm({
                      packageCode: pkg.packageCode ?? "",
                      status: pkg.status,
                      notes: pkg.notes,
                    });
                  }}
                >
                  Edit
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Packages</h2>
          <p className="text-sm text-muted-foreground">
            Register packages as they leave production and keep package metadata up to date.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2"
          disabled={!manufacturerUUID || loadingBatches || Boolean(batchesError)}
        >
          <PlusCircle className="h-4 w-4" />
          Create Package
        </Button>
      </header>

      {renderPackages()}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Package</DialogTitle>
            <DialogDescription>Link a new package to its production batch.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="space-y-2">
              <label htmlFor="package-batch" className="text-sm font-medium">
                Batch
              </label>
              <Select
                value={createForm.batchId}
                onValueChange={(value) => setCreateForm((current) => ({ ...current, batchId: value }))}
                disabled={loadingBatches || batchesError}
                required
              >
                <SelectTrigger id="package-batch">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batchOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="package-mac" className="text-sm font-medium">
                Microprocessor MAC
              </label>
              <Input
                id="package-mac"
                placeholder="00:1A:2B:3C:4D:5E"
                value={createForm.microprocessorMac}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, microprocessorMac: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="package-sensors" className="text-sm font-medium">
                Sensors <span className="text-muted-foreground">(comma separated)</span>
              </label>
              <Input
                id="package-sensors"
                placeholder="Temperature, Humidity"
                value={createForm.sensorTypes}
                onChange={(event) => setCreateForm((current) => ({ ...current, sensorTypes: event.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Register package
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingPackage)} onOpenChange={(open) => (!open ? setEditingPackage(null) : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>Update package metadata.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <label htmlFor="edit-package-code" className="text-sm font-medium">
                Package code
              </label>
              <Input
                id="edit-package-code"
                value={editForm.packageCode ?? ""}
                onChange={(event) => setEditForm((current) => ({ ...current, packageCode: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-package-status" className="text-sm font-medium">
                Status
              </label>
              <Input
                id="edit-package-status"
                value={editForm.status ?? ""}
                onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-package-notes" className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                id="edit-package-notes"
                value={editForm.notes ?? ""}
                onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingPackage(null)}>
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

      <Dialog open={Boolean(viewingPackage)} onOpenChange={(open) => (!open ? setViewingPackage(null) : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingPackage?.packageCode || `Package ${viewingPackage?.id}`}</DialogTitle>
            <DialogDescription>Package details</DialogDescription>
          </DialogHeader>
          {viewingPackage ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Batch</p>
                <p className="text-foreground">
                  {viewingPackage.batch?.batchCode ??
                    (viewingPackage.batchId
                      ? batchLookup.get(String(viewingPackage.batchId))?.batchCode ||
                        `Batch ${viewingPackage.batchId}`
                      : "Not linked")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Product</p>
                <p className="text-foreground">
                  {viewingPackage.batch?.product?.name ??
                    viewingPackage.batch?.product?.productName ??
                    (viewingPackage.batchId
                      ? batchLookup.get(String(viewingPackage.batchId))?.product?.productName ??
                        batchLookup.get(String(viewingPackage.batchId))?.product?.name ??
                        "Not linked"
                      : "Not linked")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p className="text-foreground">{viewingPackage.quantity ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quantity available</p>
                <p className="text-foreground">{viewingPackage.quantityAvailable ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="text-foreground">{viewingPackage.status ?? "Not specified"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sensor types</p>
                <p className="text-foreground">{sensorsToLabel(viewingPackage.sensorTypes)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payload hash</p>
                <p className="text-foreground">{viewingPackage.payloadHash ?? "Not available"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Transaction hash</p>
                <p className="text-foreground">{viewingPackage.txHash ?? "Not available"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pinata CID</p>
                <p className="text-foreground break-all">{viewingPackage.pinataCid ?? "Not available"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pinned at</p>
                <p className="text-foreground">{formatDateTime(viewingPackage.pinataPinnedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Microprocessor MAC</p>
                <p className="text-foreground">{viewingPackage.microprocessorMac ?? "Not provided"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p className="text-foreground">{viewingPackage.notes ?? "Not provided"}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="text-foreground">{formatDateTime(viewingPackage.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="text-foreground">{formatDateTime(viewingPackage.updatedAt)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
