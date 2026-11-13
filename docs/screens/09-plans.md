# Screen 09 – Plans

- **Route:** `/plans`
- **Phase:** 1
- **Roles:** owner and manager edit. Receptionist can view.
- **Reads / writes:** `plans`

## Purpose
Define the membership plans the gym sells.

## Layout
- Phone: plan cards (name, duration, price, tax, active toggle). Add button is the plus button.
- Desktop: cards in a grid, or a table.

## Fields
| Field | Rules |
| --- | --- |
| Name | Required, for example "Monthly" or "3 Months" |
| Duration in days | Presets 30, 90, 180, 365, or custom |
| Price | Required. Integer paise in storage, rupees on screen |
| Tax percent | Defaults to the gym setting from `16-settings.md` |
| Sessions (optional, phase 3) | Number of PT sessions for training packages, used by `19-training.md` |
| Active | Inactive plans are hidden from pickers |

## Actions
| Action | Result | API |
| --- | --- | --- |
| Add or edit | Saves the plan | `POST /api/plans`, `PATCH /api/plans/:id` |
| Deactivate | Hides the plan. Existing memberships are untouched | `PATCH /api/plans/:id` |
| Delete | Only when no membership has used it, otherwise deactivate | `DELETE /api/plans/:id` |

## Rules
- Changing a price never changes memberships already sold, because the price is copied onto each membership.

## Connects to
- **From:** `02-dashboard.md` first-run checklist, "More" menu.
- **Used by:** the plan picker in `04-member-form.md` and `07-membership-actions.md`.

## States
- Empty: "Create your first plan" with suggested presets (Monthly, Quarterly, Half-yearly, Yearly) the owner can accept in one tap.

## Done when
- [x] Deactivated plans cannot be sold but still show on old memberships.
- [x] Receptionist cannot create, edit or delete (server-enforced).
