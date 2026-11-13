# Screen 20 – Branches

- **Routes:** `/settings/branches`, plus the branch switcher in the app header
- **Phase:** 3
- **Roles:** owner
- **Reads / writes:** `branches`, `users.branchIds`

## Purpose
Run more than one gym location from one account, with separate numbers for each.

## Layout
- List of branches with name, address, phone and active toggle. Add and edit in a drawer.
- **Branch switcher** in the header: "All branches" (owner only) or one branch. The choice is kept per user and sent as `branchId` on every list and report request.

## Actions
| Action | Result | API |
| --- | --- | --- |
| Add or edit branch | Saves the branch | `POST /api/branches`, `PATCH /api/branches/:id` |
| Deactivate branch | Hides it from the switcher. Data stays | `PATCH /api/branches/:id` |
| Assign staff | Set from `15-staff.md` | none |

## Rules
- Every gym starts with one default branch, created at registration in `01-login.md`.
- Staff only see branches in their `branchIds`. The server filters by those even if the client asks for another.
- Members, attendance, payments and expenses carry a `branchId`. A member belongs to one branch.

## Connects to
- **From:** `16-settings.md`, header on every screen.
- **To:** all list and report screens through the `branchId` filter.

## Done when
- [ ] "All branches" totals equal the sum of each branch.
- [ ] A manager of branch A cannot read branch B data by editing the request.
