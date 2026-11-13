# Screen 08 – Attendance

- **Route:** `/attendance`
- **Phase:** 1 (biometric devices are out of scope for now)
- **Roles:** owner, manager, receptionist. Trainer sees check-ins for their members.
- **Reads:** `members`, `memberships`, `invoices`, `attendance` · **Writes:** `attendance`

## Purpose
Mark who came to the gym today, and find who has stopped coming.

## Layout
- Top: search box (name, phone or member code) and a QR scan button.
- Tabs: **Today**, **Missed 7+ days**.
- Phone: bottom tab "Attendance". Desktop: a wide search box at the front desk, list below.

## Today tab
- Search results show photo, name, status badge and a **Check in** button.
- Below results, today's list: time, name, source (manual or qr), and an Undo button.
- Date picker to look at another day. Only owner and manager can add check-ins for past dates.

## Check-in rules
- Expired membership or pending dues: allow check-in but show a warning banner with a link to `07-membership-actions.md` (Renew) or `06-collect-payment.md`.
- Frozen membership: show a warning, ask for confirmation.
- Already checked in today: ask for confirmation instead of adding a duplicate.
- Undo: receptionist within 10 minutes, owner and manager any time.

## Missed tab
- Members whose last visit is older than the number of days set (default 7), active memberships only. Each row has last visit date, **Call**, and **Share reminder** (a WhatsApp message built from the template in `13-reminders.md`).

## QR scanning
- Uses the phone browser camera (HTTPS is required). The QR holds the `memberCode`, shown from `05-member-profile.md` ("Show QR").

## API
- `POST /api/attendance` with `memberId` and `source`
- `DELETE /api/attendance/:id`
- `GET /api/attendance?date=`
- `GET /api/attendance/absent?days=7`

## Connects to
- **From:** `02-dashboard.md` (check-ins card), plus button, bottom tab.
- **To:** `05-member-profile.md`, `07-membership-actions.md`, `06-collect-payment.md`, `13-reminders.md`.

## Done when
- [x] A check-in takes two taps or one scan.
- [x] No duplicate check-ins in the same day without confirmation.
- [x] Missed list matches the dashboard and reports.
