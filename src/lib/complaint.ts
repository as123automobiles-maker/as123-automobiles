import { emptyCustomer, ISO_DATE, todayISO, validateCustomer, type CustomerFields, type FieldErrors } from "./customer";
import type { ComplaintRow, ComplaintStatus } from "./types";

/** The complaint form's state, exactly as typed. */
export interface ComplaintDraft extends CustomerFields {
  description: string;
  reportedOn: string;
  attendedBy: string;
  notes: string;
  status: ComplaintStatus;
}

export function emptyComplaint(attendedBy = "", customer: Partial<CustomerFields> = {}): ComplaintDraft {
  return {
    ...emptyCustomer(),
    ...customer,
    description: "",
    reportedOn: todayISO(),
    attendedBy,
    notes: "",
    status: "open",
  };
}

export interface ComplaintPayload {
  customer_name: string;
  address: string | null;
  phone: string;
  vehicle_reg: string;
  description: string;
  reported_on: string;
  attended_by: string;
  notes: string | null;
  status: ComplaintStatus;
}

export function validateComplaint(d: ComplaintDraft): { errors: FieldErrors; payload: ComplaintPayload | null } {
  const errors: FieldErrors = {};
  const customer = validateCustomer(d, errors);

  const description = d.description.trim();
  if (!description) errors.description = "Describe the customer's complaint.";
  else if (description.length > 1000) errors.description = "Too long (1000 characters max).";

  if (!ISO_DATE.test(d.reportedOn)) errors.reportedOn = "Choose the date the complaint was reported.";
  else if (d.reportedOn > todayISO()) errors.reportedOn = "The reported date can't be in the future.";

  const attendedBy = d.attendedBy.trim();
  if (!attendedBy) errors.attendedBy = "Enter the staff member who attended the customer.";
  else if (attendedBy.length > 100) errors.attendedBy = "Too long (100 characters max).";

  const notes = d.notes.trim();
  if (notes.length > 1000) errors.notes = "Notes are too long (1000 characters max).";

  if (Object.keys(errors).length > 0) return { errors, payload: null };
  return {
    errors,
    payload: {
      ...customer,
      address: customer.address || null,
      description,
      reported_on: d.reportedOn,
      attended_by: attendedBy,
      notes: notes || null,
      status: d.status,
    },
  };
}

export function complaintToDraft(c: ComplaintRow): ComplaintDraft {
  return {
    customerName: c.customer_name,
    phone: c.phone,
    address: c.address ?? "",
    vehicleReg: c.vehicle_reg,
    description: c.description,
    reportedOn: c.reported_on,
    attendedBy: c.attended_by ?? "",
    notes: c.notes ?? "",
    status: c.status,
  };
}
