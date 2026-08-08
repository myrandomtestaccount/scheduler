# SME Scheduler

A tiny local scheduler for assigning work to system/application SMEs. It has no build step and no database.

## Run

For single-browser testing, open `index.html` in a browser.

The same files work on macOS and Windows 11, so you can test on a Mac and copy the folder to a Windows PC.

Open `admin.html` for admin tools.

For shared state across browsers or computers on the same network, launch the tiny local server instead:

```bash
node server.js
```

On the server computer, open `http://localhost:4173`. Other people on the same network should open the LAN URL printed in the terminal, such as `http://192.168.1.25:4173`.

On Windows, double-click `start-shared.bat` if Node.js is installed. If Windows Defender Firewall asks, allow Node.js on private networks.

## Test

```bash
npm test
```

For syntax checks plus logic tests:

```bash
npm run check
```

## Functionality Reference

### Running and Storage

- `index.html`: primary assignment page for delegators and regular users.
- `admin.html`: admin-only setup page for team, schedule, coverage, delegation, incidents, and data maintenance.
- Static mode: opening the HTML files directly stores data in browser `localStorage`.
- Shared mode: `node server.js` serves the app at `http://localhost:4173` and LAN URLs printed in the terminal, then stores shared state in a JSON file.
- Windows launcher: `start-shared.bat` starts shared mode on Windows when Node.js is installed.
- macOS launcher: `start-shared.command` starts shared mode on macOS.
- Shared-state conflict handling: saves use optimistic locking, reload newer shared data when another browser saves first, and show a sync warning.
- First-run setup: missing or empty scheduler data opens onboarding instead of loading sample users or regions.
- Data maintenance: admins can set retention, run cleanup, export/import JSON, preview data, and reset to onboarding.

### Main Assignment Page

- Coverage picker: choose a region and system/app that needs a ticket owner.
- Current queue: shows the recommended SME order for the selected coverage.
- Availability badges: labels users as available, later today, OOO, done today, or not scheduled.
- Assignment action: selecting an SME and clicking `Mark selected user assigned` records the ticket owner and advances the relevant queue.
- Queue advancement: normal SME assignments rotate the queue to the next SME for that coverage.
- `Other` option: lets a delegator pick someone from the wider roster without advancing the selected coverage queue.
- Other roster ordering: online users in the current region view appear by that region’s team ranking first, then users scheduled later today appear by schedule order.
- Unselectable users: people with no schedule, completed schedule, or all-day OOO are blocked from normal assignment.
- Future assignment speedbump: if everyone is unavailable but someone is scheduled later, the app can warn before assigning far ahead.
- Daily ownership ranking: shows who has received the most tickets today.
- Coverage dashboard: shows all coverage queues for the selected region, ticket counts, availability, and quick open buttons.
- Recent assignments: shows recent ticket assignments and allows edit/delete when visible.
- Assignment history: records assignment time, coverage, assignee, amended entries, and dev-mode test assignments.
- Current delegator: shows who owns the current delegation slot.
- Incident redirect: when enabled, shows an `Open incident` link for the exact configured URL with no added query parameters; it never opens automatically.

### Scheduling and Availability

- Weekly schedules: admins can add recurring schedules for selected weekdays.
- Schedule date ranges: schedules can be limited to a start and end date.
- Shift presets: admins can define reusable shift names and times such as early, regular, and late.
- Custom shifts: users can still have custom schedule times on any day.
- Multiple shifts: the same user can have different shifts on different days.
- OOO timed breaks: admins can add dated time windows that temporarily block availability.
- Extra slots: admins can add dated extra availability windows outside normal schedules.
- OOO: admins can mark one user or all users as unavailable for a full day, an all-day date range, or a timed break.
- OOO duplicate protection: a user cannot have overlapping all-day OOO records for the same date.
- Schedule graph: admins can review schedules in day or week view.
- All-region graph: the global admin day graph uses a padded 26-hour window from one hour before APAC-style evening coverage through one hour after Americas close.
- Regional graph limits: each region graph shows its coverage window with one hour of padding before and after.
- Overnight graph labels: schedules stay in one range; `T-1` marks true previous-day starts and `T+1` marks true next-day endings relative to the visible graph date.
- Graph prefill: day-view schedule blocks can prefill the schedule form for quicker edits.
- Forward-time validation: schedule, slot, shift, and delegation ranges must run from older to newer times.
- Eastern source of truth: saved schedule times are interpreted in `America/New_York`.
- Display time zones: admins can choose which time zones appear in the main clock selector.
- Timezone labels: configured display zones use friendly acronyms such as `JST/KST`, `CET`, and `AEST/AEDT` instead of browser `GMT+offset` fallbacks where possible.
- Main clock selector: users can switch the displayed time zone without changing stored schedule data.
- Dev-mode time: authorized users can test queue behavior at a chosen date and time.

