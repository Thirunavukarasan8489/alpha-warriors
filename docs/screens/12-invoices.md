# Screen 12 – Invoices

- **Routes:** `/invoices`, `/invoices/[id]`, public read-only page `/i/[token]`
- **Phase:** 2 (invoice records are created from phase 1 whenever a membership is sold)
- **Roles:** owner, manager, receptionist
- **Reads:** `invoices`, `payments`, `members`, `gyms` · **Writes:** `invoices` (share token only)

## Purpose
List, open, print and share invoices and receipts.

## Layout
- List: invoice number, member, date, total, paid, balance, status (paid, part paid, unpaid). Search by number or member, filter by status and date.
- Detail: gym header (name, address, GSTIN), member, line items, tax line, total, payments received, balance. Buttons: **Share**, **Print**, **Download PDF**, **Collect payment** (when there is a balance).

## Invoice rules
- Number is sequential per gym with a prefix from `16-settings.md`, for example `INV-0001`. Never reused.
- Tax: show one GST line in the first version. Splitting into CGST and SGST (or IGST) is a later improvement.
- Invoices are not edited after creation. A mistake is fixed by voiding the payment and creating a new membership or invoice as the owner decides.

## Sharing
- **Share** opens WhatsApp for the member with a short message and a link to `/i/[token]`, a public read-only page with the invoice and a print button. The token is random and can be revoked.
- PDF is generated on the server.

## API
- `GET /api/invoices?search=&status=&from=&to=`
- `GET /api/invoices/:id`
- `GET /api/invoices/:id/pdf`
- `POST /api/invoices/:id/share-token`

## Connects to
- **From:** `05-member-profile.md` (Payments tab), `06-collect-payment.md` (after save), `10-payments-dues.md`, "More" menu.
- **To:** `05-member-profile.md`, `06-collect-payment.md`.

## Done when
- [ ] PDF matches the on-screen invoice, including tax.
- [ ] Public page shows nothing except that invoice.
- [ ] Revoking the token breaks the old link.
