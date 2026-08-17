const assert = require("node:assert/strict");
const { mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error.stack || error.message || error);
    throw error;
  }
}

function createLegacySchedulerData(overrides = {}) {
  return {
    setup: { completed: true, teamName: "Legacy scheduler" },
    users: [{
      id: "ara",
      name: "Ara",
      schedules: [],
      regionIds: ["amer"]
    }],
    systems: [{
      id: "shift",
      name: "Shift queue",
      primaryUserIds: ["ara"],
      regionIds: ["amer"],
      serviceNowConfigItem: ""
    }],
    queues: {
      shift: ["ara"]
    },
    queueBaselines: {
      global: {},
      regional: {}
    },
    delegations: [],
    exceptions: [],
    holidays: [],
    assignmentLog: [],
    retentionPolicy: {
      assignmentLogDays: 365,
      oooDays: 180,
      delegationDays: 365,
      backupSnapshotsEnabled: false,
      backupSnapshotDays: 90
    },
    regionsEnabled: false,
    regions: [],
    regionalSettings: {},
    ...overrides
  };
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on("error", reject);
  });
}

async function startSchedulerServer(configDir) {
  const port = await getFreePort();
  const child = spawn(process.execPath, [
    path.resolve(__dirname, "../server.js"),
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--config-dir",
    configDir
  ], {
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stdout.on("data", () => {});
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  await waitForServer(port, () => {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}: ${stderr}`);
    }
  });

  return {
    port,
    stop: async () => {
      if (child.exitCode !== null) {
        return;
      }
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    }
  };
}

async function waitForServer(port, checkProcess) {
  const deadline = Date.now() + 5000;
  let lastError;
  while (Date.now() < deadline) {
    checkProcess();
    try {
      await requestJson(port, "GET", "/api/state");
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw lastError || new Error("Server did not start.");
}

async function requestJson(port, method, pathname, body = null) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: "127.0.0.1",
      port,
      method,
      path: pathname,
      headers: body
        ? { "Content-Type": "application/json" }
        : undefined
    }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        text += chunk;
      });
      response.on("end", () => {
        let payload;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch (error) {
          reject(error);
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}: ${text}`));
          return;
        }
        resolve(payload);
      });
    });
    request.on("error", reject);
    if (body) {
      request.write(JSON.stringify(body));
    }
    request.end();
  });
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

test("shared server loads legacy scheduler-state.json and migrates on save", async () => {
  const configDir = await mkdtemp(path.join(os.tmpdir(), "scheduler-legacy-state-test-"));
  await writeFile(
    path.join(configDir, "scheduler-state.json"),
    `${JSON.stringify(createLegacySchedulerData(), null, 2)}\n`,
    "utf8"
  );

  const server = await startSchedulerServer(configDir);
  try {
    const firstLoad = await requestJson(server.port, "GET", "/api/state");
    assert.equal(firstLoad.data.users[0].name, "Ara");
    assert.equal(firstLoad.data.systems[0].name, "Shift queue");
    assert.deepEqual(firstLoad.data.queues.shift, ["ara"]);
    assert.ok(firstLoad.revision);

    const saved = await requestJson(server.port, "PUT", "/api/state", {
      revision: firstLoad.revision,
      data: {
        ...firstLoad.data,
        setup: { completed: true, teamName: "Migrated scheduler" }
      }
    });
    assert.ok(saved.revision);

    const config = await readJsonFile(path.join(configDir, "scheduler-config.json"));
    const activity = await readJsonFile(path.join(configDir, "scheduler-activity.json"));
    assert.equal(config.setup.teamName, "Migrated scheduler");
    assert.equal(config.users[0].name, "Ara");
    assert.deepEqual(activity.queues.shift, ["ara"]);

    const secondLoad = await requestJson(server.port, "GET", "/api/state");
    assert.equal(secondLoad.revision, saved.revision);
    assert.equal(secondLoad.data.setup.teamName, "Migrated scheduler");
    assert.equal(secondLoad.data.users[0].name, "Ara");
  } finally {
    await server.stop();
    await rm(configDir, { recursive: true, force: true });
  }
}).catch(() => {
  process.exitCode = 1;
});
