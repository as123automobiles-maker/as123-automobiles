import { FunctionsHttpError } from "@supabase/supabase-js";
import type { SaveBillPayload } from "./bill";
import { supabase } from "./supabase";
import type { BillRow, BillWithItems, ShopSettings, StaffMember, StaffRole } from "./types";

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

export async function listStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("user_id, email, full_name, role, created_at")
    .order("role")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as StaffMember[];
}

/** Calls the owner-only manage-staff Edge Function and surfaces its error message. */
async function manageStaff(body: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.functions.invoke("manage-staff", { body });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    let payload: { error?: string } | null = null;
    try {
      payload = await error.context.json();
    } catch {
      /* not JSON */
    }
    if (payload?.error) throw new Error(payload.error);
  }
  throw new Error(
    /failed to send|not found|fetch/i.test(error.message)
      ? "The user management service isn't set up yet (see README: Edge Function)."
      : error.message,
  );
}

export function addStaff(input: { full_name: string; email: string; password: string; role: StaffRole }) {
  return manageStaff({ action: "create", ...input });
}

export function removeStaff(userId: string) {
  return manageStaff({ action: "remove", user_id: userId });
}

export function resetStaffPassword(userId: string, password: string) {
  return manageStaff({ action: "reset_password", user_id: userId, password });
}
