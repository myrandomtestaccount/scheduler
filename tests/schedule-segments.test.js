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

function makeSchedule({ id = "schedule-1", date, timeZone, start, end, days = [core.getDayNameFromDate(date)], startDate = date, endDate = date }) {
  const stored = core.buildEasternScheduleFromDisplayTimes(date, start, end, timeZone);
  return {
    id,
    shiftType: "custom",
    days,
    startDate,
    endDate,
    start: stored.start,
    end: stored.end,
    startDayOffset: stored.startDayOffset,
    endDayOffset: stored.endDayOffset
  };
}

function segmentSummary(segments) {
  return segments.map(({ start, end, sourceDate, removeDate }) => ({ start, end, sourceDate, removeDate }));
}

test("keeps same-day London schedules on the selected Eastern date", () => {
  const schedule = makeSchedule({
    date: "2026-08-14",
    timeZone: "Europe/London",
    start: "09:00",
    end: "17:00"
  });

  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-13")), []);
  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-14")), [{
    start: "04:00",
    end: "12:00",
    sourceDate: "2026-08-14",
    removeDate: "2026-08-14"
  }]);
});

test("splits India schedules that start on the prior Eastern date", () => {
  const schedule = makeSchedule({
    date: "2026-08-14",
    timeZone: "Asia/Kolkata",
    start: "09:00",
    end: "17:00"
  });

  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-13")), [{
    start: "23:30",
    end: core.END_OF_DAY_TIME,
    sourceDate: "2026-08-13",
    removeDate: "2026-08-14"
  }]);
  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-14")), [{
    start: "00:00",
    end: "07:30",
    sourceDate: "2026-08-14",
    removeDate: "2026-08-14"
  }]);
});

test("splits Pacific evening schedules that end on the next Eastern date", () => {
  const schedule = makeSchedule({
    date: "2026-08-14",
    timeZone: "America/Los_Angeles",
    start: "18:00",
    end: "23:00"
  });

  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-14")), [{
    start: "21:00",
    end: core.END_OF_DAY_TIME,
    sourceDate: "2026-08-14",
    removeDate: "2026-08-14"
  }]);
  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-15")), [{
    start: "00:00",
    end: "02:00",
    sourceDate: "2026-08-15",
    removeDate: "2026-08-14"
  }]);
});

test("splits London overnight schedules across the Eastern midnight boundary", () => {
  const schedule = makeSchedule({
    date: "2026-08-14",
    timeZone: "Europe/London",
    start: "22:00",
    end: "06:00"
  });

  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-14")), [{
    start: "17:00",
    end: core.END_OF_DAY_TIME,
    sourceDate: "2026-08-14",
    removeDate: "2026-08-14"
  }]);
  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-15")), [{
    start: "00:00",
    end: "01:00",
    sourceDate: "2026-08-15",
    removeDate: "2026-08-14"
  }]);
});

test("keeps Tokyo overnight schedules on one Eastern date when conversion no longer crosses midnight", () => {
  const schedule = makeSchedule({
    date: "2026-08-14",
    timeZone: "Asia/Tokyo",
    start: "22:00",
    end: "06:00"
  });

  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-14")), [{
    start: "09:00",
    end: "17:00",
    sourceDate: "2026-08-14",
    removeDate: "2026-08-14"
  }]);
  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-15")), []);
});

test("handles schedules where both endpoints land on the prior Eastern date", () => {
  const schedule = makeSchedule({
    date: "2026-01-15",
    timeZone: "Pacific/Auckland",
    start: "09:00",
    end: "17:00"
  });

  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-01-14")), [{
    start: "15:00",
    end: "23:00",
    sourceDate: "2026-01-14",
    removeDate: "2026-01-15"
  }]);
  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-01-15")), []);
});

test("supports legacy inferred APAC previous-day schedules without saved offsets", () => {
  const schedule = {
    id: "legacy-apac",
    shiftType: "custom",
    days: ["Friday"],
    startDate: "2026-08-14",
    endDate: "2026-08-14",
    start: "20:00",
    end: "04:00"
  };

  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-13", { inferredStartDayOffset: -1 })), [{
    start: "20:00",
    end: core.END_OF_DAY_TIME,
    sourceDate: "2026-08-13",
    removeDate: "2026-08-14"
  }]);
  assert.deepEqual(segmentSummary(core.getScheduleSegmentsForDate(schedule, "2026-08-14", { inferredStartDayOffset: -1 })), [{
    start: "00:00",
    end: "04:00",
    sourceDate: "2026-08-14",
    removeDate: "2026-08-14"
  }]);
});

test("excludes schedules outside day, date-range, and duration constraints", () => {
  const schedule = makeSchedule({
    date: "2026-08-14",
    timeZone: "Europe/London",
    start: "09:00",
    end: "17:00",
    days: ["Monday"]
  });
  assert.deepEqual(core.getScheduleSegmentsForDate(schedule, "2026-08-14"), []);

  const futureSchedule = { ...schedule, days: ["Friday"], startDate: "2026-08-15", endDate: "2026-08-20" };
  assert.deepEqual(core.getScheduleSegmentsForDate(futureSchedule, "2026-08-14"), []);

  const tooLongSchedule = { ...schedule, days: ["Friday"], start: "07:00", end: "20:00" };
  assert.deepEqual(core.getScheduleSegmentsForDate(tooLongSchedule, "2026-08-14"), []);
});
