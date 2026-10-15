import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import { errorMessage, isRemembered, rememberedEmail, setRememberMe, supabase } from "../lib/supabase";

export default function Login() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/";
  const [email, setEmail] = useState(rememberedEmail);
  const [remember, setRemember] = useState(isRemembered);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="page-status">Loading…</p>;
  if (session) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    setRememberMe(remember, email.trim());
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="card login-card" onSubmit={onSubmit} noValidate>
        <div className="login-brand">
          <h1 className="sr-only">Pitstop Plus</h1>
          <img src={`${import.meta.env.BASE_URL}pitstop-plus.svg`} alt="Pitstop Plus" className="login-logo" />
          <p className="hint">Sign in to create and find bills.</p>
        </div>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus={!email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            autoFocus={!!email}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <label className="check remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me on this device
        </label>
        <p className="hint remember-hint">
          {remember
            ? "You'll stay signed in until you press Sign out."
            : "You'll be signed out when you close the browser. Use this on shared computers."}
        </p>
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="hint">Don't have a login? Ask the workshop owner to create one for you.</p>
      </form>
    </main>
  );
}
