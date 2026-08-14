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

test("validates overnight schedule and region coverage limits", () => {
  assert.equal(core.getTimeRangeDurationMinutes("18:00", "03:00"), 9 * 60);
  assert.equal(core.isValidScheduleTimeRange("18:00", "03:00"), true);
  assert.equal(core.isValidScheduleTimeRange("07:00", "20:00"), false);
  assert.equal(core.isValidRegionCoverageTimeRange("18:00", "08:00"), true);
  assert.equal(core.isValidRegionCoverageTimeRange("18:00", "09:00"), false);
});

test("builds Monday-first week ranges", () => {
  assert.deepEqual(core.getWeekDates("2026-07-31"), [
    "2026-07-27",
    "2026-07-28",
    "2026-07-29",
    "2026-07-30",
    "2026-07-31",
    "2026-08-01",
    "2026-08-02"
  ]);
  assert.deepEqual(core.getBusinessWeekRange("2026-07-31"), {
    startDate: "2026-07-27",
    endDate: "2026-07-31"
  });
});

test("converts Tokyo wall time to the prior Eastern day", () => {
  const instant = core.zonedWallTimeToDate("2026-07-31", "07:00", "Asia/Tokyo");
  assert.deepEqual(core.getZonedDateTimeParts(instant, core.EASTERN_TIME_ZONE), {
    date: "2026-07-30",
    time: "18:00"
  });
});

test("converts Eastern wall time into India display time", () => {
  const instant = core.zonedWallTimeToDate("2026-07-31", "07:00", core.EASTERN_TIME_ZONE);
  assert.deepEqual(core.getZonedDateTimeParts(instant, "Asia/Kolkata"), {
    date: "2026-07-31",
    time: "16:30"
  });
});

test("stores display-zone schedules as Eastern time consistently", () => {
  const cases = [
    {
      name: "London BST",
      timeZone: "Europe/London",
      date: "2026-08-13",
      start: "09:00",
      end: "17:00",
      expected: { start: "04:00", end: "12:00", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "UTC",
      timeZone: "UTC",
      date: "2026-08-13",
      start: "09:00",
      end: "17:00",
      expected: { start: "05:00", end: "13:00", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "Paris CEST",
      timeZone: "Europe/Paris",
      date: "2026-08-13",
      start: "09:00",
      end: "17:00",
      expected: { start: "03:00", end: "11:00", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "India IST",
      timeZone: "Asia/Kolkata",
      date: "2026-08-13",
      start: "09:00",
      end: "17:00",
      expected: { start: "23:30", end: "07:30", startDayOffset: -1, endDayOffset: 0 }
    },
    {
      name: "Tokyo JST",
      timeZone: "Asia/Tokyo",
      date: "2026-08-13",
      start: "09:00",
      end: "17:00",
      expected: { start: "20:00", end: "04:00", startDayOffset: -1, endDayOffset: 0 }
    },
    {
      name: "Sydney AEST",
      timeZone: "Australia/Sydney",
      date: "2026-08-13",
      start: "09:00",
      end: "17:00",
      expected: { start: "19:00", end: "03:00", startDayOffset: -1, endDayOffset: 0 }
    },
    {
      name: "Pacific PDT",
      timeZone: "America/Los_Angeles",
      date: "2026-08-13",
      start: "09:00",
      end: "17:00",
      expected: { start: "12:00", end: "20:00", startDayOffset: 0, endDayOffset: 0 }
    }
  ];

  cases.forEach(({ name, timeZone, date, start, end, expected }) => {
    const stored = core.buildEasternScheduleFromDisplayTimes(date, start, end, timeZone);
    assert.deepEqual({
      start: stored.start,
      end: stored.end,
      startDayOffset: stored.startDayOffset,
      endDayOffset: stored.endDayOffset
    }, expected, name);

    const roundTripStart = core.convertWallTimeToTimeZone(stored.startDate, stored.start, core.EASTERN_TIME_ZONE, timeZone);
    const roundTripEnd = core.convertWallTimeToTimeZone(stored.endDate, stored.end, core.EASTERN_TIME_ZONE, timeZone);
    assert.deepEqual({ date: roundTripStart.date, time: roundTripStart.time }, { date, time: start }, `${name} start round-trip`);
    assert.deepEqual({ date: roundTripEnd.date, time: roundTripEnd.time }, { date, time: end }, `${name} end round-trip`);
  });
});

test("uses date-specific daylight saving abbreviations", () => {
  const london = { id: "london", timeZone: "Europe/London" };
  const prague = { id: "paris", timeZone: "Europe/Prague" };
  const tokyo = { id: "tokyo", timeZone: "Asia/Tokyo" };
  const singapore = { id: "beijing", timeZone: "Asia/Singapore" };

  assert.equal(core.getTimezoneAbbreviation(core.zonedWallTimeToDate("2026-01-15", "12:00", "Europe/London"), london), "GMT");
  assert.equal(core.getTimezoneAbbreviation(core.zonedWallTimeToDate("2026-07-15", "12:00", "Europe/London"), london), "BST");
  assert.equal(core.getTimezoneAbbreviation(core.zonedWallTimeToDate("2026-01-15", "12:00", "Europe/Prague"), prague), "CET");
  assert.equal(core.getTimezoneAbbreviation(core.zonedWallTimeToDate("2026-07-15", "12:00", "Europe/Prague"), prague), "CEST");
  assert.equal(core.getTimezoneAbbreviation(core.zonedWallTimeToDate("2026-07-15", "12:00", "Asia/Tokyo"), tokyo), "JST/KST");
  assert.equal(core.getTimezoneAbbreviation(core.zonedWallTimeToDate("2026-07-15", "12:00", "Asia/Singapore"), singapore), "CST/SGT");
});

test("compares date-time values predictably", () => {
  assert.equal(core.compareDateTimeValues("2026-07-31", "07:00", "2026-07-31", "07:30") < 0, true);
  assert.equal(core.isForwardDateTimeRange("2026-07-31", "07:00", "2026-07-31", "07:00"), false);
  assert.equal(core.isForwardDateTimeRange("2026-07-31", "07:00", "2026-07-31", "07:00", true), true);
});
