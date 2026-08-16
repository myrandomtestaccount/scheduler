const assert = require("node:assert/strict");
const { mkdtemp, readdir, rm } = require("node:fs/promises");
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
    throw error;
  }
}

function createSchedulerData(overrides = {}) {
  return {
    setup: { completed: true, teamName: "Snapshot test" },
    users: [],
    systems: [],
    queues: {},
    retentionPolicy: {
      assignmentLogDays: 365,
      oooDays: 180,
      delegationDays: 365,
      backupSnapshotsEnabled: false,
      backupSnapshotDays: 90
    },
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

async function listBackups(configDir) {
  try {
    return await readdir(path.join(configDir, "backups"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

test("shared server creates JSON snapshots only when explicitly enabled", async () => {
  const configDir = await mkdtemp(path.join(os.tmpdir(), "scheduler-snapshot-test-"));
  const server = await startSchedulerServer(configDir);
  try {
    const firstSave = await requestJson(server.port, "PUT", "/api/state", {
      revision: null,
      data: createSchedulerData()
    });

    const secondSave = await requestJson(server.port, "PUT", "/api/state", {
      revision: firstSave.revision,
      data: createSchedulerData({ setup: { completed: true, teamName: "Still no snapshots" } })
    });

    assert.deepEqual(await listBackups(configDir), []);
    assert.deepEqual(secondSave.backupPaths, []);

    const thirdSave = await requestJson(server.port, "PUT", "/api/state", {
      revision: secondSave.revision,
      data: createSchedulerData({
        setup: { completed: true, teamName: "Snapshots enabled" },
        retentionPolicy: {
          assignmentLogDays: 365,
          oooDays: 180,
          delegationDays: 365,
          backupSnapshotsEnabled: true,
          backupSnapshotDays: 90
        }
      })
    });

    assert.ok(thirdSave.backupPaths.length > 0);
    assert.ok((await listBackups(configDir)).some((file) => file.startsWith("scheduler-config-")));
  } finally {
    await server.stop();
    await rm(configDir, { recursive: true, force: true });
  }
}).catch(() => {
  process.exitCode = 1;
});
