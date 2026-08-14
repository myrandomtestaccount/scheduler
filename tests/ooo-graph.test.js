const assert = require("node:assert/strict");
const core = require("../src/schedule-core.js");

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("uses a 24-hour graph range for all-region all-day OOO", () => {
  assert.deepEqual(core.getAllDayOooGraphRange(), {
    start: 0,
    end: 24 * 60,
    duration: 24 * 60
  });
});

test("uses exact same-day regional coverage for regional all-day OOO", () => {
  assert.deepEqual(core.getAllDayOooGraphRange({ start: "09:00", end: "17:00" }), {
    start: 9 * 60,
    end: 17 * 60,
    duration: 8 * 60
  });
});

test("uses exact overnight regional coverage for regional all-day OOO", () => {
  assert.deepEqual(core.getAllDayOooGraphRange({ start: "20:00", end: "04:00" }), {
    start: -4 * 60,
    end: 4 * 60,
    duration: 8 * 60
  });
});

test("falls back to 24 hours for invalid regional OOO coverage windows", () => {
  assert.deepEqual(core.getAllDayOooGraphRange({ start: "bad", end: "17:00" }), {
    start: 0,
    end: 24 * 60,
    duration: 24 * 60
  });
});

test("expands timed OOO source dates only for daily graph rendering", () => {
  const graphRange = { start: -2 * 60, end: 26 * 60 };
  assert.deepEqual(core.getTimedOooSourceDatesForGraph("2026-08-14", graphRange, "day"), [
    "2026-08-13",
    "2026-08-14",
    "2026-08-15"
  ]);
  assert.deepEqual(core.getTimedOooSourceDatesForGraph("2026-08-14", graphRange, "week"), [
    "2026-08-14"
  ]);
});
