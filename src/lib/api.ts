import { FunctionsHttpError } from "@supabase/supabase-js";
import type { SaveBillPayload } from "./bill";
import type { ComplaintPayload } from "./complaint";
import { supabase } from "./supabase";
import type {

  BillWithComplaints,
  BillWithItems,
  ComplaintRow,
  ComplaintStatus,
  ComplaintWithBills,
  ShopSettings,
  StaffMember,
  StaffRole,
} from "./types";

// Embedded relations (bills <-> complaints go through bill_complaints).
const COMPLAINT_SUMMARY = "complaints(id, complaint_number, description, status, attended_by, reported_on)";
const BILL_SUMMARY = "bills(id, bill_number, date_received, grand_total)";

/** Creates a bill (no id) or replaces a saved one. Totals are calculated by the database. */
export async function saveBill(payload: SaveBillPayload, id?: string): Promise<string> {
  const { data, error } = await supabase.rpc("save_bill", {
    p_bill: payload.bill,
    p_items: payload.items,
    p_id: id ?? null,
    p_complaint_ids: payload.complaintIds,
  });
  if (error) throw error;
  return data as string;
}

export async function getBill(id: string): Promise<BillWithItems | null> {
  const { data, error } = await supabase
    .from("bills")
    .select(`*, bill_items(*), ${COMPLAINT_SUMMARY}`)
    .eq("id", id)
    .order("position", { referencedTable: "bill_items" })
    .maybeSingle();
  if (error) throw error;
  return data as BillWithItems | null;
}

/** Matches customer name, phone or vehicle number. Empty query = most recent bills. */
export async function searchBills(q: string): Promise<BillWithComplaints[]> {
  const { data, error } = await supabase.rpc("search_bills", { q }).select(`*, ${COMPLAINT_SUMMARY}`);
  if (error) throw error;
  return (data ?? []) as BillWithComplaints[];
}

/** Same matching as searchBills. Empty query = most recent complaints. */
export async function searchComplaints(q: string): Promise<ComplaintWithBills[]> {
  const { data, error } = await supabase.rpc("search_complaints", { q }).select(`*, ${BILL_SUMMARY}`);
  if (error) throw error;
  return (data ?? []) as ComplaintWithBills[];
}

/** All complaints and bills for one vehicle (by normalised registration key). */
export async function vehicleHistory(key: string): Promise<{ complaints: ComplaintWithBills[]; bills: BillWithComplaints[] }> {
  const [complaints, bills] = await Promise.all([
    supabase.from("complaints").select(`*, ${BILL_SUMMARY}`).eq("vehicle_reg_key", key),
    supabase.from("bills").select(`*, ${COMPLAINT_SUMMARY}`).eq("vehicle_reg_key", key),
  ]);
  if (complaints.error) throw complaints.error;
  if (bills.error) throw bills.error;
  return {
    complaints: (complaints.data ?? []) as ComplaintWithBills[],
    bills: (bills.data ?? []) as BillWithComplaints[],
  };
}

/** Complaints for one vehicle, for linking to a bill: open first, then newest. */
export async function complaintsForVehicle(key: string): Promise<ComplaintWithBills[]> {
  const { data, error } = await supabase
    .from("complaints")
    .select(`*, ${BILL_SUMMARY}`)
    .eq("vehicle_reg_key", key)
    .order("status")
    .order("reported_on", { ascending: false })
    .order("complaint_number", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ComplaintWithBills[];
}

/** The customer details from this vehicle's most recent bill or complaint, if any. */
export async function lastCustomerForVehicle(
  key: string,
): Promise<{ customer_name: string; phone: string; address: string | null; vehicle_reg: string } | null> {
  const cols = "customer_name, phone, address, vehicle_reg, created_at";
  const [b, c] = await Promise.all([
    supabase.from("bills").select(cols).eq("vehicle_reg_key", key).order("created_at", { ascending: false }).limit(1),
    supabase.from("complaints").select(cols).eq("vehicle_reg_key", key).order("created_at", { ascending: false }).limit(1),
  ]);
  if (b.error) throw b.error;
  if (c.error) throw c.error;
  const latest = [...(b.data ?? []), ...(c.data ?? [])].sort((x, y) => (x.created_at < y.created_at ? 1 : -1))[0];
  return latest ?? null;
}

export async function getComplaint(id: string): Promise<ComplaintWithBills | null> {
  const { data, error } = await supabase
    .from("complaints")
    .select(`*, ${BILL_SUMMARY}`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ComplaintWithBills | null;
}

export async function createComplaint(payload: ComplaintPayload): Promise<string> {
  const { data, error } = await supabase.from("complaints").insert(payload).select("id").single();
  if (error) throw error;
  return (data as Pick<ComplaintRow, "id">).id;
}

export async function updateComplaint(id: string, payload: ComplaintPayload): Promise<void> {
  const { error } = await supabase
    .from("complaints")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function setComplaintStatus(id: string, status: ComplaintStatus): Promise<void> {
  const { error } = await supabase
    .from("complaints")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Staff names for the "Attended by" suggestions. */
export async function staffNames(): Promise<string[]> {
  const { data, error } = await supabase.rpc("staff_names");
  if (error) throw error;
  return ((data ?? []) as { full_name: string }[]).map((r) => r.full_name);
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
