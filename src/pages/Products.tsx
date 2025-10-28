import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productRegistryService } from "@/services/productService";
import { productCategoryService } from "@/services/productCategoryService";
import type { Product, ProductCategory } from "@/types";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const filterBySearch = (products: Product[], term: string) => {
  const query = term.toLowerCase();
  if (!query) return products;

  return products.filter((product) => {
    const categoryName = product.productCategoryName ?? "";
    return (
      product.productName.toLowerCase().includes(query) ||
      categoryName.toLowerCase().includes(query)
    );
  });
};

export default function Products() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAppStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: categories = [], isLoading: loadingCategories } = useQuery<ProductCategory[]>({
    queryKey: ["productCategories"],
    queryFn: () => productCategoryService.list(),
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["products", categoryFilter],
    queryFn: () =>
      productRegistryService.getAllProducts(
        categoryFilter ? { categoryId: categoryFilter } : undefined,
      ),
  });

  const categoryLookup = useMemo(
    () =>
      categories.reduce<Record<string, string>>((acc, category) => {
        acc[category.id] = category.name;
        return acc;
      }, {}),
    [categories],
  );

  const filteredProducts = useMemo(
    () => filterBySearch(products, searchTerm.trim()),
    [products, searchTerm],
  );

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["productCategories"] }),
    ]);
    toast({ title: "Product list refreshed" });
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value === "ALL" ? "" : value);
  };

  const categorySelectValue = categoryFilter || "ALL";

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">
              Browse registered products, filter by category, and review handling requirements.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              Refresh
            </Button>
            {user?.role === "MANUFACTURER" && (
              <Button className="gap-2" onClick={() => navigate("/products/create")}>
                <Plus className="h-4 w-4" />
                Create Product
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by product name or category..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              {loadingCategories ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading categories...
                </div>
              ) : (
                <Select value={categorySelectValue} onValueChange={handleCategoryFilterChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All categories" />
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
              )}
            </div>
          </CardContent>
        </Card>

        {loadingProducts ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading products...
            </CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {products.length === 0
                ? "No products found. Create your first product to get started."
                : "No products match your filters."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{product.productName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">Category</p>
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
                    <p className="text-muted-foreground text-xs uppercase">Handling Instructions</p>
                    <p className="font-medium whitespace-pre-wrap">{product.handlingInstructions ?? "—"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
