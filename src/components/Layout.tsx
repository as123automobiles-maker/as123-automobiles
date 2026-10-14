import { NavLink, Outlet } from "react-router";
import { useShopSettings } from "../lib/shopSettings";
import { supabase } from "../lib/supabase";

export default function Layout() {
  const { settings, error } = useShopSettings();

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="topbar-inner">
          <span className="brand">{settings?.shop_name || "Workshop Billing"}</span>
          <nav className="nav">
            <NavLink to="/" end>
              New bill
            </NavLink>
            <NavLink to="/bills">Find bills</NavLink>
            <NavLink to="/settings">Settings</NavLink>
            <button type="button" className="link-button" onClick={() => void supabase.auth.signOut()}>
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="container">
        {error && (
          <div className="alert alert-error no-print" role="alert">
            Couldn't load shop settings: {error}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
