# Screen 21 – Payroll

- **Route:** `/staff/payroll`
- **Phase:** 3
- **Roles:** owner
- **Reads / writes:** `users` (payroll details), `payrollRuns`, `expenses`

## Purpose
Work out and record monthly staff pay: salary, commission, deductions and leave.

## Data
- Extend `users` with `payroll`: base salary, commission percent. Add `payrollRuns` with one row per staff per month: month, base, commission, deductions, leave days, net, status (draft or paid), paid date.

## Layout
- Month picker, then a table or cards of staff: base, commission, deductions, leave, net.
- Edit a row's deductions and leave before paying. **Mark paid** per row or for all.

## Rules
- Commission can be a percent of sales credited to the staff member (from `18-sales.md` or plan sales), when the owner enables it.
- Marking a row paid creates an expense in the salary category (see `14-expenses.md`) and freezes the row.
- A paid row is not edited. A correction is a new adjustment line next month.

## Actions
| Action | Result | API |
| --- | --- | --- |
| Open month | Builds draft rows from staff and settings | `GET /api/payroll?month=` |
| Edit draft row | Saves deductions, leave | `PATCH /api/payroll/:id` |
| Mark paid | Locks row, creates the expense | `POST /api/payroll/:id/pay` |
| Share payslip | Opens WhatsApp with a short payslip text for the owner to send | none |

## Connects to
- **From:** `15-staff.md`.
- **To:** `14-expenses.md`, `15-staff.md`.

## Done when
- [x] Net pay maths is covered by tests.
- [x] Each paid row shows once in expenses and once in the salary report.
