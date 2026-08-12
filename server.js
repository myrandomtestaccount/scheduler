const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const appRoot = __dirname;
const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || process.env.PORT || 4173);
const host = String(args.host || process.env.HOST || "0.0.0.0");
const configuredConfigDir = args["config-dir"] || process.env.SCHEDULER_CONFIG_DIR || "";
const defaultConfigDir = path.join(appRoot, "config");
const configDir = path.resolve(configuredConfigDir || defaultConfigDir);
const configFile = path.join(configDir, "scheduler-config.json");
const activityFile = path.join(configDir, "scheduler-activity.json");
const logFile = path.join(configDir, "scheduler.log");
const backupDir = path.join(configDir, "backups");
const BACKUP_TIME_ZONE = "America/New_York";
const DEFAULT_BACKUP_SNAPSHOT_RETENTION_DAYS = 90;
const BACKUP_FILENAME_PATTERN = /^scheduler-(?:config|activity)-(\d{8})_(\d+)\.json$/;
const CONFIG_ROOT_FIELD_ORDER = [
  "setup",
  "users",
  "systems",
  "shiftTemplates",
  "assignmentRules",
  "displayTimezones",
  "incidentConfig",
  "retentionPolicy",
  "regionsEnabled",
  "regions",
  "regionalSettings",
  "delegationSlots"
];
const ACTIVITY_ROOT_FIELD_ORDER = [
  "queues",
  "queueBaselines",
  "delegations",
  "exceptions",
  "holidays",
  "assignmentLog"
];
const REGIONAL_CONFIG_FIELD_ORDER = [
  "assignmentRules",
  "shiftTemplates",
  "teamOrderIds"
];
const REGIONAL_ACTIVITY_FIELD_ORDER = [
  "queues",
  "holidays"
];
const ACTIVITY_ROOT_KEYS = new Set(ACTIVITY_ROOT_FIELD_ORDER);
const CONFIG_ROOT_KEYS = new Set(CONFIG_ROOT_FIELD_ORDER);
const ACTIVITY_REGIONAL_SETTINGS_KEYS = new Set(REGIONAL_ACTIVITY_FIELD_ORDER);
const CONFIG_REGIONAL_SETTINGS_KEYS = new Set(REGIONAL_CONFIG_FIELD_ORDER);
let stateLock = Promise.resolve();
let logWriteQueue = Promise.resolve();

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
    logError(`${request.method} ${request.url || ""} failed: ${error.stack || error.message}`);
    sendJson(response, 500, { error: "server_error", message: error.message });
  }
});

server.listen(port, host, () => {
  logInfo("SME Scheduler running:");
  getServerUrls(host, port).forEach((url) => logInfo(`  ${url}`));
  logInfo(`Shared config: ${configFile}`);
  logInfo(`Shared activity: ${activityFile}`);
  logInfo(`JSON snapshots: ${backupDir}`);
  logInfo(`Log file: ${logFile}`);
});

