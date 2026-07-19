const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const appRoot = __dirname;
const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || process.env.PORT || 4173);
const host = String(args.host || process.env.HOST || "127.0.0.1");
const configDir = path.resolve(
  args["config-dir"]
    || process.env.SCHEDULER_CONFIG_DIR
    || path.join(os.homedir(), "Documents", "scheduler-config")
);
const stateFile = path.join(configDir, "scheduler-state.json");
let stateLock = Promise.resolve();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/state") {
      await handleStateRequest(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "method_not_allowed" });
      return;
    }

    await serveStaticFile(url.pathname, request, response);
  } catch (error) {
    sendJson(response, 500, { error: "server_error", message: error.message });
  }
});

server.listen(port, host, () => {
  const displayHost = host === "127.0.0.1" ? "localhost" : host;
  console.log(`SME Scheduler running at http://${displayHost}:${port}`);
  console.log(`Shared config: ${stateFile}`);
});

async function handleStateRequest(request, response) {
  if (request.method === "GET") {
    const current = await readStateFile();
    sendJson(response, 200, {
      revision: current.revision,
      data: current.data,
      configPath: stateFile
    });
    return;
  }

  if (request.method !== "PUT") {
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  await withStateLock(async () => {
    let body;
    try {
      body = await readJsonBody(request);
      validateSchedulerData(body.data);
    } catch (error) {
      sendJson(response, 400, { error: "bad_request", message: error.message });
      return;
    }

    const current = await readStateFile();
    const expectedRevision = body.revision ?? null;
    if (current.revision !== expectedRevision) {
      sendJson(response, 409, {
        error: "state_changed",
        revision: current.revision,
        data: current.data
      });
      return;
    }

    const saved = await writeStateFile(body.data);
    sendJson(response, 200, {
      revision: saved.revision,
      data: saved.data,
      configPath: stateFile
    });
  });
}

async function serveStaticFile(urlPath, request, response) {
  const normalizedPath = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const filePath = path.resolve(appRoot, `.${normalizedPath}`);
  if (!filePath.startsWith(`${appRoot}${path.sep}`)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const contents = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "Cache-Control": "no-store"
    });
    if (request.method !== "HEAD") {
      response.end(contents);
    } else {
      response.end();
    }
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendText(response, 404, "Not found");
      return;
    }

    throw error;
  }
}

async function readStateFile() {
  try {
    const text = await fs.readFile(stateFile, "utf8");
    const data = JSON.parse(text);
    validateSchedulerData(data);
    return {
      exists: true,
      revision: hashText(text),
      data
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { exists: false, revision: null, data: null };
    }

    throw error;
  }
}

async function writeStateFile(data) {
  await fs.mkdir(configDir, { recursive: true });
  const text = `${JSON.stringify(data, null, 2)}\n`;
  const tempFile = path.join(configDir, `.scheduler-state.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tempFile, text, "utf8");
  await fs.rename(tempFile, stateFile);
  return {
    revision: hashText(text),
    data
  };
}

function validateSchedulerData(candidate) {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Expected scheduler data object.");
  }

  if (!Array.isArray(candidate.users) || !Array.isArray(candidate.systems) || typeof candidate.queues !== "object") {
    throw new Error("Expected users, systems, and queues.");
  }

  candidate.users.forEach((user) => {
    if (!user.id || !user.name || !Array.isArray(user.schedules)) {
      throw new Error("Every user needs id, name, and schedules.");
    }
  });

  candidate.systems.forEach((system) => {
    if (!system.id || !system.name || !Array.isArray(system.primaryUserIds)) {
      throw new Error("Every system needs id, name, and primaryUserIds.");
    }
  });
}

function withStateLock(task) {
  const run = stateLock.then(task, task);
  stateLock = run.catch(() => {});
  return run;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(text);
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8"
  }[extension] || "application/octet-stream";
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    parsed[key] = inlineValue ?? rawArgs[index + 1] ?? true;
    if (inlineValue === undefined && rawArgs[index + 1] && !rawArgs[index + 1].startsWith("--")) {
      index += 1;
    }
  }

  return parsed;
}
