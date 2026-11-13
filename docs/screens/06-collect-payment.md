# Screen 06 – Collect payment (modal)

- **Route:** none. A modal on phone, a drawer on desktop. Opened from other screens.
- **Phase:** 1
- **Roles:** owner, manager, receptionist (only owner and manager can backdate or void)
- **Reads:** `invoices`, `members` · **Writes:** `payments`, `invoices` (paid and balance), `auditLog`

## Purpose
Record money received against an invoice, with one or more payment modes, then let staff share the receipt.

## Opened from
`05-member-profile.md`, `04-member-form.md` (Save and collect), `10-payments-dues.md` (Dues tab), `13-reminders.md` (dues rows), `02-dashboard.md` (plus button, asks for a member first), `12-invoices.md` (invoices with a balance).

## Layout and fields
1. **Member**: shown, or a search box when opened without one.
2. **Invoice list**: unpaid invoices, oldest first, each with its balance. One is selected.
3. **Amount**: defaults to the selected invoice's balance. Cannot exceed it (no advance payments in the first version).
4. **Mode rows**: mode (cash, UPI, card, bank transfer, other) and amount. "Add another mode" lets one payment be split. The rows must add up to the amount.
5. **Date**: today. Only owner and manager can change it.
6. **Note**: optional.

## Actions
| Action | Result | API |
| --- | --- | --- |
| Save | Creates the payment, updates `paidAmount` and `balance` on the invoice, shows the receipt step | `POST /api/payments` |
| Share receipt | Opens WhatsApp for the member with a receipt message (see `AGENTS.md` for the share link builder) | none |
| Download PDF (phase 2) | Uses `12-invoices.md` PDF | `GET /api/invoices/:id/pdf` |
| Void (not in this modal, on the Payments tab) | Owner and manager, reason required, marks `void`, restores the balance, writes `auditLog` | `POST /api/payments/:id/void` |

## Rules
- Payments are append-only. Never delete them, only void.
- Double-tap protection: disable Save while saving and send an idempotency key.
- Receipt message includes gym name, member name, amount, modes, date, invoice number and remaining balance.

## Connects to
- **To:** back to the opening screen with its numbers refreshed. After Save, the receipt step can open `12-invoices.md`.

## Done when
- [x] Split payments always add up exactly.
- [x] Balance never goes negative.
- [x] Share opens WhatsApp with the receipt text on phone and desktop.
