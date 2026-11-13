# Screen 10 – Payments and dues

- **Route:** `/payments`
- **Phase:** 1
- **Roles:** owner, manager, receptionist. Void and export: owner and manager.
- **Reads:** `payments`, `invoices`, `members` · **Writes:** `payments` (void only)

## Purpose
See all money received and all money still owed, and collect what is owed.

## Layout
- Tabs: **Transactions**, **Dues**. Date filter chips: Today (default), This week, This month, Custom.
- Phone: cards. Desktop: tables with a totals bar.

## Transactions tab
- Totals bar: total received, and totals by mode (cash, UPI, card, bank, other).
- Rows: time, member, invoice number, mode splits, amount, received by, void badge.
- Row actions: open receipt, **Void** (owner and manager, reason required), open member.
- Export CSV: owner and manager.

## Dues tab
- Members with an invoice balance above zero, oldest first: member, invoice, balance, days overdue.
- Row actions: **Collect** (opens `06-collect-payment.md`), **Share reminder** (WhatsApp, see `13-reminders.md`), open profile.
- Total dues at the top, matching the dashboard card.

## API
- `GET /api/payments?from=&to=&mode=&branchId=`
- `GET /api/dues?branchId=`
- `POST /api/payments/:id/void`

## Connects to
- **From:** `02-dashboard.md` (collection and dues cards), bottom tab "Payments", `11-reports.md` drill-down.
- **To:** `06-collect-payment.md`, `05-member-profile.md`, `12-invoices.md`, `13-reminders.md`.

## Done when
- [x] Totals equal the sum of non-void rows.
- [x] Void restores the invoice balance and writes `auditLog`.
- [x] Dues total matches the dashboard and the dues report.
