// Row shapes as returned by Supabase. Amounts are rupees (numeric(12,2)).

export interface BillRow {
  id: string;
  bill_number: number;
  customer_name: string;
  address: string | null;
  phone: string;
  vehicle_reg: string;
  date_received: string;
  expected_pickup: string | null;
  labour_charge: number;
  painting_charge: number | null;
  washing_charge: number | null;
  items_subtotal: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
}

export interface BillItemRow {
  id: string;
  bill_id: string;
  position: number;
  description: string;
  price: number;
}

export interface BillWithItems extends BillRow {
  bill_items: BillItemRow[];
}

export type StaffRole = "owner" | "staff";

export interface StaffMember {
  user_id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  created_at: string;
}

export interface ShopSettings {
  shop_name: string;
  address: string | null;
  phone: string | null;
  allow_zero_labour: boolean;
}
