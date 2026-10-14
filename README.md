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

   Run each file only once.
3. **Create staff logins.** Open **Authentication → Users → Add user → Create new user**. Enter an email and password and tick **Auto Confirm User**. Repeat for each staff member.
4. **Turn off public sign-ups.** Open **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**. Only the users you create can then log in.
5. **Get the public keys.** Open **Project Settings → API Keys** and copy the **Project URL** and the **publishable** (or legacy **anon**) key.

### How access is protected

- Every bill and setting needs a signed-in user. Visitors who aren't logged in can't read or change anything (Row Level Security).
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

- **Settings:** enter the workshop name, address and phone that are printed on bills. Tick **Allow bills with a labour charge of ₹0** only if the workshop wants zero-labour bills. By default the labour charge must be above ₹0.
- **New bill:** customer name, phone, vehicle number, date received and labour charge are required. Address and expected pickup are optional. Press **Enter** in an item's price box to jump to a new row.
- **Painting and washing** are optional. Tick one to enter its charge.
- **Editing** a saved bill recalculates and saves all totals again.
