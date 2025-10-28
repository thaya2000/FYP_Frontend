import type { VaccineProduct, ColdChainPoint, VaccineAlert, UserProfile, CustodyEvent, VaccineShipment } from '@/types';

export const mockUsers: UserProfile[] = [
  {
    id: '1',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    role: 'MANUFACTURER',
    displayName: 'Pfizer Manufacturing',
    email: 'manufacturer@vaccine.com',
    organization: 'Pfizer Pharmaceuticals',
    licenseNumber: 'MFG-001-2024',
    certifications: ['WHO-GMP', 'FDA-Approved']
  },
  {
    id: '2',
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    role: 'DISTRIBUTOR',
    displayName: 'VaccineDist Global',
    organization: 'Global Vaccine Distribution Corp',
    licenseNumber: 'DIST-002-2024'
  },
  {
    id: '3',
    address: '0xfedcba0987654321fedcba0987654321fedcba09',
    role: 'HEALTHCARE_PROVIDER',
    displayName: 'City Health Center',
    organization: 'Metropolitan Health Network',
    licenseNumber: 'HCP-003-2024'
  }
];

export const mockProducts: VaccineProduct[] = [
  {
    id: "VAC-001",
    productName: "Pfizer-BioNTech COVID-19 Vaccine",
    productCategoryId: "CAT-VACCINE",
    productCategoryName: "Vaccine",
    requiredStartTemp: "-80C",
    requiredEndTemp: "-60C",
    handlingInstructions: "Thaw and dilute before administration. Use within 6 hours.",
    manufacturer: "Pfizer-BioNTech",
    batchNumber: "PF-2024-001",
    lotNumber: "LOT-ABC123",
    productionDate: "2024-01-15",
    expirationDate: "2024-07-15",
    vaccineType: "mRNA",
    dosesPerVial: 6,
    totalDoses: 1200,
    remainingDoses: 1200,
    qrUri: "https://vaccine-track.example.com/qr/VAC-001",
    creator: "0x1234567890abcdef1234567890abcdef12345678",
    currentHolder: "0xabcdef1234567890abcdef1234567890abcdef12",
    status: "IN_COLD_STORAGE",
    temperatureRange: {
      min: -80,
      max: -60,
      unit: "C",
    },
    storageRequirements: "Ultra-low temperature freezer (-80Ã‚Â°C to -60Ã‚Â°C)",
    administrationInstructions: "Thaw and dilute before administration. Use within 6 hours.",
  },
  {
    id: "VAC-002",
    productName: "Moderna COVID-19 Vaccine",
    productCategoryId: "CAT-VACCINE",
    productCategoryName: "Vaccine",
    requiredStartTemp: "-25C",
    requiredEndTemp: "-15C",
    handlingInstructions: "Thaw before use. Stable at 2-8Ã‚Â°C for 30 days.",
    manufacturer: "Moderna",
    batchNumber: "MOD-2024-002",
    lotNumber: "LOT-XYZ789",
    productionDate: "2024-02-01",
    expirationDate: "2024-08-01",
    vaccineType: "mRNA",
    dosesPerVial: 10,
    totalDoses: 2000,
    remainingDoses: 1850,
    qrUri: "https://vaccine-track.example.com/qr/VAC-002",
    creator: "0x1234567890abcdef1234567890abcdef12345678",
    currentHolder: "0xfedcba0987654321fedcba0987654321fedcba09",
    status: "AT_FACILITY",
    temperatureRange: {
      min: -25,
      max: -15,
      unit: "C",
    },
    storageRequirements: "Ultra-low temperature freezer (-80Ã‚Â°C to -60Ã‚Â°C)",
    administrationInstructions: "Thaw before use. Stable at 2-8Ãƒâ€šÃ‚Â°C for 30 days.",
  },
];

