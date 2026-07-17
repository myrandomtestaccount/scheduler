# SME Scheduler

A tiny local-only scheduler for assigning work to system/application SMEs. It has no build step, no server, no package manager, and no database.

## Run

Open `index.html` in a browser.

The same files work on macOS and Windows 11, so you can test on a Mac and copy the folder to a Windows PC.

## Features

- Add and remove users.
- Add schedule blocks per user in Eastern Time.
- Add and remove systems/apps.
- Assign primary SMEs to each system from the available user list.
- Reorder primary SMEs to control the rotation queue.
- Suggest the next primary SME when available.
- Suggest an available fallback user when the next primary SME is unavailable.
- Mark a user assigned and advance the primary queue.
- Export/import JSON backups.

## Data Storage

The app saves automatically to browser `localStorage`.

Use `Export JSON backup` before moving data to another computer or browser profile. Use `Import JSON backup` to restore it.

Because this version has no server or database, saved data belongs to the browser/profile that opened it. For a shared Windows PC, use one shared browser/profile or move data with JSON export/import.

## Eastern Time Scheduling

All schedule times are interpreted in `America/New_York` time. The UI labels this as Eastern Time because the actual offset changes between EST and EDT during the year.

Lower priority numbers win fallback selection. For example, priority `1` is picked before priority `2`.

## GitHub

This repository is intentionally small:

```text
index.html
styles.css
app.js
README.md
.gitignore
```

That makes it easy to commit, review, and copy to another machine.
