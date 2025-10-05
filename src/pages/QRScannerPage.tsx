import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { QRScanner } from '@/components/qr/QRScanner';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { QrCode, Scan, Package, Calendar, Thermometer, MapPin } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

export default function QRScannerPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedProductId, setScannedProductId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';
  const products = useAppStore((state) => state.products);

  const scannedProduct = scannedProductId
    ? products.find((p) => p.id === scannedProductId)
    : null;

  const handleScan = (data: string) => {
    setScannedProductId(data);
    setShowScanner(false);
    
    const product = products.find((p) => p.id === data);
    if (product) {
      toast({
        title: 'Product Found',
        description: `Scanned: ${product.name}`,
      });
    } else {
      toast({
        title: 'Product Not Found',
        description: 'No product matches this QR code',
        variant: 'destructive',
      });
    }
  };

  const recentScans = products.slice(0, 3);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/${tab}`)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">QR Code Management</h1>
              <p className="text-muted-foreground">
                Scan or generate QR codes for vaccine product tracking
              </p>
            </div>

            <Tabs defaultValue="scan" className="space-y-4">
              <TabsList>
                <TabsTrigger value="scan">
                  <Scan className="h-4 w-4 mr-2" />
                  Scan QR Code
                </TabsTrigger>
                <TabsTrigger value="generate">
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Scan Product QR Code</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        onClick={() => setShowScanner(true)}
                        className="w-full gap-2"
                        size="lg"
                      >
                        <Scan className="h-5 w-5" />
                        Start Scanner
                      </Button>

                      {scannedProduct && (
                        <div className="space-y-4 mt-6">
                          <Separator />
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Scanned Product Details</h3>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <Package className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Product Name</p>
                                  <p className="font-medium">{scannedProduct.name}</p>
                                </div>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className="h-5 w-5 mt-0.5 text-muted-foreground flex items-center justify-center text-xs font-bold">
                                  #
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Batch Number</p>
                                  <p className="font-medium">{scannedProduct.batchNumber}</p>
                                </div>
                              </div>

                              <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Expiration Date</p>
                                  <p className="font-medium">
                                    {new Date(scannedProduct.expirationDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-3">
                                <Thermometer className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Storage Temperature</p>
                                  <p className="font-medium">
                                    {scannedProduct.temperatureRange.min}°{scannedProduct.temperatureRange.unit} to {scannedProduct.temperatureRange.max}°{scannedProduct.temperatureRange.unit}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Storage Requirements</p>
                                  <p className="font-medium">{scannedProduct.storageRequirements}</p>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Status</p>
                                <Badge variant={scannedProduct.status === 'ADMINISTERED' ? 'default' : 'secondary'}>
                                  {scannedProduct.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Scans</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {recentScans.map((product) => (
                        <div
                          key={product.id}
                          className="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => setScannedProductId(product.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{product.name}</span>
                            <Badge variant="outline">{product.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Batch: {product.batchNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {product.manufacturer}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="generate" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Product</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            scannedProductId === product.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => setScannedProductId(product.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{product.name}</span>
                            <Badge variant="outline">{product.vaccineType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Batch: {product.batchNumber}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Generated QR Code</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {scannedProductId ? (
                        <QRCodeGenerator
                          data={scannedProductId}
                          title={scannedProduct?.name}
                          size={256}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          <div className="text-center">
                            <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Select a product to generate QR code</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Scan Vaccine Product"
        />
      )}
    </div>
  );
}
