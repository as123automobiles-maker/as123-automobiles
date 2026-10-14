import { useEffect, useState } from "react";
import { checkConnection } from "./lib/supabase";

export default function App() {
  const [status, setStatus] = useState<"checking" | "ok" | string>("checking");

  useEffect(() => {
    checkConnection().then((err) => setStatus(err ?? "ok"));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "48px auto", padding: "0 16px" }}>
      <h1>AS123 Automobiles Billing</h1>
      {status === "checking" && <p>Checking Supabase connection…</p>}
      {status === "ok" && <p style={{ color: "green" }}>✓ Connected to Supabase</p>}
      {status !== "checking" && status !== "ok" && <p style={{ color: "crimson" }}>✗ {status}</p>}
    </main>
  );
}
