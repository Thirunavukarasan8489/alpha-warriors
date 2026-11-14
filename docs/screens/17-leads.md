# Screen 17 – Leads

- **Route:** `/leads`
- **Phase:** 3
- **Roles:** owner, manager, receptionist
- **Reads / writes:** `leads` (and `members` on convert)

## Purpose
Track enquiries from first contact to joining.

## Layout
- Top: today's follow-ups, then the pipeline. Phone: status tabs. Desktop: columns.
- Statuses: New, Contacted, Trial, Won, Lost.

## Fields
Name, phone, source (walk-in, referral, social media, other), interest, follow-up date, assigned to, status, notes.

## Actions
| Action | Result | API |
| --- | --- | --- |
| Add or edit | Saves the lead | `POST /api/leads`, `PATCH /api/leads/:id` |
| Move status | Updates the lead | `PATCH /api/leads/:id` |
| Share message | Opens WhatsApp to the lead with a greeting or follow-up text (manual, same builder as `13-reminders.md`) | none |
| **Convert** | Opens `04-member-form.md` prefilled with the lead's name and phone. On save, marks the lead Won and stores `convertedMemberId` | `POST /api/leads/:id/convert` |

## Connects to
- **From:** "More" menu, `02-dashboard.md` (follow-ups, optional).
- **To:** `04-member-form.md`, then `05-member-profile.md`.

## Done when
- [x] Overdue follow-ups are shown first.
- [x] A converted lead links to the new member.
