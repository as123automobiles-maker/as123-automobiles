import { useEffect, useState } from "react";
import { Link } from "react-router";
import { complaintsForVehicle } from "../lib/api";
import { isLookupKey, vehicleKey, type CustomerFields } from "../lib/customer";
import { formatDate } from "../lib/format";
import { errorMessage } from "../lib/supabase";
import type { ComplaintWithBills } from "../lib/types";
import { StatusBadge } from "./cards";

type Load = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "ok"; list: ComplaintWithBills[] };

interface Props {
  customer: CustomerFields;
  selected: string[];
  onChange: (ids: string[]) => void;
  /** When editing, the bill itself is not shown as "already on a bill". */
  billId?: string;
}

/** Lets staff tick which of this vehicle's complaints the bill addresses. Optional. */
export default function ComplaintPicker({ customer, selected, onChange, billId }: Props) {
  const key = vehicleKey(customer.vehicleReg);
  const [load, setLoad] = useState<Load>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isLookupKey(key)) {
      setLoad({ status: "idle" });
      return;
    }
    let cancelled = false;
    setLoad({ status: "loading" });
    const t = setTimeout(() => {
      complaintsForVehicle(key)
        .then((list) => {
          if (cancelled) return;
          setLoad({ status: "ok", list });
          // Drop selections that belong to a different vehicle (e.g. the number was corrected).
          const ids = new Set(list.map((c) => c.id));
          if (selected.some((id) => !ids.has(id))) onChange(selected.filter((id) => ids.has(id)));
        })
        .catch((err) => {
          if (!cancelled) setLoad({ status: "error", message: errorMessage(err) });
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // Re-run only when the vehicle changes; selection changes don't need a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  function toggle(id: string, on: boolean) {
    onChange(on ? [...selected, id] : selected.filter((s) => s !== id));
  }

  const newComplaintLink = (
    <Link to="/complaints/new" state={{ prefill: customer }} className="link-button">
      Record a new complaint
    </Link>
  );

  return (
    <section className="card">
      <h2>Complaints this bill fixes</h2>
      <p className="hint">Optional. Tick the customer's complaints that this work addresses.</p>

      {load.status === "idle" && <p className="muted">Enter the vehicle number above to see complaints for that vehicle.</p>}
      {load.status === "loading" && <p className="muted">Looking for complaints for {key}…</p>}
      {load.status === "error" && (
        <div className="alert alert-error" role="alert">
          <span>Couldn't load complaints. {load.message}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </button>
        </div>
      )}
      {load.status === "ok" && load.list.length === 0 && (
        <p className="muted">
          No complaints recorded for {key}. You can save the bill without one. {newComplaintLink}?
        </p>
      )}
      {load.status === "ok" && load.list.length > 0 && (
        <>
          <p className="picker-scope">
            Showing complaints for <span className="reg">{key}</span>
          </p>
          <ul className="picker">
            {load.list.map((c) => {
              const otherBills = c.bills.filter((b) => b.id !== billId);
              return (
                <li key={c.id}>
                  <label className="picker-row">
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} />
                    <span className="picker-body">
                      <span className="picker-top">
                        <strong>#{c.complaint_number}</strong>
                        <StatusBadge status={c.status} />
                        <span className="muted">{formatDate(c.reported_on)}</span>
                      </span>
                      <span className="picker-desc">{c.description}</span>
                      <span className="muted picker-meta">
                        Attended by {c.attended_by || "—"}
                        {otherBills.length > 0 && ` · Already on bill ${otherBills.map((b) => `#${b.bill_number}`).join(", ")}`}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="hint">
            {selected.length === 0 ? "No complaint selected." : `${selected.length} selected.`} Not listed? {newComplaintLink}.
          </p>
        </>
      )}
    </section>
  );
}
