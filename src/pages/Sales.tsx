import { useState } from "react";
import SalesChart from "../components/SalesChart";
import { salesForRange } from "../lib/api";
import { todayISO } from "../lib/customer";
import { formatDate } from "../lib/format";
import { formatINR } from "../lib/money";
import { monthRange, salesByDay, shiftDay, shiftMonth, summarize, type SalesSummary } from "../lib/sales";
import { useIsOwner, useMe } from "../lib/staff";
import { useLoad } from "../lib/useLoad";

type View = "combined" | "separate";

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function Tile({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={`tile${strong ? " tile-strong" : ""}`}>
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {sub && <span className="tile-sub">{sub}</span>}
    </div>
  );
}

function SummaryTiles({ s, view }: { s: SalesSummary; view: View }) {
  const bills = `${s.bills} ${s.bills === 1 ? "bill" : "bills"}`;
  if (view === "combined")
    return (
      <div className="tiles">
        <Tile strong label="Total sales (incl. labour)" value={formatINR(s.total)} sub={bills} />
        <Tile label="Excluding labour" value={formatINR(s.excludingLabour)} sub="Spares + painting & washing" />
      </div>
    );
  return (
    <div className="tiles">
      <Tile strong label="Total sales" value={formatINR(s.total)} sub={bills} />
      <Tile label="Spare parts" value={formatINR(s.spares)} sub="Parts & items on bills" />
      <Tile label="Labour charge" value={formatINR(s.labour)} />
      <Tile label="Painting & washing" value={formatINR(s.services)} />
    </div>
  );
}

/** Owner-only daily and monthly sales overview. */
export default function Sales() {
  const me = useMe();
  const isOwner = useIsOwner();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [view, setView] = useState<View>("separate");
  const { from, to } = monthRange(month);
  const state = useLoad(month, () => salesForRange(from, to));

  if (me.status === "loading") return <p className="page-status">Loading…</p>;
  if (!isOwner)
    return (
      <div className="empty">
        <h1>Sales</h1>
        <p>Only the workshop owner can see sales figures.</p>
      </div>
    );

  function goToMonth(m: string) {
    setMonth(m);
    // Keep the selected day inside the month shown: today if it's this month, else the 1st.
    setDay(today.startsWith(m) ? today : `${m}-01`);
  }

  function goToDay(d: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    setDay(d);
    if (!d.startsWith(month)) setMonth(d.slice(0, 7));
  }

  const viewToggle = (
    <div className="segmented" role="group" aria-label="How to show amounts">
      <button type="button" aria-pressed={view === "separate"} onClick={() => setView("separate")}>
        Spares & labour separately
      </button>
      <button type="button" aria-pressed={view === "combined"} onClick={() => setView("combined")}>
        Combined
      </button>
    </div>
  );

  return (
    <div>
      <div className="sales-head">
        <h1>Sales</h1>
        {viewToggle}
      </div>

      {state.status === "error" && (
        <div className="alert alert-error" role="alert">
          <span>Couldn't load sales. {state.message}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={state.retry}>
            Try again
          </button>
        </div>
      )}

      {state.status !== "error" && (
        <SalesBody
          loading={state.status === "loading"}
          rows={state.status === "ok" ? state.data : []}
          month={month}
          day={day}
          today={today}
          view={view}
          onMonth={goToMonth}
          onDay={goToDay}
        />
      )}
    </div>
  );
}

