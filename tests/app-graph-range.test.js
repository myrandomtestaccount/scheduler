const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const core = require("../src/schedule-core.js");

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

function runRange(start, end) {
  const context = {
    start,
    end,
    result: null,
    sourceDates: null,
    SCHEDULE_GRAPH_PADDING_MINUTES: 60,
    TIMELINE_START_MINUTES: 6 * 60,
    TIMELINE_END_MINUTES: 22 * 60,
    toMinutes: core.toMinutes,
    minutesToTime: core.minutesToTime,
    addDays: core.addDays,
    parseDate: core.parseDate,
    formatDate: core.formatDate
  };
  const helpers = [
    "createPaddedGraphTimeRange",
    "createGraphTimeRange",
    "graphMinutesToTime",
    "getGraphSourceDatesForRange"
  ].map(extractFunction).join("\n");

  vm.runInNewContext(
    `${helpers}\nresult = createPaddedGraphTimeRange(start, end);\nsourceDates = getGraphSourceDatesForRange("2026-08-17", result);`,
    context
  );
  return JSON.parse(JSON.stringify({
    range: context.result,
    sourceDates: context.sourceDates
  }));
}

test("overnight APAC graph range starts on the selected date", () => {
  assert.deepEqual(runRange("19:00", "07:00"), {
    range: {
      start: 18 * 60,
      end: 32 * 60,
      duration: 14 * 60,
      startTime: "18:00",
      endTime: "08:00"
    },
    sourceDates: ["2026-08-17", "2026-08-18"]
  });
});

test("same-day graph range stays on the selected date", () => {
  assert.deepEqual(runRange("09:00", "17:00"), {
    range: {
      start: 8 * 60,
      end: 18 * 60,
      duration: 10 * 60,
      startTime: "08:00",
      endTime: "18:00"
    },
    sourceDates: ["2026-08-17"]
  });
});
