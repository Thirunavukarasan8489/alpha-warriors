# Screen 05 – Member profile

- **Route:** `/members/[id]`
- **Phase:** 1 (Training tab and portal link in phase 3)
- **Roles:** owner, manager, receptionist. Trainer sees assigned members without payments.
- **Reads:** `members`, `memberships`, `invoices`, `payments`, `attendance`, `messages` · **Writes:** none directly (actions open other screens)

## Purpose
The single place to see everything about one member and to act on their membership.

## Layout
- Header: photo, name, member code, status badge, current plan and end date, dues amount. Call and WhatsApp buttons next to the phone number.
- Primary buttons: **Renew**, **Collect payment**, **More** menu.
- Tabs: Overview, Memberships, Payments, Attendance, Notes. Phase 3 adds Training.
- Phone: tabs scroll horizontally. Desktop: two columns, details on the left, tabs on the right.

## Tabs
| Tab | Shows |
| --- | --- |
| Overview | Current membership with days left, upcoming membership if any, last visit, dues |
| Memberships | History, newest first, with plan, dates, price, status and renewal notes |
| Payments | Invoices with paid and balance, and each payment with mode splits. Share receipt and void (owner and manager) |
| Attendance | Month calendar plus list. Last visit highlighted |
| Notes | Free text notes, edited inline |

## Actions
| Action | Opens |
| --- | --- |
| Renew | `07-membership-actions.md` (Renew) |
| Collect payment | `06-collect-payment.md` |
| More: Freeze or resume, Extend, Upgrade, End | `07-membership-actions.md` |
| More: Edit details | `04-member-form.md` |
| More: Show QR | Full-screen QR of `memberCode`, used by `08-attendance.md` |
| More: Share reminder | Builds the reminder text and opens WhatsApp (same builder as `13-reminders.md`) |
| More: Share portal link (phase 3) | Creates or shows the link for `22-member-portal.md` |
| More: Delete member | Owner only. Soft delete with confirmation |
| Invoice row | `12-invoices.md` detail |

## API
- `GET /api/members/:id` returns the member with current membership, dues and last visit.
- Tabs load their own lists: `GET /api/members/:id/memberships`, `/payments`, `/attendance`.

## Connects to
- **From:** `03-members-list.md`, `02-dashboard.md`, `08-attendance.md`, `10-payments-dues.md`, `12-invoices.md`, `13-reminders.md`, `17-leads.md` (after conversion).
- **To:** the screens in the action table above.

## Done when
- [x] Renew and Collect payment are one tap from the header.
- [x] Trainer role never receives payment data from the API.
- [x] Status badge and dues match the rules in `AGENTS.md`.
