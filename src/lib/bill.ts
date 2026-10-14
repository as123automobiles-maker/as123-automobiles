import { paiseToDecimal, paiseToInput, parseAmount, rupeesToPaise, type ParsedAmount } from "./money";
import type { BillWithItems } from "./types";

export interface ItemDraft {
  key: string;
  description: string;
  price: string;
}

export interface OptionalService {
  selected: boolean;
  amount: string;
}

/** The bill form's state, exactly as typed. */
export interface BillDraft {
  customerName: string;
  address: string;
  phone: string;
  vehicleReg: string;
  dateReceived: string;
  expectedPickup: string;
  items: ItemDraft[];
  labour: string;
  painting: OptionalService;
  washing: OptionalService;
}

let keySeq = 0;
export function newItem(description = "", price = ""): ItemDraft {
  keySeq += 1;
  return { key: `i${Date.now().toString(36)}${keySeq}`, description, price };
}

/** Today's date in the browser's time zone, as yyyy-mm-dd. */
export function todayISO(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function emptyBill(): BillDraft {
  return {
    customerName: "",
    address: "",
    phone: "",
    vehicleReg: "",
    dateReceived: todayISO(),
    expectedPickup: "",
    items: [newItem()],
    labour: "",
    painting: { selected: false, amount: "" },
    washing: { selected: false, amount: "" },
  };
}

export function isBlankItem(item: ItemDraft): boolean {
  return item.description.trim() === "" && item.price.trim() === "";
}

export interface Totals {
  itemsSubtotal: number;
  labour: number;
  painting: number;
  washing: number;
  grandTotal: number;
}

function paiseOrZero(raw: string): number {
  const p = parseAmount(raw);
  return p.ok ? p.paise : 0;
}

/** Live totals in paise. Amounts that aren't valid yet count as 0. */
export function computeTotals(d: BillDraft): Totals {
  const itemsSubtotal = d.items.reduce((sum, item) => sum + paiseOrZero(item.price), 0);
  const labour = paiseOrZero(d.labour);
  const painting = d.painting.selected ? paiseOrZero(d.painting.amount) : 0;
  const washing = d.washing.selected ? paiseOrZero(d.washing.amount) : 0;
  return { itemsSubtotal, labour, painting, washing, grandTotal: itemsSubtotal + labour + painting + washing };
}

/** What save_bill() expects. Amounts are decimal strings. */
export interface SaveBillPayload {
  bill: {
    customer_name: string;
    address: string;
    phone: string;
    vehicle_reg: string;
    date_received: string;
    expected_pickup: string | null;
    labour_charge: string;
    painting_charge: string | null;
    washing_charge: string | null;
  };
  items: { description: string; price: string }[];
}

/**
 * Error messages keyed by field. Item fields use `item-<key>-description` /
 * `item-<key>-price`. The form renders each field with id `f-<errorKey>`.
 */
export type BillErrors = Record<string, string>;

export function normalizeVehicleReg(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, " ");
}

