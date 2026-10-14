import { useEffect, useState, type FormEvent } from "react";
import { Field, fieldProps } from "../components/fields";
import { updateShopSettings } from "../lib/api";
import { useShopSettings } from "../lib/shopSettings";
import { errorMessage } from "../lib/supabase";
import type { ShopSettings } from "../lib/types";

export default function Settings() {
  const { settings, reload } = useShopSettings();
  const [form, setForm] = useState<ShopSettings | null>(settings);
  const [nameError, setNameError] = useState<string | undefined>();
  const [status, setStatus] = useState<{ kind: "saved" } | { kind: "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) return <p className="page-status">Loading settings…</p>;

  const update = (patch: Partial<ShopSettings>) => {
    setForm({ ...form, ...patch });
    setStatus(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const shopName = form.shop_name.trim();
    if (!shopName) {
      setNameError("Enter the workshop name.");
      document.getElementById("f-shopName")?.focus();
      return;
    }
    setNameError(undefined);
    setSaving(true);
    try {
      await updateShopSettings({
        shop_name: shopName,
        address: form.address?.trim() || null,
        phone: form.phone?.trim() || null,
        allow_zero_labour: form.allow_zero_labour,
      });
      await reload();
      setStatus({ kind: "saved" });
    } catch (err) {
      setStatus({ kind: "error", message: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1>Settings</h1>
      <section className="card">
        <h2>Workshop details</h2>
        <p className="hint">Printed at the top of every bill.</p>
        <Field fieldKey="shopName" label="Workshop name" required error={nameError}>
          <input
            {...fieldProps("shopName", nameError)}
            type="text"
            value={form.shop_name}
            onChange={(e) => update({ shop_name: e.target.value })}
          />
        </Field>
        <Field fieldKey="shopAddress" label="Address">
          <textarea
            id="f-shopAddress"
            rows={2}
            value={form.address ?? ""}
            onChange={(e) => update({ address: e.target.value })}
          />
        </Field>
        <Field fieldKey="shopPhone" label="Phone">
          <input
            id="f-shopPhone"
            type="tel"
            value={form.phone ?? ""}
            onChange={(e) => update({ phone: e.target.value })}
          />
        </Field>
      </section>

      <section className="card">
        <h2>Billing rules</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={form.allow_zero_labour}
            onChange={(e) => update({ allow_zero_labour: e.target.checked })}
          />
          Allow bills with a labour charge of ₹0
        </label>
        <p className="hint">When this is off, every bill needs a labour charge above ₹0.</p>
      </section>

      {status?.kind === "saved" && (
        <div className="alert alert-success" role="status">
          Settings saved.
        </div>
      )}
      {status?.kind === "error" && (
        <div className="alert alert-error" role="alert">
          Couldn't save settings. {status.message}
        </div>
      )}
      <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
