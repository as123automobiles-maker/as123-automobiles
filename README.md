# Workshop Billing

A simple, mobile-friendly web app for an automobile workshop to create, save, search and print customer repair bills.

- **New bill:** customer and vehicle details, any number of parts or work items (free text and price), a required labour charge, and optional painting and washing. Totals update as you type.
- **Find bills:** one search box that matches customer name, phone number or vehicle number. Opening a result shows the full bill.
- **Print / Save PDF:** a clean printable bill with your workshop's name, address and phone.
- **Send on WhatsApp:** opens WhatsApp (the app on phones, WhatsApp Web on computers) with the customer's number and the bill summary filled in. Staff only press Send. 10-digit numbers are treated as Indian (+91). No WhatsApp Business account is needed.
- **Unsaved-bill protection:** the app warns before you leave a bill you haven't saved. An unfinished new bill is also kept on the device and restored the next time you open **New bill**.

Built with React, TypeScript, Vite and Supabase (Postgres plus Auth).

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. **Create the database.** Open **SQL Editor → New query**, paste the contents of each file below in order, and click **Run** for each:
   - `supabase/migrations/0001_billing_schema.sql`
   - `supabase/migrations/0002_bills.sql`
   - `supabase/migrations/0003_staff.sql`

   Run each file only once.
3. **Create the owner login.** Open **Authentication → Users → Add user → Create new user**, enter your email and a password, and tick **Auto Confirm User**. If you create it *before* running `0003_staff.sql`, that migration makes the earliest login the **Owner**. If you create it *after*, add it to the staff list in the SQL Editor:
   ```sql
   insert into public.staff (user_id, email, role)
   select id, email, 'owner' from auth.users where email = 'you@example.com';
   ```
4. **Deploy the login-management function.** This lets the owner add and remove logins from **Settings**. Open **Edge Functions → Deploy a new function → Via Editor**, name it `manage-staff`, paste the contents of `supabase/functions/manage-staff/index.ts`, and click **Deploy**. Then open the function's **Settings** and turn **off** "Verify JWT with legacy secret" (the function checks the caller itself). Using the CLI instead: `npx supabase functions deploy manage-staff --no-verify-jwt --project-ref <ref>`.
5. **Turn off public sign-ups.** Open **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**. Even if sign-ups stay on, people who aren't on the staff list can't see any bills.
6. **Get the public keys.** Open **Project Settings → API Keys** and copy the **Project URL** and the **publishable** (or legacy **anon**) key.

### How access is protected

- Only people on the `staff` list can read or save bills (Row Level Security). Visitors who aren't logged in, and logins not on the list, see nothing.
- **Owner** logins can change Settings and add or remove logins. **Staff** logins can create, edit, search, print and send bills.
- Logins are created and removed by the `manage-staff` Edge Function, which runs on Supabase's servers with the service-role key and re-checks on every call that the caller is an owner.
- Bills are saved only through the `save_bill` database function. It checks the labour charge and calculates the subtotal and grand total, so stored totals always match the items, including after edits.
- The frontend uses only the publishable/anon key. **Never put the `service_role` / secret key in `.env` or in the frontend.** Every `VITE_` variable is visible in the browser.

## 2. Run locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env     # then fill in the two values from step 1.5
npm run dev              # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm test` | Run the billing-logic tests |
| `npm run typecheck` | Check TypeScript |
| `npm run build` | Production build into `dist/` |

`.env` is listed in `.gitignore` and is never committed. Only `.env.example`, which holds placeholders, is in the repository.

## 3. GitHub

The repository already exists. To connect a new copy:

```bash
git remote add origin https://github.com/<your-account>/<repo>.git
git push -u origin main
```

On every push and pull request, GitHub Actions (`.github/workflows/ci.yml`) runs the type check, the tests and the build.

## 4. Deploy (Vercel)

1. Sign in at [vercel.com](https://vercel.com) with GitHub and click **Add New → Project**. Import the repository.
2. Vercel detects Vite automatically. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Click **Deploy**. Every push to `main` then deploys automatically. `vercel.json` makes page links such as `/bills/…` work after a refresh.
4. In Supabase, open **Authentication → URL Configuration** and set **Site URL** to your Vercel address.

Netlify, Cloudflare Pages and similar hosts work the same way: build command `npm run build`, output folder `dist`, the same two environment variables, and a rewrite of all paths to `/index.html`.

## Using the app

- **Staff logins** (Settings, owner only): add a login with a name, email and password, then tell the person their password. **Change password** sets a new one. **Remove** stops that person signing in; bills they created are kept.
- **Settings:** enter the workshop name, address and phone that are printed on bills. Tick **Allow bills with a labour charge of ₹0** only if the workshop wants zero-labour bills. By default the labour charge must be above ₹0.
- **New bill:** customer name, phone, vehicle number, date received and labour charge are required. Address and expected pickup are optional. Press **Enter** in an item's price box to jump to a new row.
- **Painting and washing** are optional. Tick one to enter its charge.
- **Editing** a saved bill recalculates and saves all totals again.
