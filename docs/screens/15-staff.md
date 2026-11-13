# Screen 15 – Staff

- **Routes:** `/staff`, `/staff/new`, `/staff/[id]`
- **Phase:** 2 (payroll in phase 3)
- **Roles:** owner (manager can view)
- **Reads / writes:** `users`

## Purpose
Create staff accounts, give them roles and branches, and turn access off when someone leaves.

## Layout
- List: name, phone, role, branches, active toggle. Add button is the plus button.
- Detail or form: name, phone, role (manager, receptionist, trainer), branches, active.

## Roles
Defined in `AGENTS.md` and enforced by `lib/rbac.ts`. This screen only assigns them.

## Actions
| Action | Result | API |
| --- | --- | --- |
| Add staff | Creates the user with a one-time password shown once. **Share** opens WhatsApp with the sign-in details for the owner to send | `POST /api/staff` |
| Change role or branches | Takes effect on the next request | `PATCH /api/staff/:id` |
| Reset password | New one-time password shown once, same Share button | `POST /api/staff/:id/reset-password` |
| Deactivate | Blocks sign-in. History stays. Owner cannot deactivate themselves | `PATCH /api/staff/:id` |

## Rules
- The owner role belongs to the gym creator and cannot be removed.
- The one-time password is never stored in clear text and is not shown again after closing the dialog.
- Trainers appear in the Trainer picker in `04-member-form.md`.

## Connects to
- **From:** "More" menu, `16-settings.md`.
- **To:** `21-payroll.md` (salary details), `20-branches.md` (branch list for assignment).

## Done when
- [ ] A deactivated user is signed out on their next request.
- [ ] Role changes are reflected in the API checks, not just in the menu.
