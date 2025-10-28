export type Role =
  | "MANUFACTURER"
  | "DISTRIBUTOR"
  | "HEALTHCARE_PROVIDER"
  | "VACCINATION_CENTER"
  | "COLD_STORAGE"
  | "TRANSPORTER"
  | "REGULATORY";

export interface UserProfile {
  id: string;
  address: `0x${string}`;
  role: Role;
  displayName?: string;
  email?: string;
  organization?: string;
  licenseNumber?: string;
  certifications?: string[];
}

export type VaccineProductStatus = string;

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  productName: string;
  productCategoryId: string;
  productCategoryName?: string;
  requiredStartTemp?: string;
  requiredEndTemp?: string;
  handlingInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields retained for mock data and backward compatibility
  name?: string;
  manufacturer?: string;
  batchNumber?: string;
  lotNumber?: string;
  productionDate?: string;
  expirationDate?: string;
  vaccineType?: string;
  dosesPerVial?: number;
  totalDoses?: number;
  remainingDoses?: number;
  qrUri?: string;
  creator?: string;
  currentHolder?: string;
  status?: string;
  temperatureRange?: {
    min: number;
    max: number;
    unit?: string;
  };
  storageRequirements?: string;
  administrationInstructions?: string;
}

export type VaccineProduct = Product;

export interface ProductBatchSummary {
  id: string;
  productId?: string;
  productCategoryId?: string;
  manufacturerUUID?: string;
  facility?: string;
  productionWindow?: string;
  productionStart?: string;
  productionEnd?: string;
  productionStartTime?: string;
  productionEndTime?: string;
  batchCode?: string;
  releaseStatus?: string;
  quantityProduced?: string | number;
  expiryDate?: string;
  handlingInstructions?: string;
  requiredStartTemp?: string;
  requiredEndTemp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPackage {
  id: string;
  batchId: string;
  packageCode?: string;
  quantity?: number;
  quantityAvailable?: number;
  unit?: string;
  status?: string;
  notes?: string;
  manufacturerUUID?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ColdChainPoint {
  ts: number;
  lat: number;
  lng: number;
  tempC: number;
  humidity?: number;
  doorOpen?: boolean;
  speed?: number;
  altitude?: number;
  facilityId?: string;
  equipmentId?: string;
  compliant: boolean;
  alertTriggered?: boolean;
}

export interface CustodyEvent {
  ts: number;
  from?: `0x${string}`;
  to: `0x${string}`;
  note?: string;
  txHash?: `0x${string}`;
  checkpoint?: string;
  location?: string;
  facilityType?:
    | "MANUFACTURING"
    | "COLD_STORAGE"
    | "DISTRIBUTION_CENTER"
    | "HEALTHCARE_FACILITY"
    | "VACCINATION_SITE";
  handoverDocuments?: string[];
  temperatureAtHandover?: number;
}

export interface VaccineAlert {
  id: string;
  productId: string;
  level: "INFO" | "WARN" | "CRITICAL" | "EMERGENCY";
  type:
    | "TEMPERATURE_BREACH"
    | "EXPIRATION_WARNING"
    | "COLD_CHAIN_BREAK"
    | "RECALL"
    | "LOW_STOCK"
    | "EQUIPMENT_FAILURE";
  message: string;
  ts: number;
  acknowledged?: boolean;
  location?: string;
  actionRequired?: string;
  escalationLevel?: number;
}

export interface VaccineShipment {
  id: string;
  productIds: string[];
  from: `0x${string}`;
  to: `0x${string}`;
  status:
    | "PREPARING"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "DELAYED"
    | "TEMPERATURE_COMPROMISED";
  createdAt: number;
  estimatedDelivery?: number;
  actualDelivery?: number;
  route?: {
    lat: number;
    lng: number;
    name: string;
    facilityType?: string;
  }[];
  transportMode: "REFRIGERATED_TRUCK" | "AIR_CARGO" | "COURIER" | "DRONE";
  temperatureLog: ColdChainPoint[];
  driver?: string;
  vehicleId?: string;
  emergencyContact?: string;
}

export interface TemperatureThreshold {
  min: number;
  max: number;
  unit: "C" | "F";
  vaccineType?: string;
  criticalMin?: number;
  criticalMax?: number;
}

export interface VaccineDashboardStats {
  totalVaccines: number;
  activeColdChains: number;
  criticalAlerts: number;
  dosesAdministeredToday: number;
  dosesExpiringSoon: number;
  temperatureCompliance: number;
  facilitiesMonitored: number;
  recallsActive: number;
}

export interface VaccinationRecord {
  id: string;
  patientId?: string;
  vaccineProductId: string;
  batchNumber: string;
  administeredBy: `0x${string}`;
  administrationDate: number;
  facilityId: string;
  doseNumber: number;
  nextDueDate?: number;
  adverseEvents?: string[];
  verified: boolean;
}

// Legacy aliases
export type ProductMeta = VaccineProduct;
export type TelemetryPoint = ColdChainPoint;
export type Alert = VaccineAlert;
export type Shipment = VaccineShipment;
export type DashboardStats = VaccineDashboardStats;
