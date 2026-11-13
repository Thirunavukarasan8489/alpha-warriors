# Screen 16 – Settings

- **Route:** `/settings`
- **Phase:** 2
- **Roles:** owner (manager can view)
- **Reads / writes:** `gyms`, `users` (own password)

## Purpose
Gym details, defaults, message templates and bulk member import.

## Layout
Tabs (phone: a list of sections):

| Section | Contains |
| --- | --- |
| Gym | Name, logo, address, phone, GSTIN, state |
| Billing defaults | Default tax percent, invoice prefix, member code prefix, "expiring soon" days (default 7) |
| Reminders | The three message templates and day offsets used by `13-reminders.md` |
| Import members | Upload, preview, confirm (below) |
| Branches | Link to `20-branches.md` (phase 3) |
| Account | Change own password, sign out |

## Import members
1. Download the template (Excel or CSV): name, phone, plan, start date, end date, amount paid, balance.
2. Upload. The server returns a **preview**, not a save: valid rows, and errors per row (bad phone, duplicate phone, unknown plan, bad date).
3. Fix the file and re-upload, or import only the valid rows. Duplicate phones are skipped.
4. Confirm. Creates members and memberships, and invoices and payments when amounts are given. Shows a summary and a downloadable error file.

## API
- `GET /api/settings`, `PATCH /api/settings`
- `GET /api/settings/templates`, `PUT /api/settings/templates`
- `POST /api/members/import?preview=true`, `POST /api/members/import`
- `POST /api/auth/change-password`

## Connects to
- **From:** "More" menu, `13-reminders.md` (Edit template), `03-members-list.md` (empty state import link).
- **To:** `03-members-list.md` after import, `20-branches.md`, `15-staff.md`.

## Rules
- Import is safe to repeat. A phone number that already exists is never duplicated.
- Template placeholders are validated, and a preview shows a sample message.

## Done when
- [ ] A 500-row file previews in a few seconds and reports every bad row.
- [ ] Changing the invoice prefix does not renumber old invoices.
