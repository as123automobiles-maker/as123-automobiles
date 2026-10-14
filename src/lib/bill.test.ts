import { describe, expect, it } from "vitest";
import { billToDraft, computeTotals, emptyBill, newItem, validateBill, type BillDraft } from "./bill";
import { formatINR, parseAmount } from "./money";
import type { BillWithItems } from "./types";

function filled(overrides: Partial<BillDraft> = {}): BillDraft {
  return {
    ...emptyBill(),
    customerName: "Ravi Kumar",
    address: "12 MG Road, Bengaluru",
    phone: "98765 43210",
    vehicleReg: "ka 01 ab 1234",
    dateReceived: "2026-10-14",
    expectedPickup: "2026-10-16",
    items: [newItem("Brake pads", "1,250"), newItem("Engine oil 3L", "899.50")],
    labour: "600",
    ...overrides,
  };
}

const strict = { allowZeroLabour: false };

describe("parseAmount", () => {
  it("accepts commas, ₹ and up to two decimals", () => {
    expect(parseAmount("1,250")).toEqual({ ok: true, paise: 125000 });
    expect(parseAmount("₹ 899.5")).toEqual({ ok: true, paise: 89950 });
    expect(parseAmount(".75")).toEqual({ ok: true, paise: 75 });
    expect(parseAmount("0")).toEqual({ ok: true, paise: 0 });
  });
  it("rejects bad input", () => {
    expect(parseAmount("")).toEqual({ ok: false, reason: "empty" });
    expect(parseAmount("abc")).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount("-5")).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount("1.999")).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount(".")).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount("123456789")).toEqual({ ok: false, reason: "too-large" });
  });
});

describe("formatINR", () => {
  it("uses Indian grouping", () => {
    expect(formatINR(125000050)).toBe("₹12,50,000.50");
  });
});

describe("computeTotals", () => {
  it("adds items, labour and only the selected optional services", () => {
    const d = filled({
      painting: { selected: true, amount: "2000" },
      washing: { selected: false, amount: "300" },
    });
    expect(computeTotals(d)).toEqual({
      itemsSubtotal: 214950,
      labour: 60000,
      painting: 200000,
      washing: 0,
      grandTotal: 474950,
    });
  });
  it("counts invalid amounts as zero while typing", () => {
    expect(computeTotals(filled({ labour: "abc" })).grandTotal).toBe(214950);
  });
});

describe("validateBill", () => {
  it("builds the payload for a valid bill with several items", () => {
    const { errors, payload } = validateBill(filled({ washing: { selected: true, amount: "250" } }), strict);
    expect(errors).toEqual({});
    expect(payload).toEqual({
      bill: {
        customer_name: "Ravi Kumar",
        address: "12 MG Road, Bengaluru",
        phone: "98765 43210",
        vehicle_reg: "KA 01 AB 1234",
        date_received: "2026-10-14",
        expected_pickup: "2026-10-16",
        labour_charge: "600.00",
        painting_charge: null,
        washing_charge: "250.00",
      },
      items: [
        { description: "Brake pads", price: "1250.00" },
        { description: "Engine oil 3L", price: "899.50" },
      ],
      complaintIds: [],
    });
  });

  it("passes linked complaints through without duplicates, and doesn't require any", () => {
    expect(validateBill(filled({ complaintIds: ["c1", "c2", "c1"] }), strict).payload?.complaintIds).toEqual(["c1", "c2"]);
    expect(validateBill(filled({ complaintIds: [] }), strict).errors).toEqual({});
  });

  it("requires a labour charge", () => {
    expect(validateBill(filled({ labour: "" }), strict).errors.labour).toBe("Enter the labour charge.");
    expect(validateBill(filled({ labour: "" }), strict).payload).toBeNull();
  });

  it("rejects zero labour unless the workshop allows it", () => {
    expect(validateBill(filled({ labour: "0" }), strict).errors.labour).toMatch(/more than ₹0/);
    const allowed = validateBill(filled({ labour: "0" }), { allowZeroLabour: true });
    expect(allowed.errors).toEqual({});
    expect(allowed.payload?.bill.labour_charge).toBe("0.00");
  });

  it("does not require painting or washing, but needs a charge when ticked", () => {
    expect(validateBill(filled(), strict).payload).not.toBeNull();
    const r = validateBill(filled({ painting: { selected: true, amount: "" } }), strict);
    expect(r.errors.painting).toBe("Enter the painting charge. Or untick Painting.");
    expect(r.payload).toBeNull();
  });

  it("ignores blank item rows but flags half-filled ones", () => {
    const blank = newItem();
    const half = newItem("Clutch plate", "");
    const r = validateBill(filled({ items: [blank, half] }), strict);
    expect(Object.keys(r.errors)).toEqual([`item-${half.key}-price`]);
    const ok = validateBill(filled({ items: [blank] }), strict);
    expect(ok.payload?.items).toEqual([]);
  });

  it("checks required customer and vehicle fields", () => {
    const r = validateBill(emptyBill(), strict);
    expect(Object.keys(r.errors).sort()).toEqual(["customerName", "labour", "phone", "vehicleReg"]);
  });

  it("rejects a pickup date before the received date", () => {
    const r = validateBill(filled({ expectedPickup: "2026-10-13" }), strict);
    expect(r.errors.expectedPickup).toMatch(/before/);
  });
});

describe("billToDraft", () => {
  it("round-trips a saved bill into editable form state", () => {
    const saved: BillWithItems = {
      id: "b1",
      bill_number: 7,
      customer_name: "Ravi Kumar",
      address: null,
      phone: "9876543210",
      vehicle_reg: "KA01AB1234",
      vehicle_reg_key: "KA01AB1234",
      date_received: "2026-10-14",
      expected_pickup: null,
      labour_charge: 600,
      painting_charge: null,
      washing_charge: 250.5,
      items_subtotal: 1250,
      grand_total: 2100.5,
      created_at: "",
      updated_at: "",
      bill_items: [{ id: "x", bill_id: "b1", position: 0, description: "Brake pads", price: 1250 }],
      complaints: [{ id: "c1", complaint_number: 3, description: "Brake noise", status: "open", attended_by: null, reported_on: "2026-10-14" }],
    };
    const d = billToDraft(saved);
    expect(d.items.map((i) => [i.description, i.price])).toEqual([["Brake pads", "1250"]]);
    expect(d.washing).toEqual({ selected: true, amount: "250.50" });
    expect(d.painting.selected).toBe(false);
    expect(d.complaintIds).toEqual(["c1"]);
    expect(computeTotals(d).grandTotal).toBe(210050);
  });
});
