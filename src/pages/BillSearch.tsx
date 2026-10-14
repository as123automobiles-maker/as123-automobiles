import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { searchBills } from "../lib/api";
import { formatDate } from "../lib/format";
import { formatINR, rupeesToPaise } from "../lib/money";
import { errorMessage } from "../lib/supabase";
import type { BillRow } from "../lib/types";

const RESULT_LIMIT = 100;

type Results = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; bills: BillRow[] };

export default function BillSearch() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<Results>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  // Keep the query in the URL (so Back returns to the same results), after a short pause in typing.
  useEffect(() => {
    const t = setTimeout(() => {
      const q = input.trim();
      if (q !== query) setParams(q ? { q } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [input, query, setParams]);

  useEffect(() => {
    const requestId = ++latest.current;
    setResults((r) => (r.status === "ok" ? r : { status: "loading" }));
    searchBills(query)
      .then((bills) => {
        if (requestId === latest.current) setResults({ status: "ok", bills });
      })
      .catch((err) => {
        if (requestId === latest.current) setResults({ status: "error", message: errorMessage(err) });
      });
  }, [query, attempt]);

  const searching = input.trim() !== query || (results.status === "loading" && query !== "");

  return (
    <div>
      <h1>Find bills</h1>
      <div className="card search-card">
        <label htmlFor="bill-search">Search by customer name, phone number or vehicle number</label>
        <input
          id="bill-search"
          type="search"
          autoFocus
          autoComplete="off"
          placeholder="e.g. Ravi, 98765 or KA01AB1234"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      <div aria-live="polite">
        {results.status === "error" ? (
          <div className="alert alert-error" role="alert">
            <span>Couldn't search bills. {results.message}</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
          </div>
        ) : results.status === "loading" ? (
          <p className="page-status">Loading bills…</p>
        ) : (
          <>
            <p className="results-heading">
              {searching
                ? "Searching…"
                : query
                  ? `${results.bills.length}${results.bills.length === RESULT_LIMIT ? "+" : ""} ${results.bills.length === 1 ? "bill" : "bills"} found for “${query}”`
                  : "Recent bills"}
            </p>
            {results.bills.length === 0 && !searching ? (
              <div className="empty">
                {query ? (
                  <p>No bills match “{query}”. Check the spelling, or try the phone or vehicle number instead.</p>
                ) : (
                  <>
                    <p>No bills yet.</p>
                    <Link to="/" className="btn btn-primary">
                      Create the first bill
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <ul className={`results${searching ? " stale" : ""}`}>
                {results.bills.map((b) => (
                  <li key={b.id}>
                    <Link to={`/bills/${b.id}`} className="result">
                      <div className="result-top">
                        <strong className="result-name">{b.customer_name}</strong>
                        <strong className="result-total">{formatINR(rupeesToPaise(b.grand_total))}</strong>
                      </div>
                      <div className="result-details">
                        <span className="reg">{b.vehicle_reg}</span>
                        <span>{b.phone}</span>
                        <span>Received {formatDate(b.date_received)}</span>
                        <span>Pickup {formatDate(b.expected_pickup)}</span>
                        <span className="muted">Bill #{b.bill_number}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
