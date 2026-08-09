# Lakshmi Fancy Store - Store Management SPA

A zero-dependency, pure HTML/CSS/JS single-page app for running daily sales,
jewellery rentals, and back-office admin from a phone, tablet, or desktop.
Built to run 100% free on GitHub Pages — no server, no build step, no
frameworks.

## Files

```
index.html          Sales-person app (Daily Sales / Rental / Catalog)
admin.html           Admin console — separate file, its own password
css/style.css         Shared styling (mobile-first)
js/common.js          Storage, auth, backup/export/import, validation helpers
js/app.js             Sales-person logic
js/admin.js           Admin console logic
data/*.json           Seed data — see table below
```

## JSON files and what they hold

| localStorage key         | Seed file                     | Holds |
|---------------------------|--------------------------------|-------|
| `lfs_settings`             | `data/settings.json`           | Store name, logo, address, phone, email, GST, social links, QR codes, both passwords, auto-backup interval |
| `lfs_inventory`            | `data/inventory.json`          | Daily-sale stock items (name, code, category, qty, price, image) |
| `lfs_rental_items`         | `data/rental_items.json`       | Rentable jewellery master data (rate, deposit, purchase info, times rented, earnings) |
| `lfs_customers`            | `data/customers.json`          | Customer directory (name, phone, address, region, loyalty points, repeat/review flags) |
| `lfs_staff`                | `data/staff.json`              | Employee profiles (name, role, monthly salary) |
| `lfs_attendance`           | `data/attendance.json`         | One row per leave day taken |
| `lfs_expenses`             | `data/expenses.json`           | Store overhead log (rent, electricity, tax, etc.) |
| `lfs_sales`                | `data/sales.json`              | Daily small-item sales transactions |
| `lfs_rentals`               | `data/rentals.json`            | Rental transactions, active + historic |
| `lfs_loyalty`              | `data/loyalty.json`            | Points-per-₹100, repeat/review discounts, flash sale config |
| `lfs_customer_requests`    | `data/customer_requests.json`  | Free-text customer feedback/requirement notes |

## How data persistence & redeploy works

1. On first load, if a `localStorage` key is empty, the app fetches the
   matching JSON file in `/data` and uses it as the starting dataset.
2. From then on, every read/write happens against `localStorage` so the app
   works fully offline and instantly.
3. Admin → **Backup & Export** lets you download any module (or a full
   bundle) as JSON at any time. Commit the updated file(s) back into `/data`
   in your GitHub repo before the next deploy, and the new deployment will
   seed itself with your latest real data — that's the "old data populates
   historic values" workflow the spec asked for.
4. Admin can also set an **auto-backup interval** (hours). While the admin
   console tab stays open, a full backup JSON automatically downloads on
   that schedule as a safety net.

## Passwords / authentication

- Sales-person tabs (Daily Sales, Rental, Catalog) are gated by
  `salesPersonPassword` in Settings. It asks once per browser session and
  asks again after every refresh.
- Admin console (`admin.html`) is a **separate file** gated by
  `adminPassword`. It also asks once per session (not per admin tab) and
  again after refresh.
- Both passwords are changed from Admin → **Security**, and default to
  `sales1111` / `admin111` — change them before real use.

## Printable reports

Every module that lists data (Stock, Rental Inventory, Staff, Attendance &amp;
Salary, Expenses, Jewellery Usage, Sales Report, Customers) — on both the
sales-person app and the admin console — has a **Print** button. It opens a
clean, separate print view stamped with the store logo, name, address, GST
number, and the exact date/time it was printed, then triggers the browser's
print dialog. This is in addition to the existing rental receipt printing.

## Deploying to GitHub Pages

1. Push this folder to a repo.
2. Repo Settings → Pages → deploy from the `main` branch, root folder.
3. Visit `https://<yourname>.github.io/<repo>/` for the sales app, and
   `.../admin.html` for the admin console.

## Notes & limitations

- Images (item photos, logo, QR codes) are stored as base64 inside
  `localStorage`/JSON, so keep photos reasonably small (a few hundred KB) —
  browsers cap `localStorage` around 5–10MB per origin.
- "Auto backup" downloads a file to the device being used; it can't silently
  write into your GitHub repo from the browser (GitHub Pages is static and
  has no server-side write access). Treat the downloaded file as what you
  commit back manually, or wire it into a scheduled GitHub Action if you
  want it fully hands-off.
- Multi-device sync is file-based (export on one device → commit → every
  device gets it on next load) rather than live real-time sync, since there
  is intentionally no backend.