export const generateMockColdChain = (productId: string, hours: number = 24): ColdChainPoint[] => {
  const points: ColdChainPoint[] = [];
  const now = Date.now();
  const baseLocation = { lat: 40.7128, lng: -74.0060 }; // NYC
  
  // Get vaccine-specific temperature requirements
  const vaccine = mockProducts.find(p => p.id === productId);
  const targetTemp = vaccine ? (vaccine.temperatureRange.min + vaccine.temperatureRange.max) / 2 : -70;
  const tempVariance = 2;
  
  for (let i = 0; i < hours * 6; i++) { // Every 10 minutes
    const timestamp = now - (hours * 60 * 60 * 1000) + (i * 10 * 60 * 1000);
    const progress = i / (hours * 6);
    
    const currentTemp = targetTemp + Math.sin(progress * Math.PI * 2) * tempVariance + (Math.random() - 0.5) * 1;
    const isCompliant = vaccine ? 
      currentTemp >= vaccine.temperatureRange.min && currentTemp <= vaccine.temperatureRange.max :
      true;
    
    points.push({
      ts: timestamp,
      lat: baseLocation.lat + (Math.random() - 0.5) * 0.1 + progress * 0.05,
      lng: baseLocation.lng + (Math.random() - 0.5) * 0.1 + progress * 0.08,
      tempC: currentTemp,
      humidity: 45 + (Math.random() - 0.5) * 10,
      doorOpen: Math.random() < 0.02, // 2% chance door is open
      speed: Math.random() * 60 + 40, // 40-100 km/h
      altitude: 100 + Math.random() * 50,
      facilityId: `FACILITY-${Math.floor(progress * 3) + 1}`,
      equipmentId: `FREEZER-${String.fromCharCode(65 + Math.floor(progress * 3))}1`,
      compliant: isCompliant,
      alertTriggered: !isCompliant && Math.random() < 0.8
    });
  }
  
  return points;
};

export const mockAlerts: VaccineAlert[] = [
  {
    id: 'ALT-001',
    productId: 'VAC-001',
    level: 'WARN',
    type: 'TEMPERATURE_BREACH',
    message: 'Temperature above optimal range (-65ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°C)',
    ts: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    acknowledged: false,
    location: 'Cold Storage Facility A',
    actionRequired: 'Monitor temperature closely'
  },
  {
    id: 'ALT-002',
    productId: 'VAC-002',
    level: 'INFO',
    type: 'LOW_STOCK',
    message: 'Vaccine inventory below threshold',
    ts: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
    acknowledged: true,
    location: 'Distribution Center B'
  },
  {
    id: 'ALT-003',
    productId: 'VAC-001',
    level: 'CRITICAL',
    type: 'COLD_CHAIN_BREAK',
    message: 'Critical temperature breach detected',
    ts: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
    acknowledged: false,
    location: 'Transport Vehicle TR-001',
    actionRequired: 'Immediate intervention required',
    escalationLevel: 3
  },
  {
    id: 'ALT-004',
    productId: 'VAC-003',
    level: 'WARN',
    type: 'EXPIRATION_WARNING',
    message: 'Vaccines expiring within 30 days',
    ts: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
    acknowledged: false,
    location: 'Healthcare Facility C',
    actionRequired: 'Prioritize administration'
  }
];

export const mockCustodyEvents: CustodyEvent[] = [
  {
    ts: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    from: undefined,
    to: '0x1234567890abcdef1234567890abcdef12345678',
    note: 'Vaccine batch manufactured and quality tested',
    txHash: '0xvac123...',
    checkpoint: 'Pfizer Manufacturing Plant',
    location: 'Kalamazoo, MI',
    facilityType: 'MANUFACTURING',
    temperatureAtHandover: -75
  },
  {
    ts: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    from: '0x1234567890abcdef1234567890abcdef12345678',
    to: '0xabcdef1234567890abcdef1234567890abcdef12',
    note: 'Handover to cold chain distributor',
    txHash: '0xvac456...',
    checkpoint: 'Cold Storage Distribution Hub',
    location: 'Memphis, TN',
    facilityType: 'COLD_STORAGE',
    handoverDocuments: ['COA', 'COC', 'Temperature Log'],
    temperatureAtHandover: -78
  },
  {
    ts: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    from: '0xabcdef1234567890abcdef1234567890abcdef12',
    to: '0xfedcba0987654321fedcba0987654321fedcba09',
    note: 'Delivered to healthcare facility',
    txHash: '0xvac789...',
    checkpoint: 'Metropolitan Health Network',
    location: 'New York, NY',
    facilityType: 'HEALTHCARE_FACILITY',
    temperatureAtHandover: -76
  }
];

