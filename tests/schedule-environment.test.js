const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("schedule conversion does not depend on the host machine timezone", () => {
  const corePath = resolve(__dirname, "../src/schedule-core.js");
  const script = `
    const core = require(${JSON.stringify(corePath)});
    const cases = [
      ["London day", "2026-08-14", "09:00", "17:00", "Europe/London"],
      ["Tokyo day", "2026-08-14", "09:00", "17:00", "Asia/Tokyo"],
      ["Pacific late", "2026-08-14", "18:00", "23:00", "America/Los_Angeles"],
      ["London overnight", "2026-08-14", "22:00", "06:00", "Europe/London"]
    ];
    console.log(JSON.stringify(cases.map(([name, date, start, end, timeZone]) => [
      name,
      core.buildEasternScheduleFromDisplayTimes(date, start, end, timeZone)
    ])));
  `;
  const hostTimezones = ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"];
  const outputs = hostTimezones.map((hostTimezone) => {
    const result = spawnSync(process.execPath, ["-e", script], {
      encoding: "utf8",
      env: { ...process.env, TZ: hostTimezone }
    });
    assert.equal(result.status, 0, `${hostTimezone} process failed: ${result.stderr}`);
    return JSON.parse(result.stdout);
  });

  outputs.slice(1).forEach((output, index) => {
    assert.deepEqual(output, outputs[0], `${hostTimezones[index + 1]} differed from ${hostTimezones[0]}`);
  });

  assert.deepEqual(outputs[0], [
    ["London day", { start: "04:00", end: "12:00", startDate: "2026-08-14", endDate: "2026-08-14", startDayOffset: 0, endDayOffset: 0 }],
    ["Tokyo day", { start: "20:00", end: "04:00", startDate: "2026-08-13", endDate: "2026-08-14", startDayOffset: -1, endDayOffset: 0 }],
    ["Pacific late", { start: "21:00", end: "02:00", startDate: "2026-08-14", endDate: "2026-08-15", startDayOffset: 0, endDayOffset: 1 }],
    ["London overnight", { start: "17:00", end: "01:00", startDate: "2026-08-14", endDate: "2026-08-15", startDayOffset: 0, endDayOffset: 1 }]
  ]);
});
