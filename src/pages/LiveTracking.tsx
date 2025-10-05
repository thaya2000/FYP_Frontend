import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { MapTracker } from '@/components/map/MapTracker';
import { TelemetryChart } from '@/components/charts/TelemetryChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TelemetryPoint } from '@/types';
import { Thermometer, MapPin, Clock, Package } from 'lucide-react';

const mockTelemetryData: TelemetryPoint[] = [
  { lat: 40.7128, lng: -74.0060, tempC: 4.2, ts: Date.now() - 3600000, compliant: true },
  { lat: 40.7580, lng: -73.9855, tempC: 3.8, ts: Date.now() - 2700000, compliant: true },
  { lat: 40.7614, lng: -73.9776, tempC: 4.5, ts: Date.now() - 1800000, compliant: true },
  { lat: 40.7489, lng: -73.9680, tempC: 3.5, ts: Date.now() - 900000, compliant: true },
  { lat: 40.7306, lng: -73.9352, tempC: 4.1, ts: Date.now(), compliant: true },
];

const activeShipments = [
  {
    id: 'SHP-001',
    product: 'Pfizer-BioNTech COVID-19',
    batchNumber: 'PF-2024-001',
    currentTemp: 4.1,
    status: 'in-transit',
    destination: 'NYC Health Center',
    eta: '2 hours'
  },
  {
    id: 'SHP-002',
    product: 'Moderna COVID-19',
    batchNumber: 'MD-2024-015',
    currentTemp: -18.5,
    status: 'in-transit',
    destination: 'Boston Medical',
    eta: '4 hours'
  }
];

export default function LiveTracking() {
  const [selectedShipment, setSelectedShipment] = useState(activeShipments[0]);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/${tab}`)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Live Tracking</h1>
              <p className="text-muted-foreground">
                Monitor vaccine shipments in real-time with GPS and temperature tracking
              </p>
            </div>

            <Tabs defaultValue="map" className="space-y-4">
              <TabsList>
                <TabsTrigger value="map">Map View</TabsTrigger>
                <TabsTrigger value="telemetry">Temperature Monitor</TabsTrigger>
              </TabsList>

              <TabsContent value="map" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Shipment Location</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[500px]">
                          <MapTracker telemetryData={mockTelemetryData} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Active Shipments</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {activeShipments.map((shipment) => (
                          <div
                            key={shipment.id}
                            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                              selectedShipment.id === shipment.id
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-accent'
                            }`}
                            onClick={() => setSelectedShipment(shipment)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">{shipment.id}</span>
                              <Badge variant="outline">
                                {shipment.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {shipment.product}
                            </p>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Thermometer className="h-4 w-4" />
                                <span>{shipment.currentTemp}°C</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{shipment.destination}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>ETA: {shipment.eta}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Shipment Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Product</p>
                            <p className="font-medium">{selectedShipment.product}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Batch Number</p>
                          <p className="font-medium">{selectedShipment.batchNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current Temperature</p>
                          <p className="font-medium text-2xl">{selectedShipment.currentTemp}°C</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className="mt-1">{selectedShipment.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="telemetry" className="space-y-4">
                <TelemetryChart
                  data={mockTelemetryData}
                  temperatureUnit="C"
                  minTemp={2}
                  maxTemp={8}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
