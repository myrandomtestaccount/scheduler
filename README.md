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

## Functionality Reference

### Running and Storage

- `index.html`: primary assignment page for delegators and regular users.
- `admin.html`: admin-only setup page for team, schedule, coverage, delegation, incidents, and backup settings.
- Static mode: opening the HTML files directly stores data in browser `localStorage`.
- Shared mode: `node server.js` serves the app at `http://localhost:4173` and stores shared state in a JSON file.
- Windows launcher: `start-shared.bat` starts shared mode on Windows when Node.js is installed.
- macOS launcher: `start-shared.command` starts shared mode on macOS.
- Shared-state conflict handling: saves use optimistic locking, reload newer shared data when another browser saves first, and show a sync warning.
- JSON backup: admins can export, import, preview, and reset scheduler data.

### Main Assignment Page

- Coverage picker: choose the system/app that needs a ticket owner.
- Current queue: shows the recommended SME order for the selected coverage.
- Availability badges: labels users as available, later today, on break, done today, not scheduled, or on holiday.
- Assignment action: selecting an SME and clicking `Mark selected user assigned` records the ticket owner and advances the relevant queue.
- Queue advancement: normal SME assignments rotate the queue to the next SME for that coverage.
- `Other` option: lets a delegator pick someone from the wider roster without advancing the selected coverage queue.
- Other roster ordering: online users appear by team priority first, then users scheduled later today appear by schedule order.
- Unselectable users: people with no schedule, completed schedule, or holiday are blocked from normal assignment.
- Future assignment speedbump: if everyone is unavailable but someone is scheduled later, the app can warn before assigning far ahead.
- Daily ownership ranking: shows who has received the most tickets today.
- Coverage dashboard: shows all coverage queues, ticket counts, availability, and quick open buttons.
- Recent assignments: shows recent ticket assignments and allows edit/delete when visible.
- Assignment history: records assignment time, coverage, assignee, amended entries, and dev-mode test assignments.
- Current delegator: shows who owns the current delegation slot.
- Incident redirect: when enabled, redirects after assignment to the exact configured URL with no added query parameters.

### Scheduling and Availability

- Weekly schedules: admins can add recurring schedules for selected weekdays.
- Schedule date ranges: schedules can be limited to a start and end date.
- Shift presets: admins can define reusable shift names and times such as early, regular, and late.
- Custom shifts: users can still have custom schedule times on any day.
- Multiple shifts: the same user can have different shifts on different days.
- Breaks: admins can add dated break windows that temporarily block availability.
- Extra slots: admins can add dated extra availability windows outside normal schedules.
- Holidays: admins can mark one user or all users as unavailable for a date.
- Schedule graph: admins can review schedules in day or week view.
- Graph prefill: day-view schedule blocks can prefill the schedule form for quicker edits.
- Forward-time validation: schedule, slot, shift, and delegation ranges must run from older to newer times.
- Eastern source of truth: saved schedule times are interpreted in `America/New_York`.
- Display time zones: admins can choose which time zones appear in the main clock selector.
- Main clock selector: users can switch the displayed time zone without changing stored schedule data.
- Dev-mode time: authorized users can test queue behavior at a chosen date and time.

### Queue Recommendation Rules

- Availability rule: online users are preferred before unavailable users.
- SME order rule: coverage-specific SME priority can influence queue order.
- Shift order rule: users can be recommended by schedule start and rotation behavior.
- Daily ticket balancing: queue sorting can consider how many tickets each user received today.
- Consecutive assignment awareness: queue sorting can reduce repeated assignment streaks.
- Team priority: the global team order is used as an escalation hierarchy and tie-breaker.
- Policy presets: admins can choose between `SME order` and `Shift order` recommendation styles.

### Admin Team and Coverage Setup

