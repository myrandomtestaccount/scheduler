# SME Scheduler

A tiny local-only scheduler for assigning work to system/application SMEs. It has no build step, no server, no package manager, and no database.

## Run

Open `index.html` in a browser.

The same files work on macOS and Windows 11, so you can test on a Mac and copy the folder to a Windows PC.

Open `admin.html` for admin tools.

## Features

- Primary users land on the assignment queue, not the admin dashboard.
- Pick a system/app and see that system’s assigned SME queue.
- Available SMEs are highlighted.
- SMEs who are scheduled later today are grayed out with their login time and can still be picked manually.
- SMEs who are not scheduled, done for the day, or on holiday are disabled.
- Mark a selected SME assigned and advance the queue.
- Admin tools live on a separate `admin.html` page.
- Admins can add/remove users, systems/apps, schedules, breaks, extra slots, and holidays.
- Schedules support quick `Early`, `Regular`, and `Late` shift templates.
- Timeline view lets admins click a day graph to prefill breaks or extra coverage slots.
- Export/import JSON backups.

## Data Storage

The app saves automatically to browser `localStorage`.

Use `Export JSON backup` before moving data to another computer or browser profile. Use `Import JSON backup` to restore it.

Because this version has no server or database, saved data belongs to the browser/profile that opened it. For a shared Windows PC, use one shared browser/profile or move data with JSON export/import.

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
- `Schedules`: add weekly schedules, choose quick shifts, add breaks, add extra coverage slots, and review the timeline graph.
- `Systems / apps`: add systems and assign/reorder primary SMEs.
- `Holidays`: add user-specific or all-team holidays.
- `Data`: export/import JSON backups.

## Eastern Time Scheduling

All schedule times are interpreted in `America/New_York` time. The UI labels this as Eastern Time because the actual offset changes between EST and EDT during the year.

Lower priority numbers stay available for future sorting behavior. The current primary-user queue is controlled by the per-system SME order.

## GitHub

This repository is intentionally small:

```text
index.html
admin.html
styles.css
app.js
README.md
.gitignore
```

That makes it easy to commit, review, and copy to another machine.
