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

function addDays(date, days) {
  return core.formatDate(core.addDays(core.parseDate(date), days));
}

function assertScheduleConversion(caseData) {
  const {
    name,
    timeZone,
    date,
    start,
    end,
    expected,
    expectedDisplayStartDate = date,
    expectedDisplayEndDate = core.toMinutes(end) <= core.toMinutes(start) ? addDays(date, 1) : date
  } = caseData;

  const stored = core.buildEasternScheduleFromDisplayTimes(date, start, end, timeZone);
  assert.deepEqual({
    start: stored.start,
    end: stored.end,
    startDate: stored.startDate,
    endDate: stored.endDate,
    startDayOffset: stored.startDayOffset,
    endDayOffset: stored.endDayOffset
  }, expected, name);

  const roundTripStart = core.convertWallTimeToTimeZone(stored.startDate, stored.start, core.EASTERN_TIME_ZONE, timeZone);
  const roundTripEnd = core.convertWallTimeToTimeZone(stored.endDate, stored.end, core.EASTERN_TIME_ZONE, timeZone);
  assert.deepEqual(roundTripStart, { date: expectedDisplayStartDate, time: start }, `${name} start round-trip`);
  assert.deepEqual(roundTripEnd, { date: expectedDisplayEndDate, time: end }, `${name} end round-trip`);
}