function amountMessage(p: ParsedAmount, label: string): string | null {
  if (p.ok) return null;
  if (p.reason === "empty") return `Enter the ${label}.`;
  if (p.reason === "too-large") return `The ${label} is too large.`;
  return `Enter the ${label} as a number, e.g. 450 or 450.50.`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Checks every field. Returns the payload only when there are no errors. */
export function validateBill(
  d: BillDraft,
  opts: { allowZeroLabour: boolean },
): { errors: BillErrors; payload: SaveBillPayload | null } {
  const errors: BillErrors = {};

  const name = d.customerName.trim();
  if (!name) errors.customerName = "Enter the customer's name.";
  else if (name.length > 100) errors.customerName = "Name is too long (100 characters max).";

  if (d.address.trim().length > 300) errors.address = "Address is too long (300 characters max).";

  const phoneDigits = d.phone.replace(/\D/g, "");
  if (!d.phone.trim()) errors.phone = "Enter the phone number.";
  else if (!/^[+\d\s()-]+$/.test(d.phone.trim()) || phoneDigits.length < 10 || phoneDigits.length > 13)
    errors.phone = "Enter a valid phone number with at least 10 digits.";

  const reg = normalizeVehicleReg(d.vehicleReg);
  const regChars = reg.replace(/[^A-Z0-9]/g, "");
  if (!reg) errors.vehicleReg = "Enter the vehicle registration number.";
  else if (!/^[A-Z0-9 -]+$/.test(reg) || regChars.length < 4 || reg.length > 20)
    errors.vehicleReg = "Enter a valid registration number, e.g. KA 01 AB 1234.";

  if (!ISO_DATE.test(d.dateReceived)) errors.dateReceived = "Choose the date the vehicle was received.";
  if (d.expectedPickup && !ISO_DATE.test(d.expectedPickup)) errors.expectedPickup = "Choose a valid pickup date.";
  else if (d.expectedPickup && ISO_DATE.test(d.dateReceived) && d.expectedPickup < d.dateReceived)
    errors.expectedPickup = "Pickup date can't be before the date received.";

  const items: SaveBillPayload["items"] = [];
  for (const item of d.items) {
    if (isBlankItem(item)) continue;
    const description = item.description.trim();
    if (!description) errors[`item-${item.key}-description`] = "Describe the part or work.";
    else if (description.length > 200) errors[`item-${item.key}-description`] = "Too long (200 characters max).";
    const price = parseAmount(item.price);
    const priceError = amountMessage(price, "price");
    if (priceError) errors[`item-${item.key}-price`] = priceError;
    if (description && price.ok) items.push({ description, price: paiseToDecimal(price.paise) });
  }

  const labour = parseAmount(d.labour);
  const labourError = amountMessage(labour, "labour charge");
  if (labourError) errors.labour = labourError;
  else if (labour.ok && labour.paise === 0 && !opts.allowZeroLabour)
    errors.labour = "Labour charge must be more than ₹0.";

  // Optional services: only checked when ticked, and then need an amount above ₹0.
  const optional = (service: OptionalService, field: "painting" | "washing", name: string): string | null => {
    if (!service.selected) return null;
    const label = `${name.toLowerCase()} charge`;
    const p = parseAmount(service.amount);
    const msg = p.ok ? (p.paise === 0 ? `The ${label} must be more than ₹0.` : null) : amountMessage(p, label);
    if (msg) errors[field] = `${msg} Or untick ${name}.`;
    return p.ok ? paiseToDecimal(p.paise) : null;
  };
  const painting = optional(d.painting, "painting", "Painting");
  const washing = optional(d.washing, "washing", "Washing");

  if (Object.keys(errors).length > 0 || !labour.ok) return { errors, payload: null };

  return {
    errors,
    payload: {
      bill: {
        customer_name: name,
        address: d.address.trim(),
        phone: d.phone.trim(),
        vehicle_reg: reg,
        date_received: d.dateReceived,
        expected_pickup: d.expectedPickup || null,
        labour_charge: paiseToDecimal(labour.paise),
        painting_charge: painting,
        washing_charge: washing,
      },
      items,
    },
  };
}

/** Turns a saved bill back into form state for editing. */
export function billToDraft(bill: BillWithItems): BillDraft {
  const items = [...bill.bill_items]
    .sort((a, b) => a.position - b.position)
    .map((i) => newItem(i.description, paiseToInput(rupeesToPaise(i.price))));
  return {
    customerName: bill.customer_name,
    address: bill.address ?? "",
    phone: bill.phone,
    vehicleReg: bill.vehicle_reg,
    dateReceived: bill.date_received,
    expectedPickup: bill.expected_pickup ?? "",
    items: items.length > 0 ? items : [newItem()],
    labour: paiseToInput(rupeesToPaise(bill.labour_charge)),
    painting: {
      selected: bill.painting_charge !== null,
      amount: bill.painting_charge !== null ? paiseToInput(rupeesToPaise(bill.painting_charge)) : "",
    },
    washing: {
      selected: bill.washing_charge !== null,
      amount: bill.washing_charge !== null ? paiseToInput(rupeesToPaise(bill.washing_charge)) : "",
    },
  };
}
