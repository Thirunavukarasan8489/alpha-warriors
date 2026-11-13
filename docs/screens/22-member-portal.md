# Screen 22 – Member portal

- **Route:** `/portal/[token]`
- **Phase:** 3
- **Roles:** the member, read-only. No staff sign-in.
- **Reads:** `members`, `memberships`, `invoices`, `attendance`, `dietPlans`, `workoutPlans` · **Writes:** none

## Purpose
Let a member check their own plan, dues and attendance on their phone without installing anything.

## Access
- Staff create a link from `05-member-profile.md` ("Share portal link"). The link holds a long random token, stored hashed on the member, and is shared by **WhatsApp manually**. There is no password and no automatic SMS or OTP.
- Staff can revoke or regenerate the token. An old link then shows "This link is no longer valid".

## Layout
- Single mobile-first page, no navigation bar. Gym name and logo on top.
- Sections: current plan with days left and end date, dues and unpaid invoices, recent attendance with a month count, invoice list (opens the public page from `12-invoices.md`), current diet and workout plans if any, the member's QR code for check-in.

## API
- `GET /api/portal/:token` returns only this member's data.

## Rules
- Never expose other members, other gyms, staff notes or internal audit data.
- Rate-limit token lookups and return the same response for unknown and revoked tokens.
- No pay online button in the first version. Dues are paid at the front desk.

## Connects to
- **From:** the link shared from `05-member-profile.md`.
- **To:** `12-invoices.md` public invoice page.

## Done when
- [ ] A revoked or guessed token shows nothing about any member.
- [ ] Page works on a low-end phone over a slow connection.
