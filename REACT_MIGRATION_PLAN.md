# React/TypeScript Migration Plan

## Why migrate

The app is now large enough that schedule, queue, admin UI, persistence, and rendering concerns are intertwined in one legacy browser file. A framework rewrite should reduce future schedule regressions, but only if the domain logic is extracted and tested first.

Current shape:

- `app.js`: legacy UI, state, queue, schedule, persistence, and admin flows.
- `src/schedule-core.js`: shared testable schedule/date helpers.
- `tests/schedule-core.test.js`: Node-based schedule regression tests.
- `server.js`: local shared-state server.
- `index.html`, `admin.html`, `styles.css`: static legacy UI shell and styles.

## Target architecture

- `src/core`: framework-independent business logic.
- `src/store`: typed app state, normalization, persistence adapters, and migrations.
- `src/features/schedules`: schedule editor, graph, timezone display, and validation.
- `src/features/queue`: assignment recommendations, recent assignments, reassignment edits, and queue correction.
- `src/features/admin`: users, regions, shifts, systems, holidays, delegation, incident config, and data tools.
- `src/components`: shared buttons, dialogs, forms, selects, cards, tables, and timeline primitives.
- `src/lib/time`: all timezone/date conversion wrappers, with DST and cross-date tests.
- `tests`: unit tests for core logic plus lightweight UI tests once React is introduced.

## Migration principles

- Keep the existing static app working until React reaches feature parity.
- Do not rewrite schedule math inside components.
- Store canonical schedule data in Eastern time, but make entry/display timezone explicit.
- Add tests before moving complex logic.
- Migrate by feature slices, not by copying the whole `app.js` into React.
- Avoid changing storage format unless a migration script/test is included.

## Phase 1: harden core logic

- Move schedule conversion and day-offset helpers into `src/core`.
- Add regression tests for popular time zones: Eastern, Central, Pacific, London, UTC, Paris, India, Tokyo, Sydney, Auckland.
- Add DST edge tests around EST/EDT, GMT/BST, CET/CEST, AEDT/AEST transitions.
- Extract queue recommendation and assignment-history mutation logic from `app.js`.
- Create sample fixtures for users, shifts, schedules, regions, exceptions, assignment logs, and queue positions.

## Phase 2: introduce React safely

- Add Vite + React + TypeScript alongside the current app.
- Keep `server.js` serving the existing static app while a React entry is built separately.
- Add typed models for persisted config and activity state.
- Create React shell with routes/views matching the current main/admin pages.
- Use existing `src/core` functions from React instead of duplicating behavior.

## Phase 3: migrate risky screens first

- Schedule editor and schedule graph.
- Recent assignments edit modal and queue-correction flow.
- Queue recommendation panel.
- Timezone selector and admin timezone labels.
- User/region/shift management after the schedule path is stable.

## Phase 4: parity and cleanup

- Run old and new implementations against the same fixtures.
- Compare generated availability windows, graph blocks, recommended assignees, and assignment logs.
- Switch default entry to React only after the fixture outputs match.
- Remove legacy `app.js` UI code after production parity is confirmed.

## Recommended immediate sequence

1. Commit and push the current timezone/schedule fix separately.
2. Create a new migration branch.
3. Extract queue and assignment-history logic into tested core modules.
4. Add React/TypeScript tooling.
5. Migrate the schedule editor/graph first.
