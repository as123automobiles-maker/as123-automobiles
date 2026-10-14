import type { SaveBillPayload } from "./bill";
import { supabase } from "./supabase";
import type { BillRow, BillWithItems, ShopSettings } from "./types";

/** Creates a bill (no id) or replaces a saved one. Totals are calculated by the database. */
export async function saveBill(payload: SaveBillPayload, id?: string): Promise<string> {
  const { data, error } = await supabase.rpc("save_bill", {
    p_bill: payload.bill,
    p_items: payload.items,
    p_id: id ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function getBill(id: string): Promise<BillWithItems | null> {
  const { data, error } = await supabase
    .from("bills")
    .select("*, bill_items(*)")
    .eq("id", id)
    .order("position", { referencedTable: "bill_items" })
    .maybeSingle();
  if (error) throw error;
  return data as BillWithItems | null;
}

/** Matches customer name, phone or vehicle number. Empty query = most recent bills. */
export async function searchBills(q: string): Promise<BillRow[]> {
  const { data, error } = await supabase.rpc("search_bills", { q });
  if (error) throw error;
  return (data ?? []) as BillRow[];
}

export async function getShopSettings(): Promise<ShopSettings> {
  const { data, error } = await supabase
    .from("shop_settings")
    .select("shop_name, address, phone, allow_zero_labour")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data as ShopSettings;
}

export async function updateShopSettings(s: ShopSettings): Promise<void> {
  const { error } = await supabase
    .from("shop_settings")
    .update({ ...s, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}
