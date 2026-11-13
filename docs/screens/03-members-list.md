# Screen 03 – Members list

- **Route:** `/members`
- **Phase:** 1
- **Roles:** owner, manager, receptionist. Trainer sees only members assigned to them.
- **Reads:** `members`, `memberships`, `invoices` · **Writes:** none

## Purpose
Find any member fast and see who is active, expiring, expired or owes money.

## Layout
- Phone: search box on top, a row of filter chips, then cards (photo, name, plan, end date, status badge, dues amount). Add button is the plus button.
- Desktop (above 900 px): the same data as a table with sortable columns and the Add button in the page header.

## Controls
- **Search:** name, phone or member code. Debounced, server side.
- **Filter chips:** All, Active, Expiring (next 7 days), Expired, Frozen, Dues, No plan. Chips can be combined with search. The `status` query value comes from the URL so dashboard cards can deep-link here.
- **Sort:** name, end date (default for Expiring), join date, dues.
- **Pagination:** 25 per page, "load more" on phone.

## Row actions
| Action | Result |
| --- | --- |
| Tap row | Opens `05-member-profile.md` |
| Call | `tel:` link |
| WhatsApp | `wa.me` link to the member, no message |
| Renew (on expired or expiring rows) | Opens `07-membership-actions.md` |

## API
- `GET /api/members?search=&status=&sort=&page=&branchId=`

## Connects to
- **From:** `02-dashboard.md` (cards and lists), `11-reports.md` (drill-down), `16-settings.md` (after import), bottom tab "Members".
- **To:** `04-member-form.md` (Add), `05-member-profile.md`, `07-membership-actions.md`.

## States
- Empty (no members): illustration, "Add your first member" button, and "Import from Excel" link to `16-settings.md`.
- Empty search: "No match" with a clear-filters button.

## Done when
- [x] Search stays fast at 5,000 members (uses the `gymId + name` and `gymId + phone` indexes).
- [x] Status chips agree with the status rules in `AGENTS.md`.
- [x] Filters and search survive a page reload through the URL.