test("stores 09:00-17:00 schedules correctly across popular summer timezones", () => {
  [
    {
      name: "Eastern EDT",
      timeZone: "America/New_York",
      expected: { start: "09:00", end: "17:00", startDate: "2026-08-14", endDate: "2026-08-14", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "Central CDT",
      timeZone: "America/Chicago",
      expected: { start: "10:00", end: "18:00", startDate: "2026-08-14", endDate: "2026-08-14", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "Pacific PDT",
      timeZone: "America/Los_Angeles",
      expected: { start: "12:00", end: "20:00", startDate: "2026-08-14", endDate: "2026-08-14", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "London BST",
      timeZone: "Europe/London",
      expected: { start: "04:00", end: "12:00", startDate: "2026-08-14", endDate: "2026-08-14", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "Paris CEST",
      timeZone: "Europe/Paris",
      expected: { start: "03:00", end: "11:00", startDate: "2026-08-14", endDate: "2026-08-14", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "Dubai GST",
      timeZone: "Asia/Dubai",
      expected: { start: "01:00", end: "09:00", startDate: "2026-08-14", endDate: "2026-08-14", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "India IST",
      timeZone: "Asia/Kolkata",
      expected: { start: "23:30", end: "07:30", startDate: "2026-08-13", endDate: "2026-08-14", startDayOffset: -1, endDayOffset: 0 }
    },
    {
      name: "Tokyo JST",
      timeZone: "Asia/Tokyo",
      expected: { start: "20:00", end: "04:00", startDate: "2026-08-13", endDate: "2026-08-14", startDayOffset: -1, endDayOffset: 0 }
    },
    {
      name: "Sydney AEST",
      timeZone: "Australia/Sydney",
      expected: { start: "19:00", end: "03:00", startDate: "2026-08-13", endDate: "2026-08-14", startDayOffset: -1, endDayOffset: 0 }
    },
    {
      name: "Auckland NZST",
      timeZone: "Pacific/Auckland",
      expected: { start: "17:00", end: "01:00", startDate: "2026-08-13", endDate: "2026-08-14", startDayOffset: -1, endDayOffset: 0 }
    }
  ].forEach((caseData) => assertScheduleConversion({
    date: "2026-08-14",
    start: "09:00",
    end: "17:00",
    ...caseData
  }));
});

test("stores 09:00-17:00 schedules correctly across popular winter timezones", () => {
  [
    {
      name: "London GMT",
      timeZone: "Europe/London",
      expected: { start: "04:00", end: "12:00", startDate: "2026-01-15", endDate: "2026-01-15", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "Paris CET",
      timeZone: "Europe/Paris",
      expected: { start: "03:00", end: "11:00", startDate: "2026-01-15", endDate: "2026-01-15", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "Dubai GST winter",
      timeZone: "Asia/Dubai",
      expected: { start: "00:00", end: "08:00", startDate: "2026-01-15", endDate: "2026-01-15", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "India IST winter",
      timeZone: "Asia/Kolkata",
      expected: { start: "22:30", end: "06:30", startDate: "2026-01-14", endDate: "2026-01-15", startDayOffset: -1, endDayOffset: 0 }
    },
    {
      name: "Tokyo JST winter",
      timeZone: "Asia/Tokyo",
      expected: { start: "19:00", end: "03:00", startDate: "2026-01-14", endDate: "2026-01-15", startDayOffset: -1, endDayOffset: 0 }
    },
    {
      name: "Sydney AEDT",
      timeZone: "Australia/Sydney",
      expected: { start: "17:00", end: "01:00", startDate: "2026-01-14", endDate: "2026-01-15", startDayOffset: -1, endDayOffset: 0 }
    },
    {
      name: "Auckland NZDT",
      timeZone: "Pacific/Auckland",
      expected: { start: "15:00", end: "23:00", startDate: "2026-01-14", endDate: "2026-01-14", startDayOffset: -1, endDayOffset: -1 }
    }
  ].forEach((caseData) => assertScheduleConversion({
    date: "2026-01-15",
    start: "09:00",
    end: "17:00",
    ...caseData
  }));
});

test("stores local overnight schedules using the next local end date", () => {
  [
    {
      name: "London BST overnight",
      timeZone: "Europe/London",
      date: "2026-08-14",
      start: "22:00",
      end: "06:00",
      expected: { start: "17:00", end: "01:00", startDate: "2026-08-14", endDate: "2026-08-15", startDayOffset: 0, endDayOffset: 1 }
    },
    {
      name: "Pacific PDT overnight",
      timeZone: "America/Los_Angeles",
      date: "2026-08-14",
      start: "22:00",
      end: "06:00",
      expected: { start: "01:00", end: "09:00", startDate: "2026-08-15", endDate: "2026-08-15", startDayOffset: 1, endDayOffset: 1 }
    },
    {
      name: "Tokyo JST overnight",
      timeZone: "Asia/Tokyo",
      date: "2026-08-14",
      start: "22:00",
      end: "06:00",
      expected: { start: "09:00", end: "17:00", startDate: "2026-08-14", endDate: "2026-08-14", startDayOffset: 0, endDayOffset: 0 }
    },
    {
      name: "UTC early day",
      timeZone: "UTC",
      date: "2026-08-14",
      start: "00:30",
      end: "08:30",
      expected: { start: "20:30", end: "04:30", startDate: "2026-08-13", endDate: "2026-08-14", startDayOffset: -1, endDayOffset: 0 },
      expectedDisplayEndDate: "2026-08-14"
    }
  ].forEach(assertScheduleConversion);
});

test("tracks London schedule conversion through US and UK DST boundaries", () => {
  [
    ["US DST not started", "2026-03-07", "04:00", "12:00"],
    ["US DST started first", "2026-03-08", "05:00", "13:00"],
    ["UK DST not started", "2026-03-28", "05:00", "13:00"],
    ["UK DST started", "2026-03-30", "04:00", "12:00"],
    ["UK DST not ended", "2026-10-24", "04:00", "12:00"],
    ["UK DST ended first", "2026-10-26", "05:00", "13:00"],
    ["US DST not ended", "2026-10-31", "05:00", "13:00"],
    ["US DST ended", "2026-11-02", "04:00", "12:00"]
  ].forEach(([name, date, expectedStart, expectedEnd]) => assertScheduleConversion({
    name,
    timeZone: "Europe/London",
    date,
    start: "09:00",
    end: "17:00",
    expected: {
      start: expectedStart,
      end: expectedEnd,
      startDate: date,
      endDate: date,
      startDayOffset: 0,
      endDayOffset: 0
    }
  }));
});

test("returns original values for invalid conversion inputs", () => {
  assert.deepEqual(core.convertWallTimeToTimeZone("not-a-date", "09:00", "Europe/London", core.EASTERN_TIME_ZONE), {
    date: "not-a-date",
    time: "09:00"
  });
  assert.deepEqual(core.convertWallTimeToTimeZone("2026-08-14", "25:00", "Europe/London", core.EASTERN_TIME_ZONE), {
    date: "2026-08-14",
    time: "25:00"
  });
});
