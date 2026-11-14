# Screen 14 – Expenses

- **Route:** `/expenses`
- **Phase:** 2
- **Roles:** owner and manager
- **Reads / writes:** `expenses`

## Purpose
Record what the gym spends so profit can be reported.

## Layout
- Month picker at the top with the month total and a small category breakdown.
- Phone: cards by date. Desktop: table. Add button is the plus button.

## Fields
| Field | Rules |
| --- | --- |
| Date | Defaults to today |
| Category | Rent, electricity, salary, equipment, maintenance, marketing, other, plus custom categories |
| Amount | Required |
| Note | Optional |
| Branch | Defaults to the current branch |

## Actions
| Action | Result | API |
| --- | --- | --- |
| Add or edit | Saves the expense | `POST /api/expenses`, `PATCH /api/expenses/:id` |
| Delete | Soft delete with confirmation | `DELETE /api/expenses/:id` |

## Rules
- Payroll runs from `21-payroll.md` create expenses in the salary category automatically. They are read-only here.

## Connects to
- **From:** "More" menu, `11-reports.md` (expense summary), `21-payroll.md`.
- **To:** `11-reports.md`.

## Done when
- [x] Month total equals the expense summary report.
- [x] Receptionist cannot open this screen or call its API.
