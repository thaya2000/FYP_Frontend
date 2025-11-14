import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productCategoryService } from "@/services/productCategoryService";
import type { ProductCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";

type CategoryFormState = {
  name: string;
};

const emptyForm: CategoryFormState = {
  name: "",
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
  return `${datePart} · ${timePart}`;
};

export function CategoryManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CategoryFormState>(emptyForm);

  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editForm, setEditForm] = useState<CategoryFormState>(emptyForm);

  const [viewingCategory, setViewingCategory] = useState<ProductCategory | null>(null);

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["productCategories"],
    queryFn: () => productCategoryService.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => productCategoryService.create({ name: createForm.name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productCategories"] });
      setCreateForm(emptyForm);
      setIsCreateDialogOpen(false);
      toast({
        title: "Category created",
        description: "The category was created successfully.",
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: "destructive",
        title: "Failed to create category",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: CategoryFormState }) =>
      productCategoryService.update(payload.id, { name: payload.data.name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productCategories"] });
      setEditingCategory(null);
      setEditForm(emptyForm);
      toast({
        title: "Category updated",
        description: "The category was updated successfully.",
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: "destructive",
        title: "Failed to update category",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.name.trim()) {
      toast({
        variant: "destructive",
        title: "Category name is required",
      });
      return;
    }
    createMutation.mutate();
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCategory) return;
    if (!editForm.name.trim()) {
      toast({
        variant: "destructive",
        title: "Category name is required",
      });
      return;
    }
    updateMutation.mutate({ id: editingCategory.id, data: editForm });
  };

  const tableContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={`category-skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-2 h-4 w-64" />
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
      );
    }

    if (isError) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {(error as Error)?.message ?? "Unable to load categories right now."}
        </div>
      );
    }

    if (categories.length === 0) {
      return (
        <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">
          No categories found. Use the Create Category button to add your first category.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{category.name}</div>
                  {category.description ? (
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingCategory(category)}>
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingCategory(category);
                        setEditForm({
                          name: category.name ?? "",
                        });
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }, [categories, error, isError, isLoading]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Product Categories</h2>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Create Category
        </Button>
      </header>

      {tableContent}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Provide a clear name so your team can reuse this category.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="space-y-2">
              <label htmlFor="category-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="category-name"
                placeholder="e.g. COVID-19 Vaccines"
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingCategory)} onOpenChange={(open) => (!open ? setEditingCategory(null) : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <label htmlFor="edit-category-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="edit-category-name"
                value={editForm.name}
                onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingCategory)} onOpenChange={(open) => (!open ? setViewingCategory(null) : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewingCategory?.name}</DialogTitle>
            <DialogDescription>Category details</DialogDescription>
          </DialogHeader>
          {viewingCategory ? (
            <div className="space-y-4">
              {viewingCategory.description ? (
                <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  {viewingCategory.description}
                </div>
              ) : null}
              <div className="grid gap-3 text-sm">
                {[
                  { label: "Created", value: formatDetailedDateTime(viewingCategory.createdAt) },
                  { label: "Updated", value: formatDetailedDateTime(viewingCategory.updatedAt) },
                ].map((detail) => (
                  <div
                    key={detail.label}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3"
                  >
                    <span className="text-muted-foreground">{detail.label}</span>
                    <span className="font-medium text-foreground">{detail.value}</span>
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
