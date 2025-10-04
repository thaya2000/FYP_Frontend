import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Package, Thermometer, Syringe, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VaccineProduct } from '@/types';

const vaccineProductSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  manufacturer: z.string().min(2, 'Manufacturer is required').max(100),
  batchNumber: z.string().min(3, 'Batch number is required').max(50),
  lotNumber: z.string().max(50).optional(),
  productionDate: z.date({ message: 'Production date is required' }),
  expirationDate: z.date({ message: 'Expiration date is required' }),
  vaccineType: z.enum(['mRNA', 'Viral Vector', 'Protein Subunit', 'Inactivated', 'Live Attenuated']),
  dosesPerVial: z.coerce.number().min(1, 'Must be at least 1').max(100),
  totalDoses: z.coerce.number().min(1, 'Must be at least 1').max(1000000),
  temperatureMin: z.coerce.number().min(-100).max(50),
  temperatureMax: z.coerce.number().min(-100).max(50),
  temperatureUnit: z.enum(['C', 'F']),
  storageRequirements: z.string().min(10, 'Storage requirements must be at least 10 characters').max(500),
  administrationInstructions: z.string().max(1000).optional(),
}).refine(data => data.expirationDate > data.productionDate, {
  message: "Expiration date must be after production date",
  path: ["expirationDate"],
}).refine(data => data.temperatureMax > data.temperatureMin, {
  message: "Maximum temperature must be greater than minimum temperature",
  path: ["temperatureMax"],
});

type VaccineProductFormData = z.infer<typeof vaccineProductSchema>;

const CreateProduct = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addProduct, user } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VaccineProductFormData>({
    resolver: zodResolver(vaccineProductSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      batchNumber: '',
      lotNumber: '',
      vaccineType: 'mRNA',
      dosesPerVial: 10,
      totalDoses: 1000,
      temperatureMin: -70,
      temperatureMax: -60,
      temperatureUnit: 'C',
      storageRequirements: '',
      administrationInstructions: '',
    },
  });

  const onSubmit = async (data: VaccineProductFormData) => {
    if (!user?.address) {
      toast({
        title: "Error",
        description: "You must be logged in to create a product",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const newProduct: VaccineProduct = {
        id: `VAC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        name: data.name,
        manufacturer: data.manufacturer,
        batchNumber: data.batchNumber,
        lotNumber: data.lotNumber,
        productionDate: format(data.productionDate, 'yyyy-MM-dd'),
        expirationDate: format(data.expirationDate, 'yyyy-MM-dd'),
        vaccineType: data.vaccineType,
        dosesPerVial: data.dosesPerVial,
        totalDoses: data.totalDoses,
        remainingDoses: data.totalDoses,
        qrUri: `vaccine://${data.batchNumber}`,
        creator: user.address,
        currentHolder: user.address,
        status: 'MANUFACTURED',
        temperatureRange: {
          min: data.temperatureMin,
          max: data.temperatureMax,
          unit: data.temperatureUnit,
        },
        storageRequirements: data.storageRequirements,
        administrationInstructions: data.administrationInstructions,
      };

      addProduct(newProduct);

      toast({
        title: "Success",
        description: `Vaccine product "${data.name}" has been created successfully`,
      });

      navigate('/products');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex">
        <Sidebar activeTab="products" onTabChange={(tab) => {
          if (tab === 'products') navigate('/products');
          else if (tab === 'dashboard') navigate('/');
        }} />
        
        <main className="flex-1 p-8">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold">Create New Product</h1>
              <p className="text-muted-foreground">Register a new product in the supply chain</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Syringe className="h-5 w-5" />
                      Product Information
                    </CardTitle>
                    <CardDescription>Core details about the vaccine product</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., COVID-19 mRNA Vaccine" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="manufacturer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manufacturer</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Pfizer-BioNTech" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vaccineType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vaccine Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select vaccine type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="mRNA">mRNA</SelectItem>
                                <SelectItem value="Viral Vector">Viral Vector</SelectItem>
                                <SelectItem value="Protein Subunit">Protein Subunit</SelectItem>
                                <SelectItem value="Inactivated">Inactivated</SelectItem>
                                <SelectItem value="Live Attenuated">Live Attenuated</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="batchNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Batch Number</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., BNT162b2-2024-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lotNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lot Number (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., LOT-2024-A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Dates and Quantities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Dates & Quantities
                    </CardTitle>
                    <CardDescription>Production dates and dosage information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="productionDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Production Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date()}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="expirationDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Expiration Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dosesPerVial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Doses Per Vial</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormDescription>Number of doses in each vial</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="totalDoses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Doses</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormDescription>Total number of doses in this batch</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Temperature & Storage */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5" />
                      Temperature & Storage Requirements
                    </CardTitle>
                    <CardDescription>Cold chain and storage specifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="temperatureMin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Temperature</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="temperatureMax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Temperature</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="temperatureUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="C">Celsius (°C)</SelectItem>
                                <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="storageRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Requirements</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe storage requirements, handling instructions, and cold chain specifications..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Include details about refrigeration, freezing, light exposure, and handling protocols
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Administration Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Administration Instructions (Optional)
                    </CardTitle>
                    <CardDescription>Guidelines for vaccine administration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="administrationInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructions</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide detailed administration instructions, dosage guidelines, reconstitution steps, etc..."
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Include dosage information, route of administration, and any special instructions
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/products')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Vaccine Product'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateProduct;