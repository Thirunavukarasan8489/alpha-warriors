# Screen 11 – Reports

- **Route:** `/reports`
- **Phase:** 1 (daily collection, expiring, dues, new members, revenue by plan). Phase 2 adds expense summary and profit.
- **Roles:** owner and manager see everything. Receptionist sees daily collection, expiring and dues only.
- **Reads:** `payments`, `memberships`, `members`, `invoices`, `attendance`, `expenses`, `sales` · **Writes:** none

## Purpose
Answer "how is the gym doing" with a few clear reports.

## Layout
- Report list on the left (desktop) or as a first screen (phone). Selecting one opens it with a date range picker and branch filter at the top.
- Each report has a table, a small chart where useful, and **Export CSV** and **Print**.

## Reports
| Report | Shows | Phase |
| --- | --- | --- |
| Daily collection | Payments by day and by mode | 1 |
| Expiring and expired | Memberships ending in a range, and recently expired | 1 |
| Dues | All unpaid invoice balances | 1 |
| New members | Members joined per day or month | 1 |
| Revenue by plan | Sales per plan, count and amount | 1 |
| Attendance summary | Check-ins per day, per member frequency | 1 |
| Expense summary | Expenses by category and month, from `14-expenses.md` | 2 |
| Profit | Collection plus sales minus expenses. Owner and manager only | 2 |

## API
- `GET /api/reports/:name?from=&to=&branchId=`

## Connects to
- **From:** `02-dashboard.md` (revenue chart), "More" menu.
- **To (drill-down):** `10-payments-dues.md`, `03-members-list.md` (with filters), `05-member-profile.md`, `14-expenses.md`.

## Rules
- All amounts in rupees with Indian digit grouping. Dates in Asia/Kolkata.
- Date ranges are inclusive. Reports never include void payments.

## Done when
- [x] Every total ties to the list it drills down to.
- [x] CSV export opens correctly in Excel.
- [x] Receptionist requests for other reports are rejected on the server.