export const mockShipments: VaccineShipment[] = [
  {
    id: 'SHIP-001',
    productIds: ['VAC-001', 'VAC-002'],
    from: '0x1234567890abcdef1234567890abcdef12345678',
    to: '0xfedcba0987654321fedcba0987654321fedcba09',
    status: 'IN_TRANSIT',
    createdAt: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
    estimatedDelivery: Date.now() + 6 * 60 * 60 * 1000, // 6 hours from now
    transportMode: 'REFRIGERATED_TRUCK',
    temperatureLog: generateMockColdChain('VAC-001', 12),
    driver: 'Sarah Johnson',
    vehicleId: 'REF-TRUCK-007',
    emergencyContact: '+1-800-VACCINE',
    route: [
      { lat: 42.3314, lng: -85.2074, name: 'Pfizer Manufacturing - Kalamazoo', facilityType: 'MANUFACTURING' },
      { lat: 41.8781, lng: -87.6298, name: 'Distribution Hub - Chicago', facilityType: 'DISTRIBUTION_CENTER' },
      { lat: 40.7128, lng: -74.0060, name: 'Metro Health Network - NYC', facilityType: 'HEALTHCARE_FACILITY' }
    ]
  }
];

// Utility function to generate continuous cold chain telemetry stream
export class MockColdChainStream {
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: ((point: ColdChainPoint) => void)[] = [];
  private productId: string;
  private currentLocation = { lat: 40.7128, lng: -74.0060 };

  constructor(productId: string) {
    this.productId = productId;
  }

  start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      // Simulate movement
      this.currentLocation.lat += (Math.random() - 0.5) * 0.001;
      this.currentLocation.lng += (Math.random() - 0.5) * 0.001;

      const vaccine = mockProducts.find(p => p.id === this.productId);
      const targetTemp = vaccine ? (vaccine.temperatureRange.min + vaccine.temperatureRange.max) / 2 : -70;
      const currentTemp = targetTemp + Math.sin(Date.now() / 60000) * 2 + (Math.random() - 0.5) * 1;
      
      const isCompliant = vaccine ? 
        currentTemp >= vaccine.temperatureRange.min && currentTemp <= vaccine.temperatureRange.max :
        true;

      const point: ColdChainPoint = {
        ts: Date.now(),
        lat: this.currentLocation.lat,
        lng: this.currentLocation.lng,
        tempC: currentTemp,
        humidity: 45 + (Math.random() - 0.5) * 5,
        doorOpen: Math.random() < 0.01, // 1% chance
        speed: Math.random() * 20 + 50,
        altitude: 100 + Math.random() * 30,
        facilityId: 'MOBILE-UNIT',
        equipmentId: 'PORTABLE-FREEZER-001',
        compliant: isCompliant,
        alertTriggered: !isCompliant
      };

      this.callbacks.forEach(callback => callback(point));
    }, 5000); // Every 5 seconds
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onData(callback: (point: ColdChainPoint) => void) {
    this.callbacks.push(callback);
  }

  removeCallback(callback: (point: ColdChainPoint) => void) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }
}

// Legacy aliases for backward compatibility
export const generateMockTelemetry = generateMockColdChain;
export const MockTelemetryStream = MockColdChainStream;