### Queue Recommendation Rules

- Availability rule: online users are preferred before unavailable users.
- SME order rule: available coverage SMEs follow assignment ranking; when no SME is available, availability and schedule start time drive the fallback order.
- Shift order rule: users can be recommended by schedule start and rotation behavior.
- Daily ticket balancing: queue sorting can consider how many tickets each user received today.
- Consecutive assignment awareness: queue sorting can reduce repeated assignment streaks.
- Team priority: each region has its own team ranking for escalation hierarchy and tie-breakers; the global order is only used when regions are disabled or no region is selected.
- Policy presets: admins can choose between `SME order` and `Shift order` recommendation styles.

### Admin Team and Coverage Setup

- Team management: admins can edit the team name and add/remove team members.
- Team region breakdown: the global Team view groups users by region; each region has its own independent ranking, and a selected region admin view shows only that region’s users.
- Protected removal: removing users uses a confirmation flow that explains impact.
- Regions toggle: admins can turn region separation on or off.
- Region list: admins can create and remove region labels such as AMER, EMEA, and APAC.
- Region hours: each region stores its own Eastern Time operating window. Windows can cross midnight, but cannot exceed 14 hours.
- User-region mapping: users can belong to one or more regions.
- Regional admin view: when regions exist, overview tabs can switch between `All regions` and each region page; Rules is always edited on a specific region.
- Regional settings: each region page has its own team ranking, assignment rules, shift presets, OOO blocks, coverage list, SME mappings, and queue positions.
- Regional schedule graph: when a region admin view is selected, the graph timeline uses that region’s hours as its visible limits and shows only users assigned to that region. It does not render a separate region-hours lane.
- Regional shifts: every region gets a default region-hours preset based on its operating window, for example AMER `07:00–19:00` ET and APAC `19:00–07:00` ET; All regions shows current shifts grouped by region.
- Coverage management: admins can add and remove systems/apps in the selected admin view.
- System regions: each system/app has one or more selected regions; its coverage SME picker is limited to users assigned to those selected regions.
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
- All-day OOO blocking: OOO users cannot be selected as delegators.
- Timed OOO blocking: users with an OOO break overlapping the slot cannot be selected as delegators.
- Unassigned slots: slots can intentionally remain unassigned.
- Current delegator panel: the main page displays the active delegator for the current time.

### Incident Configuration

- Enable incident creation: admins can turn incident behavior on or off.
- Redirect mode: after assignment, the scheduler shows an `Open incident` button; the browser opens the configured URL only when the user clicks it.
- ServiceNow mode: stores future ServiceNow API settings and prompts for incident details after assignment.
- ServiceNow incident form: asks for description and priority; the config item comes from the selected coverage queue.
- ServiceNow field mapping: saved payloads use the description for both `description` and `short_description`; priority also sets `severity` to the same numeric value.
- Coverage config item mapping: each selected coverage queue contributes its configured ServiceNow item to the saved payload as `cmdb_ci`.
- Hidden ServiceNow values: admins can define additional field/value pairs, such as `assignment_group` or `category`, that are added to every ServiceNow payload but never shown on the assignment form.
- Teams settings: stores future Teams webhook configuration, message format, and message template.
- Template placeholders: incident templates support `{{assignee}}`, `{{assignee_mention}}`, `{{coverage}}`, `{{assigned_at}}`, `{{incident_url}}`, `{{servicenow_incident_description}}`, and `{{servicenow_incident_id}}`.
- Integration readiness: ServiceNow payloads and Teams settings are saved for future integration; the current app does not call ServiceNow or send Teams webhooks.

