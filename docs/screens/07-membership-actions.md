# Screen 07 – Membership actions (modals)

- **Route:** none. Sheets or drawers opened from the member profile and a few lists.
- **Phase:** 1 (renew, freeze, resume) and 2 (extend, upgrade, end)
- **Roles:** renew and freeze or resume: owner, manager, receptionist. Extend, upgrade, end: owner and manager. These are defaults and can be changed in one place, `lib/rbac.ts`.
- **Reads:** `memberships`, `plans` · **Writes:** `memberships`, `invoices`, `auditLog`

## Purpose
Change a member's membership safely. Every action keeps history and writes an audit entry.

## Opened from
`05-member-profile.md` (header and More menu), `03-members-list.md` and `02-dashboard.md` (Renew on expiring and expired rows).

## Actions
| Action | What the sheet asks | Rule | API |
| --- | --- | --- | --- |
| **Renew** | Plan (current plan preselected), discount, optional first payment | New membership starts the day after the old end date, or today if already expired. Sets `renewedFromId`. Creates an invoice. Can open `06-collect-payment.md` | `POST /api/memberships` |
| **Freeze** | Start date (today), optional expected resume date, reason | Status becomes `frozen`. No check-in warnings about expiry while frozen | `POST /api/memberships/:id/freeze` |
| **Resume** | Resume date (today) | Status back to `active`. End date moves later by the days frozen | `POST /api/memberships/:id/resume` |
| **Extend** | Days to add, reason | Adds days to the end date. Reason required | `POST /api/memberships/:id/extend` |
| **Upgrade** | New plan | Shows a price breakdown: credit for unused days = price paid divided by total days, times days left. New price minus credit is the invoice. Old membership ends today, new one starts today | `POST /api/memberships/:id/upgrade` |
| **End** | Reason, confirmation | Status `ended`, end date set to today. Refunds are not handled here | `POST /api/memberships/:id/end` |

## Rules
- Price and tax are copied from the plan onto the membership, so later plan edits do not change old sales.
- Every action writes an `auditLog` row with who, what and why.
- Status changes follow the diagram in `AGENTS.md` (Active, Expired, Frozen, Ended). Only Renew brings an expired member back to active.

## Connects to
- **From:** `05-member-profile.md`, `03-members-list.md`, `02-dashboard.md`.
- **To:** `06-collect-payment.md` after Renew or Upgrade when an amount is due. Plan picker reads `09-plans.md`.

## Done when
- [x] Each action is covered by date and price calculations with audit logging.
- [x] Receptionist cannot call extend, upgrade or end through the API.
- [x] History on the profile shows every change.
