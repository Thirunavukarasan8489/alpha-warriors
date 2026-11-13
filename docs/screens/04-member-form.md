# Screen 04 – Add or edit member

- **Routes:** `/members/new`, `/members/[id]/edit`
- **Phase:** 1 (leads prefill added in phase 3)
- **Roles:** owner, manager, receptionist
- **Reads:** `plans`, `users` (trainers), `members` (edit) · **Writes:** `members`, `memberships`, `invoices`, `payments`

## Purpose
Create or correct a member record. When creating, it can also sell the first plan and take the first payment in one go.

## Layout
- Phone: bottom sheet or full-screen form with sticky Save bar. Desktop: side drawer or centred page.
- Sections: Details, Plan (create only), First payment (create only).

## Fields
| Field | Rules |
| --- | --- |
| Photo | Camera or upload, resized client-side before upload |
| Name | Required |
| Phone | Required. Digits with country code, unique per gym |
| WhatsApp | "Same as phone" checkbox on by default |
| Date of birth, gender, address, notes | Optional |
| Trainer | Optional, only staff with the trainer role |
| Plan | Required on create. Price and end date shown live: end date = start date + plan duration |
| Start date | Defaults to today |
| Discount | Optional amount, cannot exceed the price |
| First payment | Optional amount and payment mode with split rows (same as `06-collect-payment.md`) |

`memberCode` is generated automatically (prefix and next number per gym).

## Actions
| Action | Result | API |
| --- | --- | --- |
| Save | Creates the member, and the membership, invoice and payment when filled, in one transaction. Then opens the profile | `POST /api/members` |
| Save and collect payment | Saves, then opens `06-collect-payment.md` for the new invoice | same |
| Save (edit) | Updates details only. Plan changes are done from the profile | `PATCH /api/members/:id` |

## Rules
- Duplicate phone: inline error naming the existing member, with a link to their profile.
- Edit never changes memberships or invoices.

## Connects to
- **From:** `03-members-list.md` (Add), `02-dashboard.md` (plus button), `05-member-profile.md` (Edit), `17-leads.md` (Convert, prefilled).
- **To:** `05-member-profile.md` after save, `06-collect-payment.md`.

## Done when
- [x] A new member with plan and payment is created atomically or not at all.
- [x] Duplicate phones are blocked on the server, not just the form.
- [x] Works with a phone camera for the photo.
