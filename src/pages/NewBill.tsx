import { useCallback, useState } from "react";
import BillForm from "../components/BillForm";
import { emptyBill, isBlankItem, type BillDraft } from "../lib/bill";

// Unsaved new bills are kept on this device so a reload, closed tab or dead
// battery doesn't lose what was typed. Saving the bill removes the draft.
const DRAFT_KEY = "workshop-billing:new-bill-draft";

function hasContent(d: BillDraft): boolean {
  return Boolean(
    d.customerName.trim() ||
      d.phone.trim() ||
      d.address.trim() ||
      d.vehicleReg.trim() ||
      d.expectedPickup ||
      d.labour.trim() ||
      d.painting.selected ||
      d.washing.selected ||
      d.items.some((i) => !isBlankItem(i)),
  );
}

function loadDraft(): BillDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as BillDraft;
    const looksValid =
      typeof d.customerName === "string" &&
      Array.isArray(d.items) &&
      d.items.every((i) => typeof i.key === "string" && typeof i.description === "string" && typeof i.price === "string") &&
      typeof d.painting?.selected === "boolean" &&
      typeof d.washing?.selected === "boolean";
    return looksValid && hasContent(d) ? d : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable */
  }
}

export default function NewBill() {
  const [start, setStart] = useState(() => {
    const draft = loadDraft();
    return { draft: draft ?? emptyBill(), restored: draft !== null, key: 0 };
  });

  const saveDraft = useCallback((d: BillDraft) => {
    try {
      if (hasContent(d)) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* storage unavailable: the leave-page warning still protects the bill */
    }
  }, []);

  function startFresh() {
    clearDraft();
    setStart((s) => ({ draft: emptyBill(), restored: false, key: s.key + 1 }));
  }

  const banner = start.restored ? (
    <div className="alert alert-info">
      <span>We restored a bill you hadn't saved yet.</span>
      <button type="button" className="link-button" onClick={startFresh}>
        Discard it and start a new bill
      </button>
    </div>
  ) : null;

  return (
    <BillForm
      key={start.key}
      initial={start.draft}
      title="New bill"
      onChange={saveDraft}
      onSaved={clearDraft}
      banner={banner}
    />
  );
}
