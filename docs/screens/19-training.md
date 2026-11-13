# Screen 19 – Training (diet, workout, PT, PAR-Q)

- **Route:** `/members/[id]/training` (a tab on the profile)
- **Phase:** 3
- **Roles:** owner, manager, trainer for assigned members. Receptionist can view.
- **Reads / writes:** `ptSessions`, `dietPlans`, `workoutPlans`, `parqForms`

## Purpose
Everything a trainer records for one member.

## Sections
| Section | Contains |
| --- | --- |
| Diet plan | Meals by time of day (or by day), with notes. One current plan, older ones kept |
| Workout plan | Days, each with exercises, sets and reps |
| PT sessions | Date, trainer, notes. If the member's plan has a session count (see `09-plans.md`), shows sessions used and left |
| PAR-Q | The standard readiness questions (yes or no), plus name and date as a typed signature. Filled in at the desk, or the member opens a link that staff share by WhatsApp |

## Actions
| Action | Result | API |
| --- | --- | --- |
| Save diet or workout plan | Saves a new version | `PUT /api/members/:id/diet`, `PUT /api/members/:id/workout` |
| Share plan | Opens WhatsApp with the plan as text, or a link to a read-only page | none |
| Log PT session | Adds a session and reduces the sessions left | `POST /api/members/:id/sessions` |
| Create PAR-Q link | Makes a token link for `/parq/[token]`, shared manually | `POST /api/members/:id/parq-link` |
| Submit PAR-Q | Saves answers and signature | `POST /api/parq/:token` |

## Rules
- Trainers only receive data for members assigned to them.
- AI-generated workouts are out of scope for now.
- A "yes" on any PAR-Q question shows a note recommending the member checks with a doctor before starting.

## Connects to
- **From:** `05-member-profile.md` (Training tab).
- **To:** `05-member-profile.md`, `09-plans.md` (sessions), `22-member-portal.md` (shows the current plans).

## Done when
- [ ] Trainer role cannot read other trainers' members.
- [ ] PAR-Q submissions cannot be edited later, only replaced by a new one.
