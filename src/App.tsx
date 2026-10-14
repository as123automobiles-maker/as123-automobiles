import { createBrowserRouter, Link, RouterProvider } from "react-router";
import Layout from "./components/Layout";
import { AuthProvider, RequireAuth } from "./lib/auth";
import { ShopSettingsProvider } from "./lib/shopSettings";
import { MeProvider } from "./lib/staff";
import { configError } from "./lib/supabase";
import BillSearch from "./pages/BillSearch";
import BillView from "./pages/BillView";
import EditBill from "./pages/EditBill";
import Login from "./pages/Login";
import NewBill from "./pages/NewBill";
import Settings from "./pages/Settings";

function NotFound() {
  return (
    <main className="container empty">
      <h1>Page not found</h1>
      <Link to="/" className="btn btn-primary">
        Go to New bill
      </Link>
    </main>
  );
}

// A data router is needed for useBlocker (the unsaved-bill warning).
const router = createBrowserRouter(
  [
    { path: "/login", element: <Login /> },
    {
      element: (
        <RequireAuth>
          <MeProvider>
            <ShopSettingsProvider>
              <Layout />
            </ShopSettingsProvider>
          </MeProvider>
        </RequireAuth>
      ),
      children: [
        { index: true, element: <NewBill /> },
        { path: "bills", element: <BillSearch /> },
        { path: "bills/:id", element: <BillView /> },
        { path: "bills/:id/edit", element: <EditBill /> },
        { path: "settings", element: <Settings /> },
      ],
    },
    { path: "*", element: <NotFound /> },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);

export default function App() {
  if (configError) {
    return (
      <main className="container">
        <div className="alert alert-error" role="alert">
          <strong>Setup needed.</strong> {configError}
        </div>
      </main>
    );
  }
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
