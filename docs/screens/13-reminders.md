# Screen 13 – Reminders

- **Route:** `/reminders`
- **Phase:** 2
- **Roles:** owner, manager, receptionist
- **Reads:** `memberships`, `invoices`, `members`, `messages`, `settings` · **Writes:** `messages` (log of shares)

## Purpose
Show who needs a reminder and let staff send it on WhatsApp by hand. **The app never sends a message by itself.** It builds the message and opens WhatsApp with it ready. Staff press send.

## Layout
- Tabs: **Expiring soon**, **Expired**, **Dues**. Counts on each tab.
- Phone: cards with photo, name, relevant date or amount, and a **Share** button. Desktop: table.
- Rows already shared today show "Reminded" with the time and who shared. A filter hides them.
- **Next member mode:** after Share, a "Next" bar moves to the following row so staff can work through the list quickly.

## Lists
| Tab | Who appears | Default timing (editable in `16-settings.md`) |
| --- | --- | --- |
| Expiring soon | Active memberships ending in the next 3 days | 3 days before expiry |
| Expired | Memberships that ended in the last 3 days | up to 3 days after expiry |
| Dues | Invoices with a balance | any balance |

## Message template
- One template per tab, edited in `16-settings.md` (or from an Edit template link here). Placeholders: `{name}`, `{plan}`, `{endDate}`, `{amount}`, `{gym}`.
- Share link: `https://wa.me/<number>?text=<url-encoded message>`. The number is the member's WhatsApp number with country code.

## Actions
| Action | Result | API |
| --- | --- | --- |
| Share | Opens WhatsApp, then writes a `messages` row (`type`, `sharedAt`, `sharedBy`) | `POST /api/reminders/log` |
| Open profile | `05-member-profile.md` | none |
| Collect (Dues tab) | `06-collect-payment.md` | none |
| Renew (Expiring and Expired tabs) | `07-membership-actions.md` | none |

## API
- `GET /api/reminders?type=expiring|expired|dues`

## Connects to
- **From:** "More" menu, `02-dashboard.md` cards, `08-attendance.md` (missed list uses the same builder).
- **To:** `05-member-profile.md`, `06-collect-payment.md`, `07-membership-actions.md`, `16-settings.md`.

## Done when
- [ ] No server job sends any message.
- [ ] Missing or invalid WhatsApp numbers show a warning instead of a broken link.
- [ ] Logging a share never blocks opening WhatsApp.