function SalesBody({
  loading,
  rows,
  month,
  day,
  today,
  view,
  onMonth,
  onDay,
}: {
  loading: boolean;
  rows: Parameters<typeof summarize>[0];
  month: string;
  day: string;
  today: string;
  view: View;
  onMonth: (m: string) => void;
  onDay: (d: string) => void;
}) {
  const days = salesByDay(rows, month);
  const monthTotal = summarize(rows);
  const daySales = days.find((d) => d.date === day) ?? { date: day, ...summarize([]) };
  const activeDays = days.filter((d) => d.bills > 0);
  const best = activeDays.reduce<(typeof days)[number] | null>((b, d) => (!b || d.total > b.total ? d : b), null);
  const isFutureMonth = month > today.slice(0, 7);

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>Daily overview</h2>
          <div className="stepper">
            <button type="button" className="btn btn-outline btn-sm" aria-label="Previous day" onClick={() => onDay(shiftDay(day, -1))}>
              ‹
            </button>
            <input type="date" aria-label="Day" value={day} max={today} onChange={(e) => onDay(e.target.value)} />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              aria-label="Next day"
              disabled={day >= today}
              onClick={() => onDay(shiftDay(day, 1))}
            >
              ›
            </button>
          </div>
        </div>
        <p className="muted overview-date">
          {formatDate(day)}
          {day === today && " · Today"}
        </p>
        {loading ? <p className="muted">Loading…</p> : <SummaryTiles s={daySales} view={view} />}
        {!loading && daySales.bills === 0 && <p className="muted">No bills received on this day.</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Monthly overview</h2>
          <div className="stepper">
            <button type="button" className="btn btn-outline btn-sm" aria-label="Previous month" onClick={() => onMonth(shiftMonth(month, -1))}>
              ‹
            </button>
            <input
              type="month"
              aria-label="Month"
              value={month}
              max={today.slice(0, 7)}
              onChange={(e) => e.target.value && onMonth(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              aria-label="Next month"
              disabled={month >= today.slice(0, 7)}
              onClick={() => onMonth(shiftMonth(month, 1))}
            >
              ›
            </button>
          </div>
        </div>
        <p className="muted overview-date">{monthLabel(month)}</p>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <SummaryTiles s={monthTotal} view={view} />
            {monthTotal.bills > 0 ? (
              <p className="month-facts">
                <span>
                  Average per working day: <b>{formatINR(Math.round(monthTotal.total / activeDays.length))}</b> ({activeDays.length}{" "}
                  {activeDays.length === 1 ? "day" : "days"} with bills)
                </span>
                {best && (
                  <span>
                    Best day: <b>{formatDate(best.date)}</b> · {formatINR(best.total)}
                  </span>
                )}
              </p>
            ) : (
              <p className="muted">{isFutureMonth ? "This month hasn't started yet." : "No bills received this month."}</p>
            )}
          </>
        )}
      </section>

      <section className="card">
        <h2>Daily comparison · {monthLabel(month)}</h2>
        {loading ? (
          <p className="muted">Loading chart…</p>
        ) : monthTotal.bills === 0 ? (
          <p className="muted">No sales to chart for this month.</p>
        ) : (
          <SalesChart days={days} selected={day} onSelect={onDay} />
        )}
      </section>

      <section className="card">
        <h2>Day by day</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : activeDays.length === 0 ? (
          <p className="muted">No bills this month.</p>
        ) : (
          <div className="table-scroll">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="num">Bills</th>
                  {view === "separate" ? (
                    <>
                      <th className="num">Spares</th>
                      <th className="num">Labour</th>
                      <th className="num">Painting & washing</th>
                    </>
                  ) : (
                    <th className="num">Excl. labour</th>
                  )}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {activeDays.map((d) => (
                  <tr key={d.date} className={d.date === day ? "row-selected" : undefined} onClick={() => onDay(d.date)}>
                    <td>{formatDate(d.date)}</td>
                    <td className="num">{d.bills}</td>
                    {view === "separate" ? (
                      <>
                        <td className="num">{formatINR(d.spares)}</td>
                        <td className="num">{formatINR(d.labour)}</td>
                        <td className="num">{formatINR(d.services)}</td>
                      </>
                    ) : (
                      <td className="num">{formatINR(d.excludingLabour)}</td>
                    )}
                    <td className="num">
                      <b>{formatINR(d.total)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Month total</td>
                  <td className="num">{monthTotal.bills}</td>
                  {view === "separate" ? (
                    <>
                      <td className="num">{formatINR(monthTotal.spares)}</td>
                      <td className="num">{formatINR(monthTotal.labour)}</td>
                      <td className="num">{formatINR(monthTotal.services)}</td>
                    </>
                  ) : (
                    <td className="num">{formatINR(monthTotal.excludingLabour)}</td>
                  )}
                  <td className="num">{formatINR(monthTotal.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="hint">Sales are counted on the bill's "Date received".</p>
      </section>
    </>
  );
}
