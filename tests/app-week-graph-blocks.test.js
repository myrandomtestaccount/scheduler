const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");

const appSource = readFileSync(resolve(__dirname, "../app.js"), "utf8");

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function extractFunction(name) {
  const start = appSource.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Could not find ${name}`);
  let parenDepth = 0;
  let bodyStart = -1;
  for (let index = start; index < appSource.length; index += 1) {
    const character = appSource[index];
    if (character === "(") {
      parenDepth += 1;
    } else if (character === ")") {
      parenDepth -= 1;
    } else if (character === "{" && parenDepth === 0) {
      bodyStart = index;
      break;
    }
  }
  assert.notEqual(bodyStart, -1, `Could not find ${name} body`);

  let depth = 0;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const character = appSource[index];
    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return appSource.slice(start, index + 1);
      }
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function runGraphBlock(schedule, view) {
  const context = {
    schedule,
    user: { id: "asia-user", schedules: [schedule] },
    result: null,
    getDayNameFromDate: () => "Monday",
    isValidScheduleTimeRange: () => true,
    isScheduleActiveOnDate: (candidate, date, day) => (
      Array.isArray(candidate.days)
      && candidate.days.includes(day)
      && (!candidate.startDate || candidate.startDate <= date)
      && (!candidate.endDate || date <= candidate.endDate)
    ),
    getScheduleEndpointDate: (date, candidate, endpoint) => (
      endpoint === "start"
        ? candidate.startEndpointDate
        : candidate.endEndpointDate
    ),
    isGraphBlockVisible: () => true,
    getScheduleSegmentsForDate: () => {
      throw new Error("Schedule graphs must not use split daily schedule segments.");
    },
    getInferredScheduleStartDayOffset: () => 0
  };
  const helpers = [
    "getGraphScheduleBlocksForScheduleOnDate",
    "getAssignedDayGraphScheduleBlocksForScheduleOnDate"
  ].map(extractFunction).join("\n");

  vm.runInNewContext(
    `${helpers}\nresult = getGraphScheduleBlocksForScheduleOnDate(schedule, user, "2026-08-17", "Monday", { view: ${JSON.stringify(view)} });`,
    context
  );
  return JSON.parse(JSON.stringify(context.result));
}

function overnightSchedule() {
  return {
    id: "overnight",
    days: ["Monday"],
    startDate: "2026-08-17",
    endDate: "2026-08-21",
    startEndpointDate: "2026-08-17",
    endEndpointDate: "2026-08-18",
    start: "18:00",
    end: "03:00"
  };
}

const expectedOvernightBlock = [{
  id: "overnight",
  source: "schedule",
  date: "2026-08-17",
  sourceDate: "2026-08-17",
  endSourceDate: "2026-08-18",
  removeDate: "2026-08-17",
  start: "18:00",
  end: "03:00"
}];

test("week graph keeps overnight schedules as one assigned-day block", () => {
  assert.deepEqual(runGraphBlock(overnightSchedule(), "week"), expectedOvernightBlock);
});

test("day graph keeps overnight schedules as one assigned-day block", () => {
  assert.deepEqual(runGraphBlock(overnightSchedule(), "day"), expectedOvernightBlock);
});
