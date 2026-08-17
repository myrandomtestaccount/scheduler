const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");

const core = require("../src/schedule-core.js");
const appSource = readFileSync(resolve(__dirname, "../app.js"), "utf8");
const bootstrapEnd = appSource.indexOf("const GLOBAL_HOLIDAY_USER_ID");
const appBootstrap = appSource.slice(0, bootstrapEnd);

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function runConversionWithCore(scheduleCore) {
  const context = {
    window: { ScheduleCore: scheduleCore },
    result: null
  };
  vm.runInNewContext(
    `${appBootstrap}\nresult = convertWallTimeToTimeZone("2026-08-14", "09:00", "Europe/London", EASTERN_TIME_ZONE);`,
    context
  );
  return context.result;
}

test("app falls back when cached schedule core lacks timezone conversion helper", () => {
  const legacyCore = { ...core };
  delete legacyCore.convertWallTimeToTimeZone;

  assert.deepEqual(
    runConversionWithCore(legacyCore),
    { date: "2026-08-14", time: "04:00" }
  );
});

test("app uses schedule core timezone conversion helper when available", () => {
  assert.deepEqual(
    runConversionWithCore({
      ...core,
      convertWallTimeToTimeZone: () => ({ date: "core-used", time: "core-used" })
    }),
    { date: "core-used", time: "core-used" }
  );
});