### Admin Safety and UI

- Locked admin sections: sensitive sections must be unlocked before editing; admin actions stay unlocked after saving until you click `Lock`.
- Admin save buttons: each locked section header includes `Save` so admins can explicitly persist without relocking.
- Data lock: cleanup, import, and reset actions require an extra data unlock confirmation.
- Confirmation modals: destructive user, shift, schedule, holiday, delegation, and reset actions ask before changing data.
- Validation alerts: invalid dates, time ranges, overlaps, missing required fields, and import errors show friendly warnings.
- Light/dark mode support: controls and dropdowns are styled to remain readable in both themes.
- Windows dropdown support: select menus use explicit foreground/background colors so options remain visible on Windows.

## Data Storage

When opened directly from `index.html`, the app saves to browser `localStorage`.

Use `Export JSON file` before moving data to another computer or browser profile. Use `Import JSON file` to restore it.

When launched with `node server.js`, the app uses a shared JSON file instead:

```text
config/scheduler-state.json
```

On macOS, Windows, and Linux this folder lives inside the scheduler project directory, so the shared data is easy to find next to the app files.

If an older default shared file exists in the previous Documents-based folder, the first server launch copies it into `config/scheduler-state.json`. New saves use only the local `config` folder unless `--config-dir` or `SCHEDULER_CONFIG_DIR` is set.

Shared mode also writes dated JSON snapshots before overwriting existing data:

```text
config/backups/scheduler-state-MMDDYYYY_01.json
```

The server log is saved in the same config folder:

```text
config/scheduler.log
```

Retention cleanup removes old ticket history, OOO/break records, and delegation records while keeping team, schedules, regions, systems, rules, shifts, and current queue positions.

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

- `Users`: add/remove team members and reorder each region’s independent ranking.
- `Regions`: choose whether to separate users by region, define each region, and set that region’s operating hours.
- `Schedules`: add weekly schedules, click the all-user graph to prefill user/day/time, and review readable user-by-user schedules.
- `Delegation`: define predefined coverage time slots, assign only scheduled delegators or leave a slot/date unassigned, and review the day/week graph.
- `Assignment rules`: choose how recommendations are sorted for a specific region. Each region stores its own rule preset. The default is schedule-first.
- `Shift presets`: define reusable shift names and times for the selected admin view. The generated region-hours preset can be up to 14 hours; regular user shifts remain capped at 12 hours.
- `Systems / apps`: add systems, select one or more regions per system, define ServiceNow config items when ServiceNow mode is enabled, and assign/reorder primary SMEs from those selected regions.
- `Incidents`: turn incident creation on/off, configure post-assignment redirects, and prepare ServiceNow or Teams settings.
- `OOO`: add all-day OOO ranges or timed breaks for an individual user, or choose `All users in <region>` for region-wide OOO.
- `Data maintenance`: set cleanup retention, run cleanup, export/import JSON files, and reset to onboarding.

Incident templates support `{{assignee}}`, `{{assignee_mention}}`, `{{coverage}}`, `{{assigned_at}}`, `{{incident_url}}`, `{{servicenow_incident_description}}`, and `{{servicenow_incident_id}}`.

## Eastern Time Scheduling

All schedule times are interpreted in `America/New_York` time. The UI labels this as Eastern Time because the actual offset changes between EST and EDT during the year.

Recommendation sorting can use available per-system SME order, schedule start time, total tickets assigned today, and current same-user assignment streak.

## GitHub

This repository is intentionally small:

```text
index.html
admin.html
styles.css
app.js
src/schedule-core.js
tests/schedule-core.test.js
package.json
server.js
images/logo.png
start-shared.bat
start-shared.command
README.md
.gitignore
```

That makes it easy to commit, review, and copy to another machine.
