export type Role = 'MANUFACTURER' | 'SUPPLIER' | 'WHOLESALER' | 'TRANSPORTER' | 'WAREHOUSE' | 'RETAILER' | 'END_USER';

export interface UserProfile {
  id: string;
  address: `0x${string}`;
  role: Role;
  displayName?: string;
  email?: string;
  company?: string;
}

export interface ProductMeta {
  id: string;
  name: string;
  sku?: string;
  batch?: string;
  mfgDate?: string;
  qrUri: string;
  ipfsCid?: string;
  creator: `0x${string}`;
  currentHolder?: `0x${string}`;
  status: 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'VERIFIED';
}

export interface TelemetryPoint {
  ts: number;
  lat: number;
  lng: number;
  tempC?: number;
  doorOpen?: boolean;
  speed?: number;
  altitude?: number;
}

export interface CustodyEvent {
  ts: number;
  from?: `0x${string}`;
  to: `0x${string}`;
  note?: string;
  txHash?: `0x${string}`;
  checkpoint?: string;
  location?: string;
}

export interface Alert {
  id: string;
  productId: string;
  level: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
  ts: number;
  acknowledged?: boolean;
}

export interface Shipment {
  id: string;
  productIds: string[];
  from: `0x${string}`;
  to: `0x${string}`;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
  createdAt: number;
  estimatedDelivery?: number;
  route?: { lat: number; lng: number; name: string }[];
}

export interface TemperatureThreshold {
  min: number;
  max: number;
  unit: 'C' | 'F';
}

export interface DashboardStats {
  totalProducts: number;
  activeShipments: number;
  alertsCount: number;
  deliveredToday: number;
}