async function handleStateRequest(request, response) {
  if (request.method === "GET") {
    const current = await readStateFile();
    sendJson(response, 200, {
      revision: current.revision,
      data: current.data,
      configPath: configFile,
      activityPath: activityFile
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
    logInfo(`Saved shared config: ${configFile}`);
    logInfo(`Saved shared activity: ${activityFile}`);
    saved.backupPaths.forEach((backupPath) => logInfo(`Created JSON snapshot: ${backupPath}`));
    sendJson(response, 200, {
      revision: saved.revision,
      data: saved.data,
      configPath: configFile,
      activityPath: activityFile,
      backupPath: saved.backupPaths[0] || null,
      backupPaths: saved.backupPaths
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
    const [configText, activityText] = await Promise.all([
      readCurrentFileText(configFile),
      readCurrentFileText(activityFile)
    ]);
    if (!configText && !activityText) {
      return { exists: false, revision: null, data: null };
    }

    const data = mergeSchedulerStateParts(
      configText ? JSON.parse(configText) : {},
      activityText ? JSON.parse(activityText) : {}
    );
    validateSchedulerData(data);
    return {
      exists: true,
      revision: getStateRevision(configText, activityText),
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
  const stateParts = splitSchedulerState(data);
  const [savedConfig, savedActivity] = await Promise.all([
    writeJsonDataFile(configFile, "scheduler-config", stateParts.config),
    writeJsonDataFile(activityFile, "scheduler-activity", stateParts.activity)
  ]);
  try {
    await cleanupBackupSnapshots(getBackupSnapshotRetentionDays(data));
  } catch (error) {
    logWarn(`Could not clean JSON snapshots: ${error.message}`);
  }
  return {
    revision: getStateRevision(savedConfig.text, savedActivity.text),
    data,
    backupPaths: [savedConfig.backupPath, savedActivity.backupPath].filter(Boolean)
  };
}

async function readCurrentFileText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function writeJsonDataFile(filePath, snapshotName, data) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  const currentText = await readCurrentFileText(filePath);
  const backupPath = currentText && hashText(currentText) !== hashText(text)
    ? await writeBackupSnapshot(currentText, snapshotName)
    : null;
  const tempFile = path.join(configDir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tempFile, text, "utf8");
  await fs.rename(tempFile, filePath);
  return { text, backupPath };
}

async function writeBackupSnapshot(text, snapshotName) {
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = await getNextBackupPath(snapshotName);
  await fs.writeFile(backupPath, text, "utf8");
  return backupPath;
}

async function getNextBackupPath(snapshotName, date = new Date()) {
  const dateStamp = formatBackupDateStamp(date);
  const prefix = `${snapshotName}-${dateStamp}_`;
  const files = await readBackupDirectoryFiles();
  const nextSequence = files.reduce((maxSequence, fileName) => {
    if (!fileName.startsWith(prefix) || !fileName.endsWith(".json")) {
      return maxSequence;
    }

    const sequence = Number.parseInt(fileName.slice(prefix.length, -".json".length), 10);
    return Number.isFinite(sequence) ? Math.max(maxSequence, sequence) : maxSequence;
  }, 0) + 1;

  return path.join(backupDir, `${prefix}${String(nextSequence).padStart(2, "0")}.json`);
}

function splitSchedulerState(data) {
  const source = data && typeof data === "object" ? data : {};
  const splitRegionalSettings = splitRegionalSettingsState(source.regionalSettings);
  const config = {};
  const activity = {};

  CONFIG_ROOT_FIELD_ORDER.forEach((key) => {
    if (key === "regionalSettings") {
      config.regionalSettings = splitRegionalSettings.config;
      return;
    }

    if (key in source) {
      config[key] = source[key];
    }
  });

  Object.entries(source).forEach(([key, value]) => {
    if (key !== "regionalSettings" && !CONFIG_ROOT_KEYS.has(key) && !ACTIVITY_ROOT_KEYS.has(key)) {
      config[key] = value;
    }
  });

  ACTIVITY_ROOT_FIELD_ORDER.forEach((key) => {
    if (key in source) {
      activity[key] = source[key];
    }
  });

  activity.queues ||= {};
  activity.queueBaselines ||= { global: {}, regional: {} };
  activity.delegations ||= [];
  activity.exceptions ||= [];
  activity.holidays ||= [];
  activity.assignmentLog ||= [];
  activity.regionalSettings = splitRegionalSettings.activity;

  return { config, activity };
}

function splitRegionalSettingsState(regionalSettings) {
  const config = {};
  const activity = {};
  const source = regionalSettings && typeof regionalSettings === "object" ? regionalSettings : {};

  Object.entries(source).forEach(([regionId, settings]) => {
    const configSettings = {};
    const activitySettings = {};
    const settingsSource = settings && typeof settings === "object" ? settings : {};

    REGIONAL_CONFIG_FIELD_ORDER.forEach((key) => {
      if (key in settingsSource) {
        configSettings[key] = settingsSource[key];
      }
    });

    Object.entries(settingsSource).forEach(([key, value]) => {
      if (!CONFIG_REGIONAL_SETTINGS_KEYS.has(key) && !ACTIVITY_REGIONAL_SETTINGS_KEYS.has(key)) {
        configSettings[key] = value;
      }
    });

    REGIONAL_ACTIVITY_FIELD_ORDER.forEach((key) => {
      if (key in settingsSource) {
        activitySettings[key] = settingsSource[key];
      }
    });

    config[regionId] = configSettings;
    activity[regionId] = activitySettings;
  });

  return { config, activity };
}

function mergeSchedulerStateParts(config, activity) {
  const mergedConfig = config && typeof config === "object" ? config : {};
  const mergedActivity = activity && typeof activity === "object" ? activity : {};
  return {
    ...mergedConfig,
    queues: mergedActivity.queues || {},
    queueBaselines: mergedActivity.queueBaselines || { global: {}, regional: {} },
    delegations: Array.isArray(mergedActivity.delegations) ? mergedActivity.delegations : [],
    exceptions: Array.isArray(mergedActivity.exceptions) ? mergedActivity.exceptions : [],
    holidays: Array.isArray(mergedActivity.holidays) ? mergedActivity.holidays : [],
    assignmentLog: Array.isArray(mergedActivity.assignmentLog) ? mergedActivity.assignmentLog : [],
    regionalSettings: mergeRegionalSettingsParts(mergedConfig.regionalSettings, mergedActivity.regionalSettings)
  };
}

function mergeRegionalSettingsParts(configSettings, activitySettings) {
  const configSource = configSettings && typeof configSettings === "object" ? configSettings : {};
  const activitySource = activitySettings && typeof activitySettings === "object" ? activitySettings : {};
  const regionIds = new Set([...Object.keys(configSource), ...Object.keys(activitySource)]);
  const merged = {};

  regionIds.forEach((regionId) => {
    merged[regionId] = {
      ...(configSource[regionId] && typeof configSource[regionId] === "object" ? configSource[regionId] : {}),
      ...(activitySource[regionId] && typeof activitySource[regionId] === "object" ? activitySource[regionId] : {})
    };
  });

  return merged;
}

function getStateRevision(configText, activityText) {
  return hashText([
    "scheduler-config",
    configText || "",
    "scheduler-activity",
    activityText || ""
  ].join("\n"));
}

async function cleanupBackupSnapshots(retentionDays) {
  const files = await readBackupDirectoryFiles();
  if (files.length === 0) {
    return;
  }

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  await Promise.all(files.map(async (fileName) => {
    const match = BACKUP_FILENAME_PATTERN.exec(fileName);
    if (!match) {
      return;
    }

    const backupDate = parseBackupDateStamp(match[1]);
    if (!backupDate || backupDate.getTime() >= cutoff) {
      return;
    }

    await fs.unlink(path.join(backupDir, fileName));
  }));
}

async function readBackupDirectoryFiles() {
  try {
    return await fs.readdir(backupDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function getBackupSnapshotRetentionDays(data) {
  const value = data?.retentionPolicy?.backupSnapshotDays;
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_BACKUP_SNAPSHOT_RETENTION_DAYS;
  }

  return Math.min(Math.max(parsedValue, 1), 3650);
}

function formatBackupDateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BACKUP_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.month}${values.day}${values.year}`;
}

function parseBackupDateStamp(dateStamp) {
  const month = Number(dateStamp.slice(0, 2));
  const day = Number(dateStamp.slice(2, 4));
  const year = Number(dateStamp.slice(4, 8));
  const parsedDate = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() !== month - 1
    || parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return parsedDate;
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

function logInfo(message) {
  console.log(message);
  appendLogLine("INFO", message);
}

function logWarn(message) {
  console.warn(message);
  appendLogLine("WARN", message);
}

function logError(message) {
  console.error(message);
  appendLogLine("ERROR", message);
}

async function appendLogLine(level, message) {
  logWriteQueue = logWriteQueue.then(async () => {
    await fs.mkdir(configDir, { recursive: true });
    await fs.appendFile(logFile, `${new Date().toISOString()} ${level} ${message}\n`, "utf8");
  }).catch((error) => {
    console.warn(`Could not write scheduler log: ${error.message}`);
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

function getServerUrls(host, port) {
  const normalizedHost = host.toLowerCase();
  if (normalizedHost === "0.0.0.0" || normalizedHost === "::") {
    return [
      `http://localhost:${port}`,
      ...getLanAddresses().map((address) => `http://${address}:${port}`)
    ];
  }

  const displayHost = host === "127.0.0.1" ? "localhost" : host;
  return [`http://${displayHost}:${port}`];
}

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((networkInterface) => (
      networkInterface
        && networkInterface.family === "IPv4"
        && !networkInterface.internal
    ))
    .map((networkInterface) => networkInterface.address);
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
