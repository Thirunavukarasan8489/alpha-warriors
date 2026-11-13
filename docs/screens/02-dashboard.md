# Screen 02 – Dashboard

- **Route:** `/`
- **Phase:** 1
- **Roles:** owner, manager, receptionist. Trainer sees a reduced "My members" version.
- **Reads:** `payments`, `invoices`, `members`, `memberships`, `attendance` · **Writes:** none

## Purpose
Show the owner and front desk what needs attention today, in one screen, and give three quick actions.

## Layout
- Phone: stacked cards, two per row for the number cards, then lists. Floating plus button bottom right.
- Desktop: four number cards in a row, revenue chart beside the lists.
- Header shows the gym name and, from phase 3, the branch switcher (see `20-branches.md`).

## Content
| Block | Meaning | Tap goes to |
| --- | --- | --- |
| Today's collection | Sum of non-void payments received today | `10-payments-dues.md` (Transactions tab, today) |
| New members | Members joined this week and this month | `03-members-list.md` sorted by join date |
| Check-ins today | Attendance rows for today | `08-attendance.md` (Today tab) |
| Expiring in 7 days | Active memberships ending within the "expiring soon" days setting | `03-members-list.md?status=expiring` |
| Dues total | Sum of invoice balances above zero | `10-payments-dues.md` (Dues tab) |
| Revenue chart | Monthly collection, last 6 months. Hidden from receptionists | `11-reports.md` |
| Expiring soon list | Top 5 rows: photo, name, end date, Renew button | `05-member-profile.md`, Renew opens `07-membership-actions.md` |
| Recent payments | Last 5 payments | `10-payments-dues.md` |

## Quick actions (plus button)
- Add member → `04-member-form.md`
- Collect payment → `06-collect-payment.md` (asks for a member first)
- Mark attendance → `08-attendance.md`

## API
- `GET /api/dashboard?branchId=` returns every number and both lists in one response.

## States
- First run (no plans, no members): show a three-step checklist: add a plan (`09-plans.md`), add the first member, collect the first payment. Hide the empty cards.
- Loading: card skeletons. Error: retry button.

## Done when
- [x] Every number matches its drill-down list.
- [x] Receptionist sees no revenue chart or profit figures.
- [x] Loads in one request and works at 360 px wide.
