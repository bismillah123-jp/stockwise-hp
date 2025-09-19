export interface DashboardStats {
  todaySales: number;
  totalNightStock: number;
  incomingHP: number;
  discrepancies: number;
}

export interface StockEntry {
  id: string;
  date: string;
  imei: string | null;
  morning_stock: number;
  night_stock: number;
  incoming: number;
  add_stock: number;
  returns: number;
  sold: number;
  adjustment: number;
  notes: string | null;
  location_id: string;
  phone_model_id: string;
  stock_locations: {
    name: string;
  };
  phone_models: {
    brand: string;
    model: string;
    storage_capacity: string | null;
    color: string | null;
  };
}

export interface PhoneModel {
  id: string;
  brand: string;
  model: string;
  storage_capacity: string | null;
  color: string | null;
}

export interface Location {
  id: string;
  name: string;
  description?: string | null;
}

export interface TrendData {
  date: string;
  sales: number;
  incoming: number;
  stock: number;
}

export interface BrandData {
  brand: string;
  stock: number;
  sales: number;
}