- Team management: admins can add and remove team members.
- Protected removal: removing users uses a confirmation flow that explains impact.
- Regions toggle: admins can turn region separation on or off.
- Region list: admins can create and remove region labels such as Americas, EMEA, and APAC.
- User-region mapping: users can belong to one or more regions.
- Coverage management: admins can add and remove systems/apps.
- Coverage config item: when ServiceNow incident mode is enabled, each coverage can store the ServiceNow configuration item used for that queue.
- SME mapping: admins can assign users to each system/app.
- SME priority order: admins can reorder coverage SMEs with move-up and move-down controls.
- Assignment rules: admins can select the queue recommendation policy used by the main page.

### Delegation

- Delegation time slots: admins define reusable coverage-owner slots, such as 09:00–09:30.
- Day view: admins can assign slot owners for one selected date.
- Week view: admins can assign slot owners across the business week.
- Scheduled-only delegators: a delegator can only be selected when scheduled for the full slot.
- Extra-slot support: extra availability windows count as valid schedule coverage for delegation.
- Holiday blocking: holiday users cannot be selected as delegators.
- Break blocking: users with a break overlapping the slot cannot be selected as delegators.
- Unassigned slots: slots can intentionally remain unassigned.
- Current delegator panel: the main page displays the active delegator for the current time.

### Incident Configuration

- Enable incident creation: admins can turn incident behavior on or off.
- Redirect mode: after assignment, the browser redirects to the exact configured URL.
- ServiceNow mode: stores future ServiceNow API settings and prompts for incident details after assignment.
- ServiceNow incident form: asks for description and priority; the config item comes from the selected coverage queue.
- ServiceNow field mapping: saved payloads use the description for both `description` and `short_description`; priority also sets `severity` to the same numeric value.
- Coverage config item mapping: each selected coverage queue contributes its configured ServiceNow item to the saved payload as `cmdb_ci`.
- Hidden ServiceNow values: admins can define additional field/value pairs, such as `assignment_group` or `category`, that are added to every ServiceNow payload but never shown on the assignment form.
- Teams settings: stores future Teams webhook configuration, message format, and message template.
- Template placeholders: incident templates support `{{assignee}}`, `{{assignee_mention}}`, `{{coverage}}`, `{{assigned_at}}`, `{{incident_url}}`, `{{servicenow_incident_description}}`, and `{{servicenow_incident_id}}`.
- Integration readiness: ServiceNow payloads and Teams settings are saved for future integration; the current app does not call ServiceNow or send Teams webhooks.

### Admin Safety and UI

- Locked admin sections: sensitive sections must be unlocked before editing.
- Backup lock: import/reset actions require an extra backup unlock confirmation.
- Confirmation modals: destructive user, shift, schedule, holiday, delegation, and reset actions ask before changing data.
- Validation alerts: invalid dates, time ranges, overlaps, missing required fields, and import errors show friendly warnings.
- Light/dark mode support: controls and dropdowns are styled to remain readable in both themes.
- Windows dropdown support: select menus use explicit foreground/background colors so options remain visible on Windows.

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
- `Regions`: choose whether to separate users by region, then define the region list used in Team and queue views.
- `Schedules`: add weekly schedules, click the all-user graph to prefill user/day/time, add breaks, add extra coverage slots, and review readable user-by-user schedules.
- `Delegation`: define predefined coverage time slots, assign only scheduled delegators or leave a slot/date unassigned, and review the day/week graph.
- `Assignment rules`: choose how recommendations are sorted. The default is schedule-first.
- `Shift presets`: define reusable shift names and times.
- `Systems / apps`: add systems, define ServiceNow config items when ServiceNow mode is enabled, and assign/reorder primary SMEs.
- `Incidents`: turn incident creation on/off, configure post-assignment redirects, and prepare ServiceNow or Teams settings.
- `Holidays`: add user-specific or all-team holidays.
- `Data`: export/import JSON backups.

Incident templates support `{{assignee}}`, `{{assignee_mention}}`, `{{coverage}}`, `{{assigned_at}}`, `{{incident_url}}`, `{{servicenow_incident_description}}`, and `{{servicenow_incident_id}}`.

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
