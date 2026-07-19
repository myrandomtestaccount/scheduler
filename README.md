# SME Scheduler

A tiny local scheduler for assigning work to system/application SMEs. It has no build step, no package manager, and no database.

## Run

For single-browser testing, open `index.html` in a browser.

The same files work on macOS and Windows 11, so you can test on a Mac and copy the folder to a Windows PC.

Open `admin.html` for admin tools.

For shared state on one computer, launch the tiny local server instead:

```bash
node server.js
```

Then open `http://localhost:4173`.

On Windows, double-click `start-shared.bat` if Node.js is installed.

## Features

- Primary users land on the assignment queue, not the admin dashboard.
- Pick a system/app and see that system’s assigned SME queue.
- Available SMEs are highlighted.
- SMEs who are scheduled later today are grayed out with their login time and can still be picked manually.
- SMEs who are not scheduled, done for the day, or on holiday are disabled.
- Mark a selected SME assigned and advance the queue.
- See today’s ticket ownership ranking on the main page.
- Admin tools live on a separate `admin.html` page.
- Admins can add/remove users, systems/apps, schedules, breaks, extra slots, and holidays.
- Admins can choose an assignment recommendation style: schedule-first, balanced, or app expertise first.
- Admin setup sections are locked by default; unlock before editing users, holidays, shift presets, systems/apps, assignment rules, or data backups.
- Admins can define what shift presets like `Early`, `Regular`, and `Late` mean.
- Shift presets only save time; any user can still have a custom shift on any day.
- Schedules support different shifts for the same user on different days.
- Schedule graph supports day view and week view for all users.
- Day graph rows are ordered by the user list and can be clicked to prefill schedule entry.
- Export/import JSON backups.

## Data Storage

When opened directly from `index.html`, the app saves to browser `localStorage`.

Use `Export JSON backup` before moving data to another computer or browser profile. Use `Import JSON backup` to restore it.

When launched with `node server.js`, the app uses a shared JSON file instead:

```text
~/Documents/scheduler-config/scheduler-state.json
```

On this Mac that resolves to `/Users/antonmaslov/Documents/scheduler-config/scheduler-state.json`. On Windows it resolves to `C:\Users\<you>\Documents\scheduler-config\scheduler-state.json`.

You can choose a different shared folder:

```bash
node server.js --config-dir "/path/to/scheduler-config"
```

Shared mode uses optimistic locking. Every save includes the file revision that the browser last loaded. If someone else changed the file first, the save is rejected, the newest file is loaded, and the user must apply the change again.

## Primary User Flow

1. Open `index.html`.
2. Choose a system/app.
3. Review the queue.
4. Click the SME you want to assign.
5. Click `Mark selected user assigned`.

## Admin Flow

Click `Admin tools` from the main page, or open `admin.html` directly.

Admin sections:

- `Users`: add/remove team members.
- `Schedules`: add weekly schedules, click the all-user graph to prefill user/day/time, add breaks, add extra coverage slots, and review readable user-by-user schedules.
- `Assignment rules`: choose how recommendations are sorted. The default is schedule-first.
- `Shift presets`: define reusable shift names and times.
- `Systems / apps`: add systems and assign/reorder primary SMEs.
- `Holidays`: add user-specific or all-team holidays.
- `Data`: export/import JSON backups.

## Eastern Time Scheduling

All schedule times are interpreted in `America/New_York` time. The UI labels this as Eastern Time because the actual offset changes between EST and EDT during the year.

Recommendation sorting can use schedule start time, per-system SME order, total tickets assigned today, and current same-user assignment streak.

## GitHub

This repository is intentionally small:

```text
index.html
admin.html
styles.css
app.js
server.js
start-shared.bat
start-shared.command
README.md
.gitignore
```

That makes it easy to commit, review, and copy to another machine.
