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
  const signatureEnd = appSource.indexOf(")", start);
  const bodyStart = appSource.indexOf("{", signatureEnd);
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

function formatRange(start, end, options = {}) {
  const context = {
    block: { start, end },
    options,
    result: null,
    getGraphEndpointDisplayParts: (block, endpoint) => block[endpoint]
  };
  const helpers = [
    "formatGraphTimeRangeForDisplay",
    "formatGraphEndpointPartLabel",
    "shouldShowGraphDayOffsets",
    "getGraphDayOffsetAnchor",
    "formatGraphDayOffsetLabel"
  ].map(extractFunction).join("\n");

  vm.runInNewContext(`${helpers}\nresult = formatGraphTimeRangeForDisplay(block, options);`, context);
  return context.result;
}

test("graph labels show t+1 when both endpoints display on tomorrow", () => {
  assert.equal(
    formatRange(
      { time: "00:00", dayOffset: 1, abbreviation: "EDT" },
      { time: "03:00", dayOffset: 1, abbreviation: "EDT" },
      { includeTimezone: false }
    ),
    "00:00 (t+1)–03:00 (t+1)"
  );
});

test("graph labels show t-1 when both endpoints display on yesterday", () => {
  assert.equal(
    formatRange(
      { time: "18:00", dayOffset: -1, abbreviation: "EDT" },
      { time: "23:59", dayOffset: -1, abbreviation: "EDT" },
      { includeTimezone: false }
    ),
    "18:00 (t-1)–23:59 (t-1)"
  );
});

test("graph labels keep same-day times compact", () => {
  assert.equal(
    formatRange(
      { time: "09:00", dayOffset: 0, abbreviation: "EDT" },
      { time: "17:00", dayOffset: 0, abbreviation: "EDT" }
    ),
    "09:00–17:00 EDT"
  );
});
