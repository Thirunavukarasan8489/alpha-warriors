# Screen 01 – Login and register

- **Routes:** `/login`, `/register`
- **Phase:** 1
- **Roles:** anyone with a staff account. Members use the portal instead (see `22-member-portal.md`).
- **Reads:** `users`, `gyms` · **Writes:** `gyms`, `branches`, `users` (register only)

## Purpose
Let staff sign in, and let a new gym owner create a gym account.

## Layout
- Phone and desktop: one centred card, logo on top, no navigation.
- `/login` has phone-or-email, password with show/hide, and a Sign in button. A link switches to `/register`.
- `/register` has gym name, owner name, phone, email (optional), password.

## Actions
| Action | Result | API |
| --- | --- | --- |
| Sign in | Sets an httpOnly session cookie, then goes to `next` query value or `/` | `POST /api/auth/login` |
| Register gym | Creates the gym, one default branch and an owner user, signs in, goes to `/` | `POST /api/auth/register` |
| Forgot password | Staff: shows "Ask your gym owner to reset it from Staff". Owner reset by email link is a later task | none |

## Rules
- Hash passwords with bcrypt. Rate-limit login by IP and by phone.
- Wrong credentials show one message that does not say which part was wrong.
- Phone numbers are stored with country code, digits only (for example `919876543210`).
- Deactivated users cannot sign in.

## Connects to
- **From:** any protected route when there is no session (redirect with `?next=`).
- **To:** `02-dashboard.md` after sign in. A brand-new gym lands on the dashboard checklist.

## States
- Loading: button spinner, form disabled.
- Error: inline message under the form.

## Done when
- [x] Sign in, sign out and session expiry work on phone and desktop.
- [x] Register creates exactly one gym, one branch and one owner.
- [x] Protected pages redirect to `/login` without a session.
