const STORAGE_NAMESPACE = "scheduler";
const LEGACY_STORAGE_NAMESPACE = "smeScheduler";
const STORAGE_KEY = `${STORAGE_NAMESPACE}.data.v1`;
const DEBUG_TIME_STORAGE_KEY = `${STORAGE_NAMESPACE}.debugTime.v1`;
const THEME_STORAGE_KEY = `${STORAGE_NAMESPACE}.theme.v1`;
const DISPLAY_TIMEZONE_STORAGE_KEY = `${STORAGE_NAMESPACE}.displayTimezone.v1`;
const LEGACY_STORAGE_KEYS = new Map([
  [STORAGE_KEY, `${LEGACY_STORAGE_NAMESPACE}.data.v1`],
  [DEBUG_TIME_STORAGE_KEY, `${LEGACY_STORAGE_NAMESPACE}.debugTime.v1`],
  [THEME_STORAGE_KEY, `${LEGACY_STORAGE_NAMESPACE}.theme.v1`],
  [DISPLAY_TIMEZONE_STORAGE_KEY, `${LEGACY_STORAGE_NAMESPACE}.displayTimezone.v1`]
]);
const SHARED_STATE_ENDPOINT = "/api/state";
const SHARED_STATE_REFRESH_MS = 10000;
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const {
  EASTERN_TIME_ZONE,
  END_OF_DAY_TIME,
  MAX_REGION_COVERAGE_MINUTES,
  MAX_SCHEDULE_DURATION_MINUTES,
  SLOT_MINUTES,
  addDays,
  compareDateTimeRecords,
  compareDateTimeValues,
  formatDate,
  formatDisplayDate,
  formatDurationMinutes,
  formatWaitDuration,
  getBusinessWeekRange,
  getDateOffset,
  getDayNameFromDate,
  getTimeRangeDurationMinutes,
  getTimezoneAbbreviation,
  getWeekDates,
  getZonedDateTimeParts,
  isForwardDateRange,
  isForwardDateTimeRange,
  isForwardTimeRange,
  isSameDayForwardEasternRange,
  isValidDateInput,
  isValidRegionCoverageTimeRange,
  isValidScheduleTimeRange,
  isValidTimeInput,
  isValidTimeRange,
  isValidTimeRangeWithinDuration,
  isWithinWindow,
  minutesToTime,
  parseDate,
  roundToNearestSlot,
  toMinutes,
  zonedWallTimeToDate
} = window.ScheduleCore;
const GLOBAL_HOLIDAY_USER_ID = "__all__";
const REGION_HOLIDAY_USER_PREFIX = "__region_all__:";
const SHIFT_TEMPLATE_SCOPE_SEPARATOR = "::";
const OOO_TYPE_ALL_DAY = "all-day";
const OOO_TYPE_TIME = "time";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SCHEDULE_DAYS = DAYS.slice(0, 5);
const TIMELINE_START_MINUTES = 6 * 60;
const TIMELINE_END_MINUTES = 22 * 60;
const SCHEDULE_GRAPH_PADDING_MINUTES = 60;
const GLOBAL_SCHEDULE_GRAPH_DURATION_MINUTES = 26 * 60;
const RECENT_ASSIGNMENTS_WINDOW_MS = 24 * 60 * 60 * 1000;
const LONG_FUTURE_ASSIGNMENT_MINUTES = 12 * 60;
const SHIFT_ORDER_PRESET_ID = "schedule-first";
const SHIFT_QUEUE_SYSTEM_ID = "__shift_queue__";
const SHIFT_QUEUE_SYSTEM_NAME = "Shift queue";
const OTHER_QUEUE_USER_ID = "__other__";
const OTHER_QUEUE_USER_NAME = "Other";
const GLOBAL_REGION_SCOPE_ID = "";
const GLOBAL_REGION_SCOPE_NAME = "All regions";
const INCIDENT_CREATE_URL = "https://www.google.com/";
const INCIDENT_CREATION_MODES = ["redirect", "servicenow"];
const SERVICENOW_PRIORITIES = ["1", "2", "3", "4"];
const DEFAULT_SERVICENOW_PRIORITY = "3";
const SERVICENOW_FORM_CONTROLLED_FIELDS = ["short_description", "description", "cmdb_ci", "priority", "severity"];
const SERVICENOW_FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.-]*$/;
const TEAMS_MESSAGE_FORMATS = ["text", "html"];
const LEGACY_TEAMS_MESSAGE_TEMPLATE = "{{assignee}} was assigned to {{coverage}}. Incident: {{incidentUrl}}";
const DEFAULT_TEAMS_MESSAGE_TEMPLATE = "{{assignee}} ({{assignee_mention}}), {{servicenow_incident_description}} - {{servicenow_incident_id}}";
const DEFAULT_INCIDENT_CONFIG = {
  enabled: true,
  mode: "redirect",
  redirect: {
    url: INCIDENT_CREATE_URL
  },
  serviceNow: {
    instanceUrl: "",
    apiPath: "/api/now/table/incident",
    shortDescriptionTemplate: "Task assigned to {{assignee}} for {{coverage}}",
    hiddenFields: []
  },
  teams: {
    enabled: false,
    webhookUrl: "",
    messageFormat: "text",
    messageTemplate: DEFAULT_TEAMS_MESSAGE_TEMPLATE
  }
};
const RETENTION_POLICY_LIMITS = { min: 1, max: 3650 };
const DEFAULT_RETENTION_POLICY = {
  assignmentLogDays: 365,
  oooDays: 180,
  delegationDays: 365,
  backupSnapshotDays: 90
};
const DEV_MODE_TIME_OPTION_ID = "__dev_mode__";
const DEFAULT_DISPLAY_TIMEZONES = [
  { id: "et", timeZone: EASTERN_TIME_ZONE, label: "Eastern (New York)" },
  { id: "utc", timeZone: "UTC", label: "UTC" },
  { id: "london", timeZone: "Europe/London", label: "London" },
  { id: "ist", timeZone: "Asia/Kolkata", label: "India (Kolkata)" }
];

const AVAILABLE_TIMEZONES = [
  { id: "et", timeZone: "America/New_York", label: "Eastern (New York)" },
  { id: "ct", timeZone: "America/Chicago", label: "Central (Chicago)" },
  { id: "mt", timeZone: "America/Denver", label: "Mountain (Denver)" },
  { id: "pt", timeZone: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { id: "ak", timeZone: "America/Anchorage", label: "Alaska" },
  { id: "ht", timeZone: "Pacific/Honolulu", label: "Hawaii" },
  { id: "utc", timeZone: "UTC", label: "UTC" },
  { id: "london", timeZone: "Europe/London", label: "London" },
  { id: "paris", timeZone: "Europe/Paris", label: "Paris / Prague" },
  { id: "athens", timeZone: "Europe/Athens", label: "Athens / Helsinki" },
  { id: "moscow", timeZone: "Europe/Moscow", label: "Moscow" },
  { id: "istanbul", timeZone: "Europe/Istanbul", label: "Istanbul" },
  { id: "dubai", timeZone: "Asia/Dubai", label: "Dubai" },
  { id: "karachi", timeZone: "Asia/Karachi", label: "Karachi" },
  { id: "ist", timeZone: "Asia/Kolkata", label: "India (Kolkata)" },
  { id: "dhaka", timeZone: "Asia/Dhaka", label: "Dhaka" },
  { id: "bangkok", timeZone: "Asia/Bangkok", label: "Bangkok / Hanoi" },
  { id: "beijing", timeZone: "Asia/Shanghai", label: "Beijing / Singapore" },
  { id: "tokyo", timeZone: "Asia/Tokyo", label: "Tokyo / Seoul" },
  { id: "sydney", timeZone: "Australia/Sydney", label: "Sydney (east)" },
  { id: "adelaide", timeZone: "Australia/Adelaide", label: "Adelaide (central)" },
  { id: "perth", timeZone: "Australia/Perth", label: "Perth (west)" },
  { id: "auckland", timeZone: "Pacific/Auckland", label: "Auckland" },
  { id: "samoa", timeZone: "Pacific/Apia", label: "Samoa" }
];

const DEFAULT_REGIONS = [
  { id: "amer", name: "Americas", coverageStart: "07:00", coverageEnd: "19:00" },
  { id: "emea", name: "EMEA", coverageStart: "07:00", coverageEnd: "19:00" },
  { id: "apac", name: "APAC", coverageStart: "19:00", coverageEnd: "07:00" }
];

function getDisplayTimezones() {
  return data?.displayTimezones?.length ? data.displayTimezones : DEFAULT_DISPLAY_TIMEZONES;
}

function hasRegionalScopes() {
  return data?.regionsEnabled !== false && Array.isArray(data?.regions) && data.regions.length > 0;
}

function normalizeRegionScopeId(regionId) {
  const value = String(regionId || "");
  return hasRegionalScopes() && data.regions.some((region) => region.id === value)
    ? value
    : GLOBAL_REGION_SCOPE_ID;
}

function getRegionScopeLabel(regionId) {
  const normalizedId = normalizeRegionScopeId(regionId);
  return normalizedId
    ? data.regions.find((region) => region.id === normalizedId)?.name || "Region"
    : GLOBAL_REGION_SCOPE_NAME;
}

function createDefaultRegionSettings(regionId = GLOBAL_REGION_SCOPE_ID) {
  const baseAssignmentRules = data?.assignmentRules || DEFAULT_ASSIGNMENT_RULES;
  return {
    assignmentRules: { ...baseAssignmentRules },
    shiftTemplates: createDefaultRegionShiftTemplates(regionId),
    teamOrderIds: [],
    queues: {},
    holidays: []
  };
}

function getRegionSettings(regionId) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (!normalizedId) {
    return null;
  }

  data.regionalSettings ||= {};
  data.regionalSettings[normalizedId] ||= createDefaultRegionSettings(normalizedId);
  return data.regionalSettings[normalizedId];
}

function getScopedAssignmentRules(regionId = GLOBAL_REGION_SCOPE_ID) {
  return normalizeRegionScopeId(regionId)
    ? getRegionSettings(regionId).assignmentRules
    : data.assignmentRules;
}

function setScopedAssignmentRules(regionId, assignmentRules) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (normalizedId) {
    getRegionSettings(normalizedId).assignmentRules = assignmentRules;
    return;
  }

  data.assignmentRules = assignmentRules;
}

function getScopedShiftTemplates(regionId = GLOBAL_REGION_SCOPE_ID) {
  return normalizeRegionScopeId(regionId)
    ? getRegionSettings(regionId).shiftTemplates
    : data.shiftTemplates;
}

function setScopedShiftTemplates(regionId, shiftTemplates) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (normalizedId) {
    getRegionSettings(normalizedId).shiftTemplates = shiftTemplates;
    return;
  }

  data.shiftTemplates = shiftTemplates;
}

function getScopedSystems(regionId = GLOBAL_REGION_SCOPE_ID) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (!normalizedId) {
    return data.systems;
  }

  return data.systems.filter((system) => getSystemRegionIds(system).includes(normalizedId));
}

function getScopedQueues(regionId = GLOBAL_REGION_SCOPE_ID) {
  return normalizeRegionScopeId(regionId)
    ? getRegionSettings(regionId).queues
    : data.queues;
}

function getScopedHolidays(regionId = GLOBAL_REGION_SCOPE_ID) {
  return normalizeRegionScopeId(regionId)
    ? getRegionSettings(regionId).holidays
    : data.holidays;
}

function setScopedHolidays(regionId, holidays) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (normalizedId) {
    getRegionSettings(normalizedId).holidays = holidays;
    return;
  }

  data.holidays = holidays;
}

function getUsersForRegionScope(regionId = GLOBAL_REGION_SCOPE_ID) {
  const normalizedId = normalizeRegionScopeId(regionId);
  return normalizedId
    ? data.users.filter((user) => user.regionIds?.includes(normalizedId))
    : data.users;
}

function getRankedUsersForRegionScope(regionId = GLOBAL_REGION_SCOPE_ID) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (!normalizedId) {
    return data.users;
  }

  const usersById = new Map(getUsersForRegionScope(normalizedId).map((user) => [user.id, user]));
  return getRegionTeamOrderIds(normalizedId)
    .map((userId) => usersById.get(userId))
    .filter(Boolean);
}

function getRegionTeamOrderIds(regionId) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (!normalizedId) {
    return data.users.map((user) => user.id);
  }

  const settings = getRegionSettings(normalizedId);
  settings.teamOrderIds = normalizeTeamOrderIds(settings.teamOrderIds, normalizedId);
  return settings.teamOrderIds;
}

function setRegionTeamOrderIds(regionId, userIds) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (!normalizedId) {
    return;
  }

  getRegionSettings(normalizedId).teamOrderIds = normalizeTeamOrderIds(userIds, normalizedId);
}

function normalizeTeamOrderIds(userIds, regionId) {
  const regionUserIds = getUsersForRegionScope(regionId).map((user) => user.id);
  const validIds = new Set(regionUserIds);
  const seenIds = new Set();
  const normalizedIds = [];

  (Array.isArray(userIds) ? userIds : []).forEach((userId) => {
    const normalizedUserId = String(userId || "");
    if (validIds.has(normalizedUserId) && !seenIds.has(normalizedUserId)) {
      normalizedIds.push(normalizedUserId);
      seenIds.add(normalizedUserId);
    }
  });

  regionUserIds.forEach((userId) => {
    if (!seenIds.has(userId)) {
      normalizedIds.push(userId);
    }
  });

  return normalizedIds;
}

function addUserToRegionTeamOrder(regionId, userId) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (!normalizedId) {
    return;
  }

  const orderIds = getRegionTeamOrderIds(normalizedId);
  if (!orderIds.includes(userId)) {
    setRegionTeamOrderIds(normalizedId, orderIds.concat(userId));
  }
}

function removeUserFromRegionTeamOrder(regionId, userId) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (!normalizedId || !data.regionalSettings?.[normalizedId]) {
    return;
  }

  data.regionalSettings[normalizedId].teamOrderIds = (data.regionalSettings[normalizedId].teamOrderIds || [])
    .filter((id) => id !== userId);
}

function removeUserFromAllRegionTeamOrders(userId) {
  Object.keys(data.regionalSettings || {}).forEach((regionId) => removeUserFromRegionTeamOrder(regionId, userId));
}

function getSystemRegionIds(system) {
  if (!areRegionsEnabled()) {
    return [];
  }

  const validRegionIds = new Set((data?.regions || []).map((region) => region.id));
  const sourceIds = Array.isArray(system?.regionIds)
    ? system.regionIds
    : system?.regionId
      ? [system.regionId]
      : [];
  return Array.from(new Set(sourceIds.map(String).filter((regionId) => validRegionIds.has(regionId))));
}

function getSystemCoverageUsers(system) {
  const regionIds = getSystemRegionIds(system);
  if (!areRegionsEnabled() || regionIds.length === 0) {
    return data.users;
  }

  return data.users.filter((user) => regionIds.some((regionId) => user.regionIds?.includes(regionId)));
}

function getSystemRegionLabel(system) {
  const regionIds = getSystemRegionIds(system);
  if (!areRegionsEnabled() || regionIds.length === 0) {
    return "All regions";
  }

  return regionIds
    .map((regionId) => data.regions.find((region) => region.id === regionId)?.name || "Region")
    .join(", ");
}

function getDefaultSystemRegionIds(fallbackRegionId = GLOBAL_REGION_SCOPE_ID) {
  if (!areRegionsEnabled() || data.regions.length === 0) {
    return [];
  }

  const normalizedFallback = normalizeRegionScopeId(fallbackRegionId);
  return normalizedFallback ? [normalizedFallback] : data.regions.map((region) => region.id);
}

function userBelongsToAnyRegion(user, regionIds) {
  return !areRegionsEnabled()
    || regionIds.length === 0
    || regionIds.some((regionId) => user.regionIds?.includes(regionId));
}

function pruneSystemCoverageToRegions(system) {
  const regionIds = getSystemRegionIds(system);
  const allowedUserIds = new Set(data.users
    .filter((user) => userBelongsToAnyRegion(user, regionIds))
    .map((user) => user.id));
  system.primaryUserIds = Array.isArray(system.primaryUserIds)
    ? system.primaryUserIds.filter((userId) => allowedUserIds.has(userId))
    : [];
}

function ensureSystemQueues(system) {
  getSystemRegionIds(system).forEach((regionId) => {
    getScopedQueues(regionId)[system.id] ??= 0;
    clampQueue(system.id, regionId);
  });
  if (!areRegionsEnabled()) {
    data.queues[system.id] ??= 0;
    clampQueue(system.id, GLOBAL_REGION_SCOPE_ID);
  }
}

function removeSystemFromRegion(system, regionId) {
  system.regionIds = getSystemRegionIds(system).filter((id) => id !== regionId);
  delete getScopedQueues(regionId)[system.id];
  pruneSystemCoverageToRegions(system);
}

function getRegionById(regionId) {
  const normalizedId = String(regionId || "");
  return data?.regions?.find((region) => region.id === normalizedId)
    || DEFAULT_REGIONS.find((region) => region.id === normalizedId)
    || null;
}

function getDefaultRegionCoverageWindow(regionId = GLOBAL_REGION_SCOPE_ID, name = "") {
  const defaultRegion = DEFAULT_REGIONS.find((region) => region.id === regionId)
    || DEFAULT_REGIONS.find((region) => region.name.toLowerCase() === String(name).toLowerCase());
  return {
    coverageStart: defaultRegion?.coverageStart || "07:00",
    coverageEnd: defaultRegion?.coverageEnd || "19:00"
  };
}

function getRegionCoverageWindow(regionId) {
  const region = getRegionById(regionId);
  const fallback = getDefaultRegionCoverageWindow(regionId, region?.name);
  return {
    start: isValidTimeInput(region?.coverageStart || "") ? region.coverageStart : fallback.coverageStart,
    end: isValidTimeInput(region?.coverageEnd || "") ? region.coverageEnd : fallback.coverageEnd
  };
}

function formatRegionCoverageWindow(regionId, date = getScheduleReferenceDate()) {
  const coverageWindow = getRegionCoverageWindow(regionId);
  const abbreviation = getSelectedTimezoneAbbreviationForEasternTime(date, coverageWindow.start);
  return `${formatEasternTimeInputForDisplay(date, coverageWindow.start)}–${formatEasternTimeInputForDisplay(date, coverageWindow.end)} ${abbreviation}`;
}

function createDefaultRegionShiftTemplates(regionId = GLOBAL_REGION_SCOPE_ID) {
  const region = getRegionById(regionId);
  if (!region) {
    const baseShiftTemplates = Array.isArray(data?.shiftTemplates) && data.shiftTemplates.length > 0
      ? data.shiftTemplates
      : DEFAULT_SHIFT_TEMPLATES;
    return cloneData(baseShiftTemplates);
  }

  const coverageWindow = getRegionCoverageWindow(region.id);
  return [{
    id: `${region.id}-coverage`,
    name: `${region.name} region hours`,
    start: coverageWindow.start,
    end: coverageWindow.end
  }];
}

const DEFAULT_SHIFT_TEMPLATES = [
  { id: "early", name: "Early shift", start: "07:00", end: "15:00" },
  { id: "regular", name: "Regular shift", start: "09:00", end: "17:00" },
  { id: "late", name: "Late shift", start: "11:00", end: "19:00" }
];

const DEFAULT_ASSIGNMENT_RULES = { preset: SHIFT_ORDER_PRESET_ID };
const ASSIGNMENT_RULE_PRESETS = [
  {
    id: "expertise-first",
    name: "SME order",
    rules: ["queuePriority", "schedule", "teamPriority"]
  },
  {
    id: "schedule-first",
    name: "Shift order",
    rules: ["schedule", "lastTicketToday", "teamPriority"]
  }
];
const ALWAYS_ASSIGNMENT_RULES = ["availability"];
const ASSIGNMENT_RULE_LABELS = {
  availability: "Availability: who is online now?",
  schedule: "Schedule: earliest shift start",
  queuePriority: "SME order: coverage priority",
  teamPriority: "Team order: escalation hierarchy",
  lastTicketToday: "Rotation: longest time since last assignment"
};

const defaultData = {
  users: [
    {
      id: "alice",
      name: "Alice",
      regionIds: ["amer"],
      schedules: [
        { id: "alice-regular", shiftType: "regular", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "09:00", end: "17:00" }
      ]
    },
    {
      id: "ben",
      name: "Ben",
      regionIds: ["emea"],
      schedules: [
        { id: "ben-early", shiftType: "early", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "07:00", end: "15:00" }
      ]
    },
    {
      id: "casey",
      name: "Casey",
      regionIds: ["apac"],
      schedules: [
        { id: "casey-late", shiftType: "late", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "11:00", end: "19:00" }
      ]
    }
  ],
  systems: [
    { id: "external-system", name: "External System", primaryUserIds: ["alice", "ben", "casey"], serviceNowConfigItem: "External System" },
    { id: "internal-api", name: "Internal API", primaryUserIds: ["casey", "alice"], serviceNowConfigItem: "Internal API" }
  ],
  queues: {
    "external-system": 0,
    "internal-api": 0
  },
  queueBaselines: {
    global: {},
    regional: {}
  },
  shiftTemplates: DEFAULT_SHIFT_TEMPLATES,
  assignmentRules: DEFAULT_ASSIGNMENT_RULES,
  displayTimezones: DEFAULT_DISPLAY_TIMEZONES,
  incidentConfig: DEFAULT_INCIDENT_CONFIG,
  retentionPolicy: DEFAULT_RETENTION_POLICY,
  regions: DEFAULT_REGIONS,
  regionalSettings: {},
  delegationSlots: [],
  delegations: [],
  exceptions: [],
  holidays: [],
  assignmentLog: []
};

migrateLegacyStorageKeys();

let data = loadData();
let lastPersistedData = cloneData(data);
let sharedStateAvailable = false;
let sharedStateRevision = null;
let sharedStateSaveQueue = Promise.resolve();
let sharedStateSaveInProgress = false;
let sharedStateGeneration = 0;
let selectedAssigneeId = null;
let selectedOtherAssigneeId = null;
let initialDevModeRequested = isDevModeRequested();
let debugTimeOverride = initialDevModeRequested ? loadDebugTimeOverride() : null;
if (!initialDevModeRequested) {
  clearDebugTimeOverride();
}
let showRecentAssignments = false;
let showQueueDashboard = false;
let lastAssignmentId = null;
let editingAssignmentId = null;
let pendingServiceNowAssignmentId = null;
let editingSchedule = null;
let selectedAssignmentPolicyId = null;
let selectedAssignmentRegionId = GLOBAL_REGION_SCOPE_ID;
let selectedAdminRegionId = GLOBAL_REGION_SCOPE_ID;
let pendingRemoveUserId = null;
let pendingRemoveShiftId = null;
let pendingRemoveShiftRegionId = GLOBAL_REGION_SCOPE_ID;
let pendingRemoveSchedule = null;
let pendingRemoveHolidayId = null;
let pendingRemoveHolidayRegionId = GLOBAL_REGION_SCOPE_ID;
let shiftAddFormOpen = false;
let selectedDisplayTimezoneId = loadDisplayTimezone();
let devModeUnlocked = initialDevModeRequested && Boolean(debugTimeOverride);
let adminTimeInputsInitialized = false;
let timelineDrafts = [];
let timelineDrag = null;
const OTHER_ADMIN_TABS = ["rules", "users", "regions", "shifts", "systems", "timezones", "incidents", "data"];
const REGION_SCOPED_ADMIN_TABS = new Set(["schedules", "users", "rules", "shifts", "systems", "holidays"]);
const REGION_REQUIRED_ADMIN_TABS = new Set(["rules"]);
const ADMIN_TABS_WITH_DRAFT_SAVE = new Set(["rules", "shifts", "incidents"]);
const unlockedAdminTabs = new Set();
let saveToastTimer = null;
let activeAdminTabId = "schedules";

const elements = {
  displayTimezoneSelect: document.querySelector("#displayTimezoneSelect"),
  assignmentQueueTitle: document.querySelector("#assignmentQueueTitle"),
  debugDateInput: document.querySelector("#debugDateInput"),
  debugTimeInput: document.querySelector("#debugTimeInput"),
  debugTimeCard: document.querySelector("#debugTimeCard"),
  applyDebugTimeButton: document.querySelector("#applyDebugTimeButton"),
  resetDebugTimeButton: document.querySelector("#resetDebugTimeButton"),
  debugTimeStatus: document.querySelector("#debugTimeStatus"),
  devModeModal: document.querySelector("#devModeModal"),
  cancelDevModeButton: document.querySelector("#cancelDevModeButton"),
  confirmDevModeButton: document.querySelector("#confirmDevModeButton"),
  otherAdminSelect: document.querySelector("#otherAdminSelect"),
  adminRegionScopeCard: document.querySelector("#adminRegionScopeCard"),
  adminRegionScopeSelect: document.querySelector("#adminRegionScopeSelect"),
  adminRegionScopeHint: document.querySelector("#adminRegionScopeHint"),
  saveToast: document.querySelector("#saveToast"),
  saveToastText: document.querySelector("#saveToastText"),
  syncStateModal: document.querySelector("#syncStateModal"),
  syncStateModalTitle: document.querySelector("#syncStateModalTitle"),
  syncStateModalMessage: document.querySelector("#syncStateModalMessage"),
  closeSyncStateModalButton: document.querySelector("#closeSyncStateModalButton"),
  removeUserModal: document.querySelector("#removeUserModal"),
  removeUserModalName: document.querySelector("#removeUserModalName"),
  removeUserModalImpact: document.querySelector("#removeUserModalImpact"),
  cancelRemoveUserButton: document.querySelector("#cancelRemoveUserButton"),
  confirmRemoveUserButton: document.querySelector("#confirmRemoveUserButton"),
  removeShiftModal: document.querySelector("#removeShiftModal"),
  removeShiftModalName: document.querySelector("#removeShiftModalName"),
  removeShiftModalImpact: document.querySelector("#removeShiftModalImpact"),
  cancelRemoveShiftButton: document.querySelector("#cancelRemoveShiftButton"),
  confirmRemoveShiftButton: document.querySelector("#confirmRemoveShiftButton"),
  removeScheduleModal: document.querySelector("#removeScheduleModal"),
  removeScheduleModalName: document.querySelector("#removeScheduleModalName"),
  removeScheduleModalImpact: document.querySelector("#removeScheduleModalImpact"),
  cancelRemoveScheduleButton: document.querySelector("#cancelRemoveScheduleButton"),
  removeScheduleDayButton: document.querySelector("#removeScheduleDayButton"),
  removeScheduleAllButton: document.querySelector("#removeScheduleAllButton"),
  removeHolidayModal: document.querySelector("#removeHolidayModal"),
  removeHolidayModalName: document.querySelector("#removeHolidayModalName"),
  removeHolidayModalImpact: document.querySelector("#removeHolidayModalImpact"),
  cancelRemoveHolidayButton: document.querySelector("#cancelRemoveHolidayButton"),
  confirmRemoveHolidayButton: document.querySelector("#confirmRemoveHolidayButton"),
  backupUnlockModal: document.querySelector("#backupUnlockModal"),
  cancelBackupUnlockButton: document.querySelector("#cancelBackupUnlockButton"),
  confirmBackupUnlockButton: document.querySelector("#confirmBackupUnlockButton"),
  assignmentRegionField: document.querySelector("#assignmentRegionField"),
  assignmentRegionSelect: document.querySelector("#assignmentRegionSelect"),
  assignmentSystemSelect: document.querySelector("#assignmentSystemSelect"),
  markAssignedButton: document.querySelector("#markAssignedButton"),
  assignmentConfirmation: document.querySelector("#assignmentConfirmation"),
  serviceNowIncidentModal: document.querySelector("#serviceNowIncidentModal"),
  serviceNowIncidentForm: document.querySelector("#serviceNowIncidentForm"),
  serviceNowDescriptionInput: document.querySelector("#serviceNowDescriptionInput"),
  serviceNowConfigItemInput: document.querySelector("#serviceNowConfigItemInput"),
  serviceNowPrioritySelect: document.querySelector("#serviceNowPrioritySelect"),
  cancelServiceNowIncidentButton: document.querySelector("#cancelServiceNowIncidentButton"),
  queueSection: document.querySelector("#queueSection"),
  queueList: document.querySelector("#queueList"),
  otherAssigneePicker: document.querySelector("#otherAssigneePicker"),
  otherAssigneeSelect: document.querySelector("#otherAssigneeSelect"),
  dailyRankingsList: document.querySelector("#dailyRankingsList"),
  recentAssignmentsPanel: document.querySelector("#recentAssignmentsPanel"),
  activityPanelSection: document.querySelector("#activityPanelSection"),
  toggleQueueDashboardButton: document.querySelector("#toggleQueueDashboardButton"),
  queueDashboardRegionField: document.querySelector("#queueDashboardRegionField"),
  queueDashboardRegionSelect: document.querySelector("#queueDashboardRegionSelect"),
  queueDashboardPanel: document.querySelector("#queueDashboardPanel"),
  queueDashboardList: document.querySelector("#queueDashboardList"),
  toggleRecentAssignmentsButton: document.querySelector("#toggleRecentAssignmentsButton"),
  assignmentLog: document.querySelector("#assignmentLog"),
  addUserForm: document.querySelector("#addUserForm"),
  userNameInput: document.querySelector("#userNameInput"),
  usersScopeMeta: document.querySelector("#usersScopeMeta"),
  usersList: document.querySelector("#usersList"),
  addRegionForm: document.querySelector("#addRegionForm"),
  regionNameInput: document.querySelector("#regionNameInput"),
  regionCoverageStartInput: document.querySelector("#regionCoverageStartInput"),
  regionCoverageEndInput: document.querySelector("#regionCoverageEndInput"),
  regionsEnabledInput: document.querySelector("#regionsEnabledInput"),
  regionsEnabledLabel: document.querySelector("#regionsEnabledLabel"),
  regionsList: document.querySelector("#regionsList"),
  addScheduleForm: document.querySelector("#addScheduleForm"),
  scheduleFormTitle: document.querySelector("#scheduleFormTitle"),
  scheduleSubmitButton: document.querySelector("#scheduleSubmitButton"),
  cancelScheduleEditButton: document.querySelector("#cancelScheduleEditButton"),
  scheduleUserSelect: document.querySelector("#scheduleUserSelect"),
  shiftTemplateSelect: document.querySelector("#shiftTemplateSelect"),
  dayCheckboxes: document.querySelector("#dayCheckboxes"),
  scheduleStartDateInput: document.querySelector("#scheduleStartDateInput"),
  scheduleEndDateInput: document.querySelector("#scheduleEndDateInput"),
  scheduleStartInput: document.querySelector("#scheduleStartInput"),
  scheduleEndInput: document.querySelector("#scheduleEndInput"),
  showAddShiftButton: document.querySelector("#showAddShiftButton"),
  addShiftForm: document.querySelector("#addShiftForm"),
  cancelAddShiftButton: document.querySelector("#cancelAddShiftButton"),
  shiftNameInput: document.querySelector("#shiftNameInput"),
  shiftStartInput: document.querySelector("#shiftStartInput"),
  shiftEndInput: document.querySelector("#shiftEndInput"),
  shiftsList: document.querySelector("#shiftsList"),
  shiftsScopeMeta: document.querySelector("#shiftsScopeMeta"),
  assignmentRulesForm: document.querySelector("#assignmentRulesForm"),
  assignmentRulesScopeMeta: document.querySelector("#assignmentRulesScopeMeta"),
  assignmentPolicyDescriptions: document.querySelector("#assignmentPolicyDescriptions"),
  scheduleViewSelect: document.querySelector("#scheduleViewSelect"),
  graphDateLabel: document.querySelector("#graphDateLabel"),
  scheduleDaysLegend: document.querySelector("#scheduleDaysLegend"),
  scheduleStartLabel: document.querySelector("#scheduleStartLabel"),
  scheduleEndLabel: document.querySelector("#scheduleEndLabel"),
  scheduleGraphTitle: document.querySelector("#scheduleGraphTitle"),
  shiftStartLabel: document.querySelector("#shiftStartLabel"),
  shiftEndLabel: document.querySelector("#shiftEndLabel"),
  timelineDateInput: document.querySelector("#timelineDateInput"),
  timelineCanvas: document.querySelector("#timelineCanvas"),
  timelineDraftActions: document.querySelector("#timelineDraftActions"),
  timelineDraftTitle: document.querySelector("#timelineDraftTitle"),
  timelineDraftMeta: document.querySelector("#timelineDraftMeta"),
  saveTimelineDraftButton: document.querySelector("#saveTimelineDraftButton"),
  clearTimelineDraftButton: document.querySelector("#clearTimelineDraftButton"),
  addDelegationSlotForm: document.querySelector("#addDelegationSlotForm"),
  toggleDelegationSlotEditorButton: document.querySelector("#toggleDelegationSlotEditorButton"),
  closeDelegationSlotEditorButton: document.querySelector("#closeDelegationSlotEditorButton"),
  delegationSlotEditor: document.querySelector("#delegationSlotEditor"),
  delegationStartInput: document.querySelector("#delegationStartInput"),
  delegationEndInput: document.querySelector("#delegationEndInput"),
  delegationStartLabel: document.querySelector("#delegationStartLabel"),
  delegationEndLabel: document.querySelector("#delegationEndLabel"),
  delegationViewSelect: document.querySelector("#delegationViewSelect"),
  delegationGraphDateLabel: document.querySelector("#delegationGraphDateLabel"),
  delegationGraphDateInput: document.querySelector("#delegationGraphDateInput"),
  delegationCanvas: document.querySelector("#delegationCanvas"),
  saveDelegationAssignmentsButton: document.querySelector("#saveDelegationAssignmentsButton"),
  delegationSlotsList: document.querySelector("#delegationSlotsList"),
  delegationAssignmentsList: document.querySelector("#delegationAssignmentsList"),
  addSystemForm: document.querySelector("#addSystemForm"),
  systemNameInput: document.querySelector("#systemNameInput"),
  systemsList: document.querySelector("#systemsList"),
  systemsScopeMeta: document.querySelector("#systemsScopeMeta"),
  addHolidayForm: document.querySelector("#addHolidayForm"),
  holidayUserSelect: document.querySelector("#holidayUserSelect"),
  holidayTypeSelect: document.querySelector("#holidayTypeSelect"),
  holidayDateRangeFields: document.querySelector("#holidayDateRangeFields"),
  holidayDateLabel: document.querySelector("#holidayDateLabel"),
  holidayDateInput: document.querySelector("#holidayDateInput"),
  holidayEndDateField: document.querySelector("#holidayEndDateField"),
  holidayEndDateInput: document.querySelector("#holidayEndDateInput"),
  holidayTimeFields: document.querySelector("#holidayTimeFields"),
  holidayStartLabel: document.querySelector("#holidayStartLabel"),
  holidayEndLabel: document.querySelector("#holidayEndLabel"),
  holidayStartInput: document.querySelector("#holidayStartInput"),
  holidayEndInput: document.querySelector("#holidayEndInput"),
  holidayNameInput: document.querySelector("#holidayNameInput"),
  holidaysList: document.querySelector("#holidaysList"),
  incidentConfigForm: document.querySelector("#incidentConfigForm"),
  incidentEnabledInput: document.querySelector("#incidentEnabledInput"),
  incidentEnabledLabel: document.querySelector("#incidentEnabledLabel"),
  incidentConfigFields: document.querySelector("#incidentConfigFields"),
  incidentRedirectUrlInput: document.querySelector("#incidentRedirectUrlInput"),
  incidentRedirectSettings: document.querySelector("#incidentRedirectSettings"),
  incidentServiceNowSettings: document.querySelector("#incidentServiceNowSettings"),
  serviceNowInstanceUrlInput: document.querySelector("#serviceNowInstanceUrlInput"),
  serviceNowApiPathInput: document.querySelector("#serviceNowApiPathInput"),
  serviceNowShortDescriptionInput: document.querySelector("#serviceNowShortDescriptionInput"),
  serviceNowHiddenFieldNameInput: document.querySelector("#serviceNowHiddenFieldNameInput"),
  serviceNowHiddenFieldValueInput: document.querySelector("#serviceNowHiddenFieldValueInput"),
  addServiceNowHiddenFieldButton: document.querySelector("#addServiceNowHiddenFieldButton"),
  serviceNowHiddenFieldsList: document.querySelector("#serviceNowHiddenFieldsList"),
  teamsEnabledInput: document.querySelector("#teamsEnabledInput"),
  teamsEnabledLabel: document.querySelector("#teamsEnabledLabel"),
  teamsConfigFields: document.querySelector("#teamsConfigFields"),
  teamsWebhookUrlInput: document.querySelector("#teamsWebhookUrlInput"),
  teamsMessageFormatSelect: document.querySelector("#teamsMessageFormatSelect"),
  teamsMessageTemplateInput: document.querySelector("#teamsMessageTemplateInput"),
  retentionPolicyForm: document.querySelector("#retentionPolicyForm"),
  assignmentRetentionDaysInput: document.querySelector("#assignmentRetentionDaysInput"),
  oooRetentionDaysInput: document.querySelector("#oooRetentionDaysInput"),
  delegationRetentionDaysInput: document.querySelector("#delegationRetentionDaysInput"),
  backupRetentionDaysInput: document.querySelector("#backupRetentionDaysInput"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  resetButton: document.querySelector("#resetButton"),
  dataPreview: document.querySelector("#dataPreview"),
  contactDevButton: document.querySelector("#contactDevButton"),
  contactDevModal: document.querySelector("#contactDevModal"),
  closeContactDevModalButton: document.querySelector("#closeContactDevModalButton"),
  copyContactEmailButton: document.querySelector("#copyContactEmailButton"),
  contactEmailDisplay: document.querySelector("#contactEmailDisplay"),
  genericAlertModal: document.querySelector("#genericAlertModal"),
  genericAlertModalTitle: document.querySelector("#genericAlertModalTitle"),
  genericAlertModalMessage: document.querySelector("#genericAlertModalMessage"),
  closeGenericAlertButton: document.querySelector("#closeGenericAlertButton"),
  genericConfirmModal: document.querySelector("#genericConfirmModal"),
  genericConfirmModalTitle: document.querySelector("#genericConfirmModalTitle"),
  genericConfirmModalMessage: document.querySelector("#genericConfirmModalMessage"),
  cancelGenericConfirmButton: document.querySelector("#cancelGenericConfirmButton"),
  confirmGenericConfirmButton: document.querySelector("#confirmGenericConfirmButton"),
  timezoneList: document.querySelector("#timezoneList"),
  addTimezoneForm: document.querySelector("#addTimezoneForm"),
  addTimezoneSelect: document.querySelector("#addTimezoneSelect")
};

applyTheme(loadTheme());

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  renderDayCheckboxes();
  await initializeSharedState();
  render();
  window.setInterval(renderClockAndAssignment, 30000);
  window.setInterval(refreshSharedStateIfIdle, SHARED_STATE_REFRESH_MS);
  window.addEventListener("focus", refreshSharedStateIfIdle);
});

function bindEvents() {
  bindBrowserThemePreference();
  maybePromptForDevMode();

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", toggleTheme);
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  document.querySelectorAll("[data-lockable-admin-tab]").forEach((panel) => {
    panel.addEventListener("click", handleAdminLockAction);
  });

  on(elements.otherAdminSelect, "change", () => {
    if (elements.otherAdminSelect.value) {
      activateTab(elements.otherAdminSelect.value);
    }
  });
  on(elements.adminRegionScopeSelect, "change", changeAdminRegionScope);
  on(elements.assignmentRegionSelect, "change", changeAssignmentRegion);
  on(elements.queueDashboardRegionSelect, "change", changeQueueDashboardRegion);

  on(elements.assignmentSystemSelect, "change", () => {
    clearSelectedAssignee();
    lastAssignmentId = null;
    renderClockAndAssignment();
  });
  on(elements.displayTimezoneSelect, "change", changeDisplayTimezone);
  on(elements.cancelDevModeButton, "click", closeDevModeModal);
  on(elements.confirmDevModeButton, "click", confirmDevMode);
  on(elements.devModeModal, "click", (event) => {
    if (event.target === elements.devModeModal) {
      closeDevModeModal();
    }
  });
  on(elements.closeSyncStateModalButton, "click", closeSyncStateModal);
  on(elements.syncStateModal, "click", (event) => {
    if (event.target === elements.syncStateModal) {
      closeSyncStateModal();
    }
  });
  on(elements.markAssignedButton, "click", markSelectedAssigned);
  on(elements.serviceNowIncidentForm, "submit", saveServiceNowIncidentDetails);
  on(elements.cancelServiceNowIncidentButton, "click", closeServiceNowIncidentModal);
  on(elements.serviceNowIncidentModal, "click", (event) => {
    if (event.target === elements.serviceNowIncidentModal) {
      closeServiceNowIncidentModal();
    }
  });
  on(elements.otherAssigneeSelect, "change", () => {
    selectedOtherAssigneeId = elements.otherAssigneeSelect.value || null;
    renderClockAndAssignment();
  });
  on(elements.applyDebugTimeButton, "click", applyDebugTimeOverride);
  on(elements.resetDebugTimeButton, "click", resetDebugTimeOverride);
  on(elements.toggleQueueDashboardButton, "click", toggleQueueDashboard);
  on(elements.toggleRecentAssignmentsButton, "click", toggleRecentAssignments);
  on(elements.addUserForm, "submit", addUser);
  on(elements.addRegionForm, "submit", addRegion);
  on(elements.regionsEnabledInput, "change", toggleRegionsEnabled);
  on(elements.cancelRemoveUserButton, "click", closeRemoveUserModal);
  on(elements.confirmRemoveUserButton, "click", confirmRemoveUser);
  on(elements.removeUserModal, "click", (event) => {
    if (event.target === elements.removeUserModal) {
      closeRemoveUserModal();
    }
  });
  on(elements.cancelRemoveShiftButton, "click", closeRemoveShiftModal);
  on(elements.confirmRemoveShiftButton, "click", confirmRemoveShift);
  on(elements.removeShiftModal, "click", (event) => {
    if (event.target === elements.removeShiftModal) {
      closeRemoveShiftModal();
    }
  });
  on(elements.cancelRemoveScheduleButton, "click", closeRemoveScheduleModal);
  on(elements.removeScheduleDayButton, "click", confirmRemoveScheduleDay);
  on(elements.removeScheduleAllButton, "click", confirmRemoveScheduleAll);
  on(elements.removeScheduleModal, "click", (event) => {
    if (event.target === elements.removeScheduleModal) {
      closeRemoveScheduleModal();
    }
  });
  on(elements.cancelRemoveHolidayButton, "click", closeRemoveHolidayModal);
  on(elements.confirmRemoveHolidayButton, "click", confirmRemoveHoliday);
  on(elements.removeHolidayModal, "click", (event) => {
    if (event.target === elements.removeHolidayModal) {
      closeRemoveHolidayModal();
    }
  });
  on(elements.cancelBackupUnlockButton, "click", closeBackupUnlockModal);
  on(elements.confirmBackupUnlockButton, "click", confirmBackupUnlock);
  on(elements.backupUnlockModal, "click", (event) => {
    if (event.target === elements.backupUnlockModal) {
      closeBackupUnlockModal();
    }
  });
  on(elements.addScheduleForm, "submit", addSchedule);
  on(elements.cancelScheduleEditButton, "click", cancelScheduleEdit);
  on(elements.assignmentRulesForm, "submit", saveAssignmentRules);
  on(elements.assignmentPolicyDescriptions, "click", selectAssignmentPolicyFromCard);
  on(elements.showAddShiftButton, "click", toggleShiftAddForm);
  on(elements.cancelAddShiftButton, "click", cancelShiftAddForm);
  on(elements.addShiftForm, "submit", addShiftTemplate);
  on(elements.shiftTemplateSelect, "change", applyShiftTemplate);
  on(elements.scheduleStartDateInput, "change", () => normalizeScheduleDateRangeInputs("start"));
  on(elements.scheduleEndDateInput, "change", () => normalizeScheduleDateRangeInputs("end"));
  on(elements.scheduleStartInput, "input", () => {
    elements.shiftTemplateSelect.value = "custom";
    updateForwardTimeInputConstraints();
  });
  on(elements.scheduleEndInput, "input", updateForwardTimeInputConstraints);
  on(elements.scheduleViewSelect, "change", renderTimezoneSensitiveAdminViews);
  on(elements.timelineDateInput, "change", () => {
    syncScheduleDateRangeToGraphWeek();
    renderTimezoneSensitiveAdminViews();
  });
  on(elements.timelineCanvas, "pointerdown", startTimelineDraft);
  on(elements.timelineCanvas, "pointermove", moveTimelineDraft);
  on(elements.timelineCanvas, "click", prefillSlotFromTimeline);
  on(elements.saveTimelineDraftButton, "click", saveTimelineDraftSchedule);
  on(elements.clearTimelineDraftButton, "click", clearTimelineDraft);
  on(elements.addDelegationSlotForm, "submit", addDelegationSlot);
  on(elements.toggleDelegationSlotEditorButton, "click", () => toggleDelegationSlotEditor());
  on(elements.closeDelegationSlotEditorButton, "click", () => setDelegationSlotEditorVisible(false));
  on(elements.saveDelegationAssignmentsButton, "click", saveDelegationAssignmentBoard);
  on(elements.delegationViewSelect, "change", renderDelegations);
  on(elements.delegationGraphDateInput, "change", renderDelegations);
  on(elements.delegationCanvas, "change", handleDelegationOwnerSelectChange);
  on(elements.delegationStartInput, "input", updateForwardTimeInputConstraints);
  on(elements.delegationEndInput, "input", updateForwardTimeInputConstraints);
  on(elements.addSystemForm, "submit", addSystem);
  on(elements.addHolidayForm, "submit", addHoliday);
  on(elements.holidayTypeSelect, "change", renderHolidayFormMode);
  on(elements.holidayDateInput, "change", () => {
    normalizeHolidayDateRangeInputs("start");
    renderAdminTimezoneLabels();
  });
  on(elements.holidayEndDateInput, "change", () => normalizeHolidayDateRangeInputs("end"));
  on(elements.holidayStartInput, "input", updateForwardTimeInputConstraints);
  on(elements.holidayEndInput, "input", updateForwardTimeInputConstraints);
  on(elements.incidentConfigForm, "submit", saveIncidentConfig);
  on(elements.incidentEnabledInput, "change", updateIncidentConfigControlState);
  on(elements.addServiceNowHiddenFieldButton, "click", addServiceNowHiddenField);
  document.querySelectorAll("input[name='incidentCreationMode']").forEach((input) => {
    input.addEventListener("change", updateIncidentConfigControlState);
  });
  on(elements.teamsEnabledInput, "change", updateIncidentConfigControlState);
  on(elements.addTimezoneForm, "submit", addTimezone);
  on(elements.shiftStartInput, "input", updateForwardTimeInputConstraints);
  on(elements.shiftEndInput, "input", updateForwardTimeInputConstraints);
  on(elements.retentionPolicyForm, "submit", saveRetentionPolicy);
  on(elements.exportButton, "click", exportData);
  on(elements.importInput, "change", importData);
  on(elements.resetButton, "click", resetData);
  on(elements.contactDevButton, "click", openContactDevModal);
  on(elements.closeContactDevModalButton, "click", closeContactDevModal);
  on(elements.copyContactEmailButton, "click", copyContactEmail);
  on(elements.contactDevModal, "click", (event) => {
    if (event.target === elements.contactDevModal) {
      closeContactDevModal();
    }
  });
  on(elements.closeGenericAlertButton, "click", closeGenericAlert);
  on(elements.genericAlertModal, "click", (event) => {
    if (event.target === elements.genericAlertModal) {
      closeGenericAlert();
    }
  });
  on(elements.cancelGenericConfirmButton, "click", closeGenericConfirm);
  on(elements.confirmGenericConfirmButton, "click", confirmGenericConfirm);
  on(elements.genericConfirmModal, "click", (event) => {
    if (event.target === elements.genericConfirmModal) {
      closeGenericConfirm();
    }
  });
  document.addEventListener("keydown", handleGlobalKeydown);
  document.addEventListener("pointerup", finishTimelineDraft);
}

function on(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && elements.removeUserModal && !elements.removeUserModal.classList.contains("hidden")) {
    closeRemoveUserModal();
  }
  if (event.key === "Escape" && elements.removeShiftModal && !elements.removeShiftModal.classList.contains("hidden")) {
    closeRemoveShiftModal();
  }
  if (event.key === "Escape" && elements.removeScheduleModal && !elements.removeScheduleModal.classList.contains("hidden")) {
    closeRemoveScheduleModal();
  }
  if (event.key === "Escape" && elements.removeHolidayModal && !elements.removeHolidayModal.classList.contains("hidden")) {
    closeRemoveHolidayModal();
  }
  if (event.key === "Escape" && elements.backupUnlockModal && !elements.backupUnlockModal.classList.contains("hidden")) {
    closeBackupUnlockModal();
  }
  if (event.key === "Escape" && elements.devModeModal && !elements.devModeModal.classList.contains("hidden")) {
    closeDevModeModal();
  }
  if (event.key === "Escape" && elements.syncStateModal && !elements.syncStateModal.classList.contains("hidden")) {
    closeSyncStateModal();
  }
  if (event.key === "Escape" && elements.serviceNowIncidentModal && !elements.serviceNowIncidentModal.classList.contains("hidden")) {
    closeServiceNowIncidentModal();
  }
  if (event.key === "Escape" && elements.genericAlertModal && !elements.genericAlertModal.classList.contains("hidden")) {
    closeGenericAlert();
  }
  if (event.key === "Escape" && elements.genericConfirmModal && !elements.genericConfirmModal.classList.contains("hidden")) {
    closeGenericConfirm();
  }
  if (event.key === "Escape" && elements.contactDevModal && !elements.contactDevModal.classList.contains("hidden")) {
    closeContactDevModal();
  }
}

function loadTheme() {
  return getSavedTheme() || getBrowserTheme();
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function bindBrowserThemePreference() {
  if (!window.matchMedia) {
    return;
  }

  const browserThemePreference = window.matchMedia(THEME_MEDIA_QUERY);
  const syncThemeWithBrowserPreference = () => {
    if (!getSavedTheme()) {
      applyTheme(getBrowserTheme());
    }
  };

  if (browserThemePreference.addEventListener) {
    browserThemePreference.addEventListener("change", syncThemeWithBrowserPreference);
  } else if (browserThemePreference.addListener) {
    browserThemePreference.addListener(syncThemeWithBrowserPreference);
  }
}

function getSavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === "dark" || savedTheme === "light" ? savedTheme : null;
}

function getBrowserTheme() {
  return window.matchMedia?.(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const isDark = theme === "dark";
    const icon = button.querySelector("[data-theme-toggle-icon]");
    const text = button.querySelector("[data-theme-toggle-text]");
    if (icon) {
      icon.textContent = isDark ? "☾" : "☀";
    }
    if (text) {
      text.textContent = isDark ? "Dark" : "Light";
    }
    button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  });
}

function activateTab(tabName) {
  activeAdminTabId = tabName;

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  if (elements.otherAdminSelect) {
    const isOtherTab = OTHER_ADMIN_TABS.includes(tabName);
    elements.otherAdminSelect.value = isOtherTab ? tabName : "";
    elements.otherAdminSelect.classList.toggle("active", isOtherTab);
  }

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Tab`);
  });

  renderRegionScopeControls();
  if (activeAdminTabId === "rules") {
    selectedAssignmentPolicyId = null;
    renderAssignmentRules();
  }
  renderAdminLocks();
}

function render() {
  normalizeData();
  setDefaultDates();
  initializeAdminTimeInputs();
  renderRegionScopeControls();
  renderSystemSelect();
  renderUserSelectors();
  renderShiftTemplateSelect();
  renderAssignmentRules();
  renderScheduleFormMode();
  renderAdminTimezoneLabels();
  renderShifts();
  renderShiftAddForm();
  renderRegions();
  renderUsers();
  renderSystems();
  renderHolidayFormMode();
  renderHolidays();
  renderIncidentConfig();
  renderDelegationSlots();
  renderDelegations();
  renderTimelineTools();
  renderTimezoneAdmin();
  renderRetentionPolicy();
  renderDataPreview();
  updateForwardTimeInputConstraints();
  renderDisplayTimezoneSelect();
  renderClockAndAssignment();
  renderAdminLocks();
}

function renderRegionScopeControls() {
  selectedAssignmentRegionId = normalizeRegionScopeId(selectedAssignmentRegionId);
  selectedAdminRegionId = normalizeAdminRegionScopeId(selectedAdminRegionId);
  renderRegionScopeSelect(elements.assignmentRegionSelect, selectedAssignmentRegionId, elements.assignmentRegionField);
  renderRegionScopeSelect(elements.queueDashboardRegionSelect, selectedAssignmentRegionId, elements.queueDashboardRegionField);
  renderAdminRegionScopeControl();
}

function normalizeAdminRegionScopeId(regionId, tabId = activeAdminTabId) {
  const normalizedId = normalizeRegionScopeId(regionId);
  if (hasRegionalScopes() && REGION_REQUIRED_ADMIN_TABS.has(tabId)) {
    return normalizedId || data.regions[0]?.id || GLOBAL_REGION_SCOPE_ID;
  }

  return normalizedId;
}

function renderAdminRegionScopeControl() {
  if (!elements.adminRegionScopeSelect) {
    return;
  }

  const showAdminRegionScope = hasRegionalScopes() && REGION_SCOPED_ADMIN_TABS.has(activeAdminTabId);
  elements.adminRegionScopeCard?.classList.toggle("hidden", !showAdminRegionScope);
  if (!showAdminRegionScope) {
    elements.adminRegionScopeSelect.innerHTML = "";
    if (elements.adminRegionScopeHint) {
      elements.adminRegionScopeHint.textContent = "";
    }
    return;
  }

  const requiresRegionScope = REGION_REQUIRED_ADMIN_TABS.has(activeAdminTabId);
  selectedAdminRegionId = normalizeAdminRegionScopeId(selectedAdminRegionId);
  renderRegionScopeSelect(elements.adminRegionScopeSelect, selectedAdminRegionId, elements.adminRegionScopeCard, {
    includeGlobal: !requiresRegionScope
  });
  renderAdminRegionScopeCopy();
}

function renderRegionScopeSelect(select, selectedRegionId, container = null, settings = {}) {
  if (!select) {
    return;
  }

  const includeGlobalOption = settings.includeGlobal !== false;
  const showRegionSelector = hasRegionalScopes();
  container?.classList.toggle("hidden", !showRegionSelector);
  if (!showRegionSelector) {
    select.innerHTML = "";
    select.value = GLOBAL_REGION_SCOPE_ID;
    return;
  }

  const normalizedSelection = includeGlobalOption
    ? normalizeRegionScopeId(selectedRegionId)
    : normalizeAdminRegionScopeId(selectedRegionId);
  const optionHtml = [
    ...(includeGlobalOption ? [`<option value="${GLOBAL_REGION_SCOPE_ID}">${escapeHtml(GLOBAL_REGION_SCOPE_NAME)}</option>`] : []),
    ...data.regions.map((region) => `<option value="${escapeHtml(region.id)}">${escapeHtml(region.name)}</option>`)
  ];
  select.innerHTML = optionHtml.join("");
  select.value = normalizedSelection;
}

function changeAssignmentRegion() {
  selectedAssignmentRegionId = normalizeRegionScopeId(elements.assignmentRegionSelect?.value);
  clearSelectedAssignee();
  lastAssignmentId = null;
  renderSystemSelect();
  renderClockAndAssignment();
}

function changeQueueDashboardRegion() {
  selectedAssignmentRegionId = normalizeRegionScopeId(elements.queueDashboardRegionSelect?.value);
  clearSelectedAssignee();
  lastAssignmentId = null;
  renderSystemSelect();
  renderClockAndAssignment();
}

function changeAdminRegionScope() {
  selectedAdminRegionId = normalizeAdminRegionScopeId(elements.adminRegionScopeSelect?.value);
  selectedAssignmentPolicyId = null;
  editingSchedule = null;
  timelineDrafts = [];
  shiftAddFormOpen = false;
  render();
}

function renderAdminRegionScopeCopy() {
  const scopeLabel = getRegionScopeLabel(selectedAdminRegionId);
  const coverageWindow = selectedAdminRegionId ? formatRegionCoverageWindow(selectedAdminRegionId, getScheduleReferenceDate()) : "";
  if (elements.adminRegionScopeHint) {
    elements.adminRegionScopeHint.textContent = getAdminRegionScopeHint(scopeLabel, coverageWindow);
  }
  if (elements.assignmentRulesScopeMeta) {
    elements.assignmentRulesScopeMeta.textContent = `Editing rules for ${scopeLabel}.`;
  }
  if (elements.shiftsScopeMeta) {
    elements.shiftsScopeMeta.textContent = selectedAdminRegionId
      ? ""
      : hasRegionalScopes()
        ? ""
        : "Editing global shift presets.";
  }
  if (elements.systemsScopeMeta) {
    const systemsScopeCopy = selectedAdminRegionId
      ? ""
      : "Pick one or more regions on each system. Coverage users come from the selected system regions.";
    elements.systemsScopeMeta.textContent = systemsScopeCopy;
    elements.systemsScopeMeta.classList.toggle("hidden", !systemsScopeCopy);
  }
}

function getAdminRegionScopeHint(scopeLabel, coverageWindow) {
  const copy = {
    schedules: "",
    users: selectedAdminRegionId
      ? ""
      : "Global team view: all users with regional breakdowns. Pick a region to manage only that region’s members.",
    rules: `Editing assignment rules for ${scopeLabel}.`,
    shifts: selectedAdminRegionId
      ? `Editing ${scopeLabel} shift presets. Default region-hours preset: ${coverageWindow}.`
      : "Global shifts view: default shift presets. Pick a region to edit that region’s shift presets.",
    systems: selectedAdminRegionId
      ? `Showing coverage systems attached to ${scopeLabel}. Coverage users come from this region’s team.`
      : "Global coverage view: all systems. Pick one or more regions on each system, or pick a region to manage its systems.",
    holidays: ""
  };

  return copy[activeAdminTabId] || "";
}

function renderClockAndAssignment() {
  const easternNow = getEasternNow();
  const activityNow = getEffectiveQueueNow(easternNow, selectedAssignmentRegionId);
  renderRegionScopeControls();
  renderDebugTimeControls(easternNow);
  renderDisplayTimezoneSelect(easternNow);

  if (!elements.assignmentSystemSelect) {
    return;
  }

  const shiftOrderMode = isShiftOrderPolicy(selectedAssignmentRegionId);
  const hasQueueContext = shiftOrderMode || Boolean(elements.assignmentSystemSelect.value);
  setAssignmentPickerVisible(!shiftOrderMode);
  setAssignmentSectionsVisible(hasQueueContext);
  if (elements.assignmentQueueTitle) {
    elements.assignmentQueueTitle.textContent = shiftOrderMode ? "Shift queue" : "Coverage queue";
  }

  if (!hasQueueContext) {
    clearSelectedAssignee();
    renderAssignmentConfirmation(false);
    renderSuggestion({ system: null, rows: [], recommendedRow: null });
    renderQueue({ system: null, rows: [], recommendedRow: null });
    renderDailyRankings(activityNow.date);
    renderDelegationAssignments(easternNow);
    renderQueueDashboard(easternNow);
    renderAssignmentLog();
    return;
  }

  const queueState = getQueueState(getAssignmentQueueSystemId(), easternNow, selectedAssignmentRegionId);
  if (!queueState.rows.some((row) => row.user.id === selectedAssigneeId && row.selectable)) {
    selectedAssigneeId = queueState.recommendedRow?.user.id ?? null;
    selectedOtherAssigneeId = null;
  }
  ensureOtherAssigneeSelection(queueState);

  renderSuggestion(queueState);
  renderQueue(queueState);
  renderAssignmentConfirmation(true);
  renderDailyRankings(queueState.effectiveNow.date);
  renderDelegationAssignments(easternNow);
  renderQueueDashboard(easternNow);
  renderAssignmentLog();
}

function clearSelectedAssignee() {
  selectedAssigneeId = null;
  selectedOtherAssigneeId = null;
}

function ensureOtherAssigneeSelection(queueState) {
  if (selectedAssigneeId !== OTHER_QUEUE_USER_ID) {
    selectedOtherAssigneeId = null;
    return;
  }

  if (getSelectedOtherRosterRow(queueState)) {
    return;
  }

  selectedOtherAssigneeId = getSelectableOtherRows(queueState)[0]?.user.id || null;
}

function getSelectedOtherRosterRow(queueState) {
  return queueState.otherRows?.find((row) => row.user.id === selectedOtherAssigneeId && row.selectable) || null;
}

function getSelectableOtherRows(queueState) {
  return queueState.otherRows?.filter((row) => row.selectable) || [];
}

function setAssignmentSectionsVisible(isVisible) {
  elements.queueSection?.classList.toggle("hidden", !isVisible);
}

function setAssignmentPickerVisible(isVisible) {
  elements.assignmentSystemSelect?.closest(".field")?.classList.toggle("hidden", !isVisible);
}

function renderDisplayTimezoneSelect(easternNow = getEasternNow()) {
  if (!elements.displayTimezoneSelect) {
    return;
  }

  selectedDisplayTimezoneId = getDisplayTimezone(selectedDisplayTimezoneId).id;
  const timezoneOptions = getDisplayTimezones().map((timezone) => (
    `<option value="${escapeHtml(timezone.id)}">${escapeHtml(formatDisplayClock(easternNow, timezone))}</option>`
  ));
  if (elements.debugTimeCard) {
    timezoneOptions.push(`<option value="${DEV_MODE_TIME_OPTION_ID}">Dev mode: test time</option>`);
  }
  elements.displayTimezoneSelect.innerHTML = timezoneOptions.join("");
  elements.displayTimezoneSelect.value = selectedDisplayTimezoneId;
}

function changeDisplayTimezone() {
  if (elements.displayTimezoneSelect.value === DEV_MODE_TIME_OPTION_ID) {
    elements.displayTimezoneSelect.value = selectedDisplayTimezoneId;
    openDevModeModal();
    return;
  }

  const previousTimezone = getSelectedDisplayTimezone();
  const scheduleFormTimes = captureScheduleFormTimes(previousTimezone);
  const shiftAddFormTimes = captureShiftAddFormTimes(previousTimezone);
  const holidayFormTimes = captureHolidayFormTimes(previousTimezone);
  const delegationFormTimes = captureDelegationFormTimes(previousTimezone);
  selectedDisplayTimezoneId = getDisplayTimezone(elements.displayTimezoneSelect.value).id;
  localStorage.setItem(DISPLAY_TIMEZONE_STORAGE_KEY, selectedDisplayTimezoneId);
  if (elements.debugTimeCard && (devModeUnlocked || debugTimeOverride)) {
    clearDevModeState();
  }
  restoreScheduleFormTimes(scheduleFormTimes);
  restoreShiftAddFormTimes(shiftAddFormTimes);
  restoreHolidayFormTimes(holidayFormTimes);
  restoreDelegationFormTimes(delegationFormTimes);
  updateForwardTimeInputConstraints();
  renderTimezoneSensitiveAdminViews();
  renderClockAndAssignment();
}

function renderTimezoneSensitiveAdminViews() {
  renderAdminTimezoneLabels();
  renderShiftTemplateSelect();
  renderShifts();
  renderTimelineTools();
  renderDelegationSlots();
  renderDelegations();
  renderHolidays();
}

function renderAdminTimezoneLabels() {
  const abbreviation = getSelectedTimezoneAbbreviationForDate(getScheduleReferenceDate());
  const delegationAbbreviation = getSelectedTimezoneAbbreviationForDate(getDelegationReferenceDate());
  const holidayAbbreviation = getSelectedTimezoneAbbreviationForDate(getHolidayReferenceDate());
  const labelMap = [
    [elements.scheduleDaysLegend, `Schedule days (${abbreviation})`],
    [elements.scheduleStartLabel, `Start ${abbreviation}`],
    [elements.scheduleEndLabel, `End ${abbreviation}`],
    [elements.scheduleGraphTitle, `Schedule graph (${abbreviation})`],
    [elements.holidayStartLabel, `Start ${holidayAbbreviation}`],
    [elements.holidayEndLabel, `End ${holidayAbbreviation}`],
    [elements.delegationStartLabel, `Start ${delegationAbbreviation}`],
    [elements.delegationEndLabel, `End ${delegationAbbreviation}`],
    [elements.shiftStartLabel, `Start ${abbreviation}`],
    [elements.shiftEndLabel, `End ${abbreviation}`]
  ];

  labelMap.forEach(([element, text]) => {
    if (element) {
      element.textContent = text;
    }
  });
}

function renderTimezoneAdmin() {
  if (!elements.timezoneList) {
    return;
  }

  const selectedIds = data.displayTimezones.map((tz) => tz.id);
  const list = data.displayTimezones.map((tz) => `
    <div class="list-item timezone-list-item">
      <span class="item-title">${escapeHtml(tz.label || tz.id)}</span>
      <span class="meta timezone-id">${escapeHtml(tz.timeZone)}</span>
      <button class="secondary-button" type="button" data-timezone-id="${escapeHtml(tz.id)}" ${selectedIds.length <= 1 ? "disabled" : ""}>Remove</button>
    </div>
  `).join("");

  elements.timezoneList.innerHTML = list || "<p class=\"meta\">No timezones configured.</p>";

  elements.timezoneList.querySelectorAll("[data-timezone-id]").forEach((button) => {
    button.addEventListener("click", () => removeTimezone(button.dataset.timezoneId));
  });

  if (elements.addTimezoneSelect) {
    const usedIds = new Set(data.displayTimezones.map((tz) => tz.id));
    const options = AVAILABLE_TIMEZONES
      .filter((tz) => !usedIds.has(tz.id))
      .map((tz) => `<option value="${escapeHtml(tz.id)}">${escapeHtml(tz.label)} (${escapeHtml(tz.timeZone)})</option>`)
      .join("");
    elements.addTimezoneSelect.innerHTML = options || "<option value=\"\" disabled>All timezones added</option>";
  }
}

function addTimezone(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("timezones")) {
    return;
  }

  if (!elements.addTimezoneSelect || !elements.addTimezoneSelect.value) {
    return;
  }

  const selected = AVAILABLE_TIMEZONES.find((tz) => tz.id === elements.addTimezoneSelect.value);
  if (!selected) {
    return;
  }

  data.displayTimezones.push({ id: selected.id, timeZone: selected.timeZone, label: selected.label });
  completeAdminSave("Timezone saved.");
}

function removeTimezone(timezoneId) {
  if (!isAdminTabUnlocked("timezones")) {
    return;
  }

  if (data.displayTimezones.length <= 1) {
    return;
  }
  data.displayTimezones = data.displayTimezones.filter((tz) => tz.id !== timezoneId);
  completeAdminSave("Timezone removed.");
}

function initializeAdminTimeInputs() {
  if (adminTimeInputsInitialized) {
    return;
  }

  const date = getScheduleReferenceDate();
  if (elements.scheduleStartInput) {
    elements.scheduleStartInput.value = formatEasternTimeInputForDisplay(date, elements.scheduleStartInput.value || "09:00");
  }
  if (elements.scheduleEndInput) {
    elements.scheduleEndInput.value = formatEasternTimeInputForDisplay(date, elements.scheduleEndInput.value || "17:00");
  }
  if (elements.shiftStartInput) {
    elements.shiftStartInput.value = formatEasternTimeInputForDisplay(date, elements.shiftStartInput.value || "09:00");
  }
  if (elements.shiftEndInput) {
    elements.shiftEndInput.value = formatEasternTimeInputForDisplay(date, elements.shiftEndInput.value || "17:00");
  }
  if (elements.holidayStartInput) {
    elements.holidayStartInput.value = formatEasternTimeInputForDisplay(date, elements.holidayStartInput.value || "12:00");
  }
  if (elements.holidayEndInput) {
    elements.holidayEndInput.value = formatEasternTimeInputForDisplay(date, elements.holidayEndInput.value || "12:30");
  }
  const delegationDate = getDelegationReferenceDate();
  if (elements.delegationStartInput) {
    elements.delegationStartInput.value = formatEasternTimeInputForDisplay(delegationDate, elements.delegationStartInput.value || "09:00");
  }
  if (elements.delegationEndInput) {
    elements.delegationEndInput.value = formatEasternTimeInputForDisplay(delegationDate, elements.delegationEndInput.value || "09:30");
  }

  adminTimeInputsInitialized = true;
}

function captureScheduleFormTimes(timezone) {
  if (!elements.scheduleStartInput || !elements.scheduleEndInput) {
    return null;
  }

  const date = getScheduleReferenceDate();
  return {
    start: convertDisplayDateTimeToEastern(date, elements.scheduleStartInput.value, timezone).time,
    end: convertDisplayDateTimeToEastern(date, elements.scheduleEndInput.value, timezone).time
  };
}

function restoreScheduleFormTimes(times) {
  if (!times) {
    return;
  }

  const date = getScheduleReferenceDate();
  if (elements.scheduleStartInput) {
    elements.scheduleStartInput.value = formatEasternTimeInputForDisplay(date, times.start);
  }
  if (elements.scheduleEndInput) {
    elements.scheduleEndInput.value = formatEasternTimeInputForDisplay(date, times.end);
  }
}

function captureShiftAddFormTimes(timezone) {
  if (!elements.shiftStartInput || !elements.shiftEndInput) {
    return null;
  }

  const date = getScheduleReferenceDate();
  return {
    start: convertDisplayDateTimeToEastern(date, elements.shiftStartInput.value, timezone).time,
    end: convertDisplayDateTimeToEastern(date, elements.shiftEndInput.value, timezone).time
  };
}

function restoreShiftAddFormTimes(times) {
  if (!times) {
    return;
  }

  const date = getScheduleReferenceDate();
  if (elements.shiftStartInput) {
    elements.shiftStartInput.value = formatEasternTimeInputForDisplay(date, times.start);
  }
  if (elements.shiftEndInput) {
    elements.shiftEndInput.value = formatEasternTimeInputForDisplay(date, times.end);
  }
}

function captureHolidayFormTimes(timezone) {
  if (!elements.holidayStartInput || !elements.holidayEndInput) {
    return null;
  }

  const date = getHolidayReferenceDate();
  return {
    start: convertDisplayDateTimeToEastern(date, elements.holidayStartInput.value, timezone).time,
    end: convertDisplayDateTimeToEastern(date, elements.holidayEndInput.value, timezone).time
  };
}

function restoreHolidayFormTimes(times) {
  if (!times) {
    return;
  }

  const date = getHolidayReferenceDate();
  if (elements.holidayStartInput) {
    elements.holidayStartInput.value = formatEasternTimeInputForDisplay(date, times.start);
  }
  if (elements.holidayEndInput) {
    elements.holidayEndInput.value = formatEasternTimeInputForDisplay(date, times.end);
  }
}

function captureDelegationFormTimes(timezone) {
  if (!elements.delegationStartInput || !elements.delegationEndInput) {
    return null;
  }

  const date = getDelegationReferenceDate();
  return {
    start: convertDisplayDateTimeToEastern(date, elements.delegationStartInput.value, timezone).time,
    end: convertDisplayDateTimeToEastern(date, elements.delegationEndInput.value, timezone).time
  };
}

function restoreDelegationFormTimes(times) {
  if (!times) {
    return;
  }

  const date = getDelegationReferenceDate();
  if (elements.delegationStartInput) {
    elements.delegationStartInput.value = formatEasternTimeInputForDisplay(date, times.start);
  }
  if (elements.delegationEndInput) {
    elements.delegationEndInput.value = formatEasternTimeInputForDisplay(date, times.end);
  }
}

function maybePromptForDevMode() {
  if (!elements.debugTimeCard || devModeUnlocked) {
    return;
  }

  if (isDevModeRequested()) {
    window.setTimeout(openDevModeModal, 0);
  }
}

function isDevModeRequested() {
  const params = new URLSearchParams(window.location.search);
  return params.get("dev") === "1" || params.get("devMode") === "1";
}

function openDevModeModal() {
  if (!elements.devModeModal) {
    devModeUnlocked = true;
    renderDebugTimeControls(getEasternNow());
    return;
  }

  elements.devModeModal.classList.remove("hidden");
  elements.devModeModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.cancelDevModeButton?.focus(), 0);
}

function closeDevModeModal() {
  if (!elements.devModeModal) {
    return;
  }

  elements.devModeModal.classList.add("hidden");
  elements.devModeModal.setAttribute("aria-hidden", "true");
  renderDisplayTimezoneSelect(getEasternNow());
}

function confirmDevMode() {
  devModeUnlocked = true;
  closeDevModeModal();
  renderDebugTimeControls(getEasternNow());
  window.setTimeout(() => elements.debugDateInput?.focus(), 0);
}

function renderDebugTimeControls(easternNow) {
  if (!elements.debugDateInput || !elements.debugTimeInput) {
    return;
  }

  const showDevTools = devModeUnlocked;
  elements.debugTimeCard?.classList.toggle("hidden", !showDevTools);
  if (!showDevTools) {
    elements.debugTimeStatus?.classList.add("hidden");
    return;
  }

  if (debugTimeOverride) {
    elements.debugDateInput.value = debugTimeOverride.date;
    elements.debugTimeInput.value = debugTimeOverride.time;
  } else {
    elements.debugDateInput.value ||= easternNow.date;
    elements.debugTimeInput.value ||= easternNow.time;
  }

  if (elements.debugTimeStatus) {
    elements.debugTimeStatus.classList.toggle("hidden", !debugTimeOverride);
    elements.debugTimeStatus.textContent = debugTimeOverride
      ? `Testing ${easternNow.day}, ${easternNow.displayDate} at ${easternNow.time} ET`
      : "";
  }
}

function applyDebugTimeOverride() {
  if (!elements.debugDateInput || !elements.debugTimeInput) {
    return;
  }

  const date = elements.debugDateInput.value;
  const time = elements.debugTimeInput.value;
  if (!isValidDateInput(date) || !isValidTimeInput(time)) {
    showGenericAlert("Invalid time", "Pick a valid test date and ET time.");
    return;
  }

  debugTimeOverride = { date, time };
  devModeUnlocked = true;
  saveDebugTimeOverride();
  clearSelectedAssignee();
  refreshAfterEffectiveTimeChange();
}

function resetDebugTimeOverride() {
  clearDevModeState();
  clearSelectedAssignee();
  const liveNow = getLiveEasternNow();
  if (elements.debugDateInput) {
    elements.debugDateInput.value = liveNow.date;
  }
  if (elements.debugTimeInput) {
    elements.debugTimeInput.value = liveNow.time;
  }
  refreshAfterEffectiveTimeChange();
}

function clearDevModeState() {
  debugTimeOverride = null;
  devModeUnlocked = false;
  clearDebugTimeOverride();
  elements.debugTimeCard?.classList.add("hidden");
  elements.debugTimeStatus?.classList.add("hidden");
}

function refreshAfterEffectiveTimeChange() {
  renderTimezoneSensitiveAdminViews();
  renderClockAndAssignment();
}

function renderSystemSelect() {
  if (!elements.assignmentSystemSelect) {
    return;
  }

  const selectedValue = elements.assignmentSystemSelect.value;
  const systems = getScopedSystems(selectedAssignmentRegionId);
  elements.assignmentSystemSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select coverage";
  elements.assignmentSystemSelect.append(placeholder);

  systems.forEach((system) => {
    const option = document.createElement("option");
    option.value = system.id;
    option.textContent = system.name;
    elements.assignmentSystemSelect.append(option);
  });

  if (systems.some((system) => system.id === selectedValue)) {
    elements.assignmentSystemSelect.value = selectedValue;
  } else {
    elements.assignmentSystemSelect.value = "";
  }
}

function renderUserSelectors() {
  fillUserSelect(elements.scheduleUserSelect, false, "", selectedAdminRegionId);
  fillHolidayUserSelect();
}

function fillHolidayUserSelect() {
  if (!elements.holidayUserSelect) {
    return;
  }

  if (areRegionsEnabled() && !selectedAdminRegionId) {
    fillGlobalHolidayUserSelect(elements.holidayUserSelect);
    return;
  }

  const includeAllUsers = !areRegionsEnabled() || Boolean(selectedAdminRegionId);
  const allUsersLabel = selectedAdminRegionId
    ? `All users in ${getRegionScopeLabel(selectedAdminRegionId)}`
    : "All users";
  fillUserSelect(elements.holidayUserSelect, includeAllUsers, "", selectedAdminRegionId, allUsersLabel);
}

function fillGlobalHolidayUserSelect(select) {
  const selectedValue = select.value;
  select.innerHTML = "";

  data.regions.forEach((region) => {
    appendSelectOption(select, getRegionHolidaySelectValue(region.id), `All users in ${region.name}`);
  });
  getRankedUsersForRegionScope(GLOBAL_REGION_SCOPE_ID).forEach((user) => {
    appendSelectOption(select, user.id, user.name);
  });

  restoreSelectValue(select, selectedValue);
}

function fillUserSelect(select, includeAllUsers = false, placeholderLabel = "", regionId = GLOBAL_REGION_SCOPE_ID, allUsersLabel = "All users") {
  if (!select) {
    return;
  }

  const selectedValue = select.value;
  select.innerHTML = "";

  if (placeholderLabel) {
    appendSelectOption(select, "", placeholderLabel);
  }

  if (includeAllUsers) {
    appendSelectOption(select, GLOBAL_HOLIDAY_USER_ID, allUsersLabel);
  }

  getRankedUsersForRegionScope(regionId).forEach((user) => {
    appendSelectOption(select, user.id, user.name);
  });

  restoreSelectValue(select, selectedValue);
}

function appendSelectOption(select, value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  select.append(option);
}

function restoreSelectValue(select, selectedValue) {
  if ([...select.options].some((option) => option.value === selectedValue)) {
    select.value = selectedValue;
  }
}

function getRegionHolidaySelectValue(regionId) {
  return `${REGION_HOLIDAY_USER_PREFIX}${regionId}`;
}

function renderShiftTemplateSelect() {
  if (!elements.shiftTemplateSelect) {
    return;
  }

  const selectedValue = elements.shiftTemplateSelect.value || "regular";
  const date = getScheduleReferenceDate();
  const abbreviation = getSelectedTimezoneAbbreviationForDate(date);
  const quickShiftOptions = getQuickShiftTemplateOptions(date, abbreviation);
  elements.shiftTemplateSelect.innerHTML = "";

  quickShiftOptions.forEach((quickShiftOption) => {
    const option = document.createElement("option");
    option.value = quickShiftOption.value;
    option.textContent = quickShiftOption.label;
    elements.shiftTemplateSelect.append(option);
  });

  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "Custom time";
  elements.shiftTemplateSelect.append(customOption);

  const preferredValue = getPreferredQuickShiftValue(selectedValue, elements.scheduleUserSelect?.value, quickShiftOptions);
  elements.shiftTemplateSelect.value = quickShiftOptions.some((quickShiftOption) => quickShiftOption.value === preferredValue)
    ? preferredValue
    : "custom";
}

function getQuickShiftTemplateOptions(date, abbreviation) {
  if (hasRegionalScopes() && !selectedAdminRegionId) {
    return data.regions.flatMap((region) => getVisibleShiftTemplates(region.id).map((template) => ({
      regionId: region.id,
      templateId: template.id,
      value: getShiftTemplateSelectValue(template.id, region.id),
      label: `${region.name}: ${formatQuickShiftTemplateLabel(template, date, abbreviation)}`
    })));
  }

  return getVisibleShiftTemplates(selectedAdminRegionId).map((template) => ({
    regionId: normalizeRegionScopeId(selectedAdminRegionId),
    templateId: template.id,
    value: template.id,
    label: formatQuickShiftTemplateLabel(template, date, abbreviation)
  }));
}

function formatQuickShiftTemplateLabel(template, date, abbreviation) {
  return `${template.name} · ${formatEasternTimeInputForDisplay(date, template.start)}–${formatEasternTimeInputForDisplay(date, template.end)} ${abbreviation}`;
}

function getShiftTemplateSelectValue(templateId, regionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  return normalizedRegionId
    ? `${normalizedRegionId}${SHIFT_TEMPLATE_SCOPE_SEPARATOR}${templateId}`
    : templateId;
}

function parseShiftTemplateSelectValue(value, fallbackRegionId = selectedAdminRegionId) {
  const rawValue = String(value || "");
  const separatorIndex = rawValue.indexOf(SHIFT_TEMPLATE_SCOPE_SEPARATOR);
  if (separatorIndex > 0) {
    const regionId = normalizeRegionScopeId(rawValue.slice(0, separatorIndex));
    const templateId = rawValue.slice(separatorIndex + SHIFT_TEMPLATE_SCOPE_SEPARATOR.length);
    if (regionId && templateId) {
      return { regionId, templateId };
    }
  }

  return {
    regionId: normalizeRegionScopeId(fallbackRegionId),
    templateId: rawValue
  };
}

function getPreferredQuickShiftValue(currentValue, userId, quickShiftOptions) {
  if (quickShiftOptions.some((quickShiftOption) => quickShiftOption.value === currentValue)) {
    return currentValue;
  }

  const parsedValue = parseShiftTemplateSelectValue(currentValue);
  const templateId = parsedValue.templateId && parsedValue.templateId !== "custom"
    ? parsedValue.templateId
    : "regular";
  const userRegionIds = getUserQuickShiftRegionIds(userId);
  const sameRegionOption = userRegionIds
    .map((regionId) => quickShiftOptions.find((quickShiftOption) => (
      quickShiftOption.regionId === regionId
        && quickShiftOption.templateId === templateId
    )))
    .find(Boolean);
  if (sameRegionOption) {
    return sameRegionOption.value;
  }

  const sameTemplateOption = quickShiftOptions.find((quickShiftOption) => quickShiftOption.templateId === templateId);
  if (sameTemplateOption) {
    return sameTemplateOption.value;
  }

  return quickShiftOptions[0]?.value || "custom";
}

function getUserQuickShiftRegionIds(userId) {
  const validRegionIds = new Set(data.regions.map((region) => region.id));
  const user = data.users.find((item) => item.id === userId);
  return Array.isArray(user?.regionIds)
    ? user.regionIds.filter((regionId) => validRegionIds.has(regionId))
    : [];
}

function getDefaultQuickShiftTemplateForUser(userId) {
  const regionIds = hasRegionalScopes() && !selectedAdminRegionId
    ? getUserQuickShiftRegionIds(userId)
    : [selectedAdminRegionId];
  for (const regionId of regionIds) {
    const shiftTemplates = getVisibleShiftTemplates(regionId);
    const regularShift = shiftTemplates.find((template) => template.id === "regular");
    if (regularShift) {
      return regularShift;
    }
    if (shiftTemplates[0]) {
      return shiftTemplates[0];
    }
  }

  return null;
}

function getCurrentQuickShiftOptionsFromSelect() {
  if (!elements.shiftTemplateSelect) {
    return [];
  }

  return [...elements.shiftTemplateSelect.options]
    .filter((option) => option.value !== "custom")
    .map((option) => {
      const parsedValue = parseShiftTemplateSelectValue(option.value);
      return {
        regionId: parsedValue.regionId,
        templateId: parsedValue.templateId,
        value: option.value
      };
    });
}

function renderShifts() {
  if (!elements.shiftsList) {
    return;
  }

  const date = getScheduleReferenceDate();
  const abbreviation = getSelectedTimezoneAbbreviationForDate(date);
  const rows = shouldRenderGroupedRegionalShifts()
    ? data.regions.map((region) => renderShiftRegionGroup(region, date, abbreviation)).join("")
    : selectedAdminRegionId
      ? renderShiftRegionGroup(getRegionById(selectedAdminRegionId), date, abbreviation)
      : getVisibleShiftTemplates(selectedAdminRegionId)
          .map((template) => renderShiftTemplateRow(template, selectedAdminRegionId, date, abbreviation))
          .join("");

  elements.shiftsList.innerHTML = rows || emptyState("No shifts yet.");
  elements.shiftsList.querySelectorAll("[data-action='update-shift-region-coverage']").forEach((button) => {
    button.addEventListener("click", () => updateShiftRegionCoverage(button.dataset.regionId));
  });
  elements.shiftsList.querySelectorAll("[data-action='update-shift']").forEach((button) => {
    button.addEventListener("click", () => updateShiftTemplate(button.dataset.shiftId, button.dataset.regionId));
  });
  elements.shiftsList.querySelectorAll("[data-action='remove-shift']").forEach((button) => {
    button.addEventListener("click", () => removeShiftTemplate(button.dataset.shiftId, button.dataset.regionId));
  });
}

function shouldRenderGroupedRegionalShifts() {
  return hasRegionalScopes() && !selectedAdminRegionId;
}

function renderShiftRegionGroup(region, date, abbreviation) {
  if (!region) {
    return "";
  }

  const shiftTemplates = getVisibleShiftTemplates(region.id);
  const rows = shiftTemplates
    .map((template) => renderShiftTemplateRow(template, region.id, date, abbreviation))
    .join("");
  return `
    <section class="shift-region-group" data-shift-region-id="${escapeHtml(region.id)}">
      <div class="shift-region-heading">
        <div>
          <h4>${escapeHtml(region.name)}</h4>
          <span class="meta">${shiftTemplates.length} shift${shiftTemplates.length === 1 ? "" : "s"}</span>
        </div>
        ${renderShiftRegionBoundaryEditor(region, date, abbreviation)}
      </div>
      <div class="stack-list shift-region-list">
        ${rows || emptyState(`No shifts configured for ${region.name}.`)}
      </div>
    </section>
  `;
}

function renderShiftRegionBoundaryEditor(region, date, abbreviation) {
  const coverageWindow = getRegionCoverageWindow(region.id);
  return `
    <div class="shift-region-boundary-editor">
      <label class="field mini-field">
        <span>Start ${escapeHtml(abbreviation)}</span>
        <input type="time" value="${escapeHtml(formatEasternTimeInputForDisplay(date, coverageWindow.start))}" data-shift-region-coverage-start="${escapeHtml(region.id)}">
      </label>
      <label class="field mini-field">
        <span>End ${escapeHtml(abbreviation)}</span>
        <input type="time" value="${escapeHtml(formatEasternTimeInputForDisplay(date, coverageWindow.end))}" data-shift-region-coverage-end="${escapeHtml(region.id)}">
      </label>
      <button class="small-button" type="button" data-action="update-shift-region-coverage" data-region-id="${escapeHtml(region.id)}">Save</button>
    </div>
  `;
}

function getVisibleShiftTemplates(regionId = selectedAdminRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  return getScopedShiftTemplates(normalizedRegionId)
    .filter((template) => !isRegionCoverageShiftTemplate(template, normalizedRegionId));
}

function renderShiftTemplateRow(template, regionId, date, abbreviation) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  const displayStart = formatEasternTimeInputForDisplay(date, template.start);
  const displayEnd = formatEasternTimeInputForDisplay(date, template.end);
  const durationLabel = formatDurationMinutes(getTimeRangeDurationMinutes(template.start, template.end));
  return `
    <div class="shift-row" data-shift-id="${escapeHtml(template.id)}" data-region-id="${escapeHtml(normalizedRegionId)}">
      <div class="shift-row-fields">
        <label class="field shift-name-control">
          <span>Name</span>
          <input class="shift-name-field" type="text" value="${escapeHtml(template.name)}">
        </label>
        <label class="field shift-time-control">
          <span>Start ${escapeHtml(abbreviation)}</span>
          <input class="shift-start-field" type="time" value="${escapeHtml(displayStart)}">
        </label>
        <label class="field shift-time-control">
          <span>End ${escapeHtml(abbreviation)}</span>
          <input class="shift-end-field" type="time" value="${escapeHtml(displayEnd)}">
        </label>
        <div class="meta shift-duration-label">${escapeHtml(durationLabel)}</div>
      </div>
      <div class="item-actions shift-row-actions">
        <button class="small-button" type="button" data-action="update-shift" data-shift-id="${escapeHtml(template.id)}" data-region-id="${escapeHtml(normalizedRegionId)}">Save</button>
        <button class="remove-button" type="button" data-action="remove-shift" data-shift-id="${escapeHtml(template.id)}" data-region-id="${escapeHtml(normalizedRegionId)}">Remove</button>
      </div>
    </div>
  `;
}

function renderShiftAddForm() {
  if (!elements.addShiftForm || !elements.showAddShiftButton) {
    return;
  }

  const hideAddShift = shouldRenderGroupedRegionalShifts();
  if (hideAddShift) {
    shiftAddFormOpen = false;
  }
  elements.showAddShiftButton.classList.toggle("hidden", hideAddShift);
  elements.addShiftForm.classList.toggle("hidden", !shiftAddFormOpen);
  elements.showAddShiftButton.textContent = shiftAddFormOpen ? "Close" : "Add shift";
  elements.showAddShiftButton.setAttribute("aria-expanded", String(shiftAddFormOpen));
}

function toggleShiftAddForm() {
  if (!isAdminTabUnlocked("shifts")) {
    return;
  }
  if (shouldRenderGroupedRegionalShifts()) {
    showGenericAlert("Pick a region", "Choose a specific region before adding a shift preset.");
    return;
  }

  shiftAddFormOpen = !shiftAddFormOpen;
  renderShiftAddForm();
  renderAdminLocks();

  if (shiftAddFormOpen) {
    window.setTimeout(() => elements.shiftNameInput?.focus(), 0);
  }
}

function cancelShiftAddForm() {
  shiftAddFormOpen = false;
  resetShiftAddForm();
  renderShiftAddForm();
  renderAdminLocks();
}

function resetShiftAddForm() {
  if (!elements.addShiftForm) {
    return;
  }

  elements.addShiftForm.reset();
  const date = getScheduleReferenceDate();
  if (elements.shiftStartInput) {
    elements.shiftStartInput.value = formatEasternTimeInputForDisplay(date, "09:00");
  }
  if (elements.shiftEndInput) {
    elements.shiftEndInput.value = formatEasternTimeInputForDisplay(date, "17:00");
  }
  updateForwardTimeInputConstraints();
}

function saveShiftsTabChanges() {
  if (!isAdminTabUnlocked("shifts")) {
    return;
  }

  const drafts = collectVisibleShiftDrafts();
  if (!drafts) {
    return;
  }

  applyShiftDrafts(drafts);
  if (isShiftAddFormDirty()) {
    submitForm(elements.addShiftForm);
    return;
  }

  completeAdminSave("Shifts saved.", "shifts");
}

function isShiftAddFormDirty() {
  if (!shiftAddFormOpen || !elements.addShiftForm || elements.addShiftForm.classList.contains("hidden")) {
    return false;
  }

  const date = getScheduleReferenceDate();
  const defaultStart = formatEasternTimeInputForDisplay(date, "09:00");
  const defaultEnd = formatEasternTimeInputForDisplay(date, "17:00");
  return Boolean(elements.shiftNameInput?.value.trim())
    || (elements.shiftStartInput?.value && elements.shiftStartInput.value !== defaultStart)
    || (elements.shiftEndInput?.value && elements.shiftEndInput.value !== defaultEnd);
}

function collectVisibleShiftDrafts() {
  if (!elements.shiftsList) {
    return [];
  }

  const date = getScheduleReferenceDate();
  const drafts = [];
  const coverageEditors = [...elements.shiftsList.querySelectorAll(".shift-region-boundary-editor")];
  for (const editor of coverageEditors) {
    const startInput = editor.querySelector("[data-shift-region-coverage-start]");
    const endInput = editor.querySelector("[data-shift-region-coverage-end]");
    const regionId = startInput?.dataset.shiftRegionCoverageStart || endInput?.dataset.shiftRegionCoverageEnd;
    const displayStart = startInput?.value || "";
    const displayEnd = endInput?.value || "";
    if (!regionId) {
      continue;
    }
    if (!isValidRegionCoverageTimeRange(displayStart, displayEnd)) {
      showGenericAlert("Invalid region hours", "Region hours must be more than 0 minutes and no more than 14 hours. Overnight windows are allowed.");
      return null;
    }

    const convertedStart = convertDisplayDateTimeToEastern(date, displayStart);
    const convertedEnd = convertDisplayDateTimeToEastern(date, displayEnd);
    if (!isValidRegionCoverageTimeRange(convertedStart.time, convertedEnd.time)) {
      showGenericAlert("Invalid region hours", "Region hours must be more than 0 minutes and no more than 14 hours in Eastern Time.");
      return null;
    }

    drafts.push({
      type: "region-coverage",
      regionId,
      start: convertedStart.time,
      end: convertedEnd.time
    });
  }

  const shiftRows = [...elements.shiftsList.querySelectorAll(".shift-row")];
  for (const row of shiftRows) {
    const shiftId = row.dataset.shiftId;
    const regionId = normalizeRegionScopeId(row.dataset.regionId);
    const template = getScopedShiftTemplates(regionId).find((item) => item.id === shiftId);
    if (!template) {
      continue;
    }

    const name = row.querySelector(".shift-name-field")?.value.trim() || "";
    const displayStart = row.querySelector(".shift-start-field")?.value || "";
    const displayEnd = row.querySelector(".shift-end-field")?.value || "";
    const maxDurationMinutes = getShiftTemplateMaxDurationMinutes(template, regionId);
    const maxDurationLabel = formatDurationMinutes(maxDurationMinutes);
    if (!name || !isValidTimeRangeWithinDuration(displayStart, displayEnd, maxDurationMinutes)) {
      showGenericAlert("Invalid shift", `Shifts need a name and a duration of ${maxDurationLabel} or less. Overnight shifts are allowed.`);
      return null;
    }

    const convertedStart = convertDisplayDateTimeToEastern(date, displayStart);
    const convertedEnd = convertDisplayDateTimeToEastern(date, displayEnd);
    if (!isValidTimeRangeWithinDuration(convertedStart.time, convertedEnd.time, maxDurationMinutes)) {
      showGenericAlert("Invalid shift", `Shift times must be ${maxDurationLabel} or less in Eastern Time.`);
      return null;
    }

    drafts.push({
      type: "shift",
      template,
      name,
      start: convertedStart.time,
      end: convertedEnd.time
    });
  }

  return drafts;
}

function applyShiftDrafts(drafts) {
  drafts.forEach((draft) => {
    if (draft.type === "region-coverage") {
      const region = getRegionById(draft.regionId);
      if (region) {
        region.coverageStart = draft.start;
        region.coverageEnd = draft.end;
        syncRegionCoverageShift(region.id);
      }
      return;
    }

    draft.template.name = draft.name;
    draft.template.start = draft.start;
    draft.template.end = draft.end;
  });
}

function renderAssignmentRules() {
  if (!elements.assignmentPolicyDescriptions) {
    return;
  }

  const assignmentRules = getScopedAssignmentRules(selectedAdminRegionId);
  selectedAssignmentPolicyId = getAssignmentRulePreset(selectedAssignmentPolicyId || assignmentRules?.preset).id;
  renderAssignmentPolicyDescriptions();
}

function renderAssignmentPolicyDescriptions() {
  if (!elements.assignmentPolicyDescriptions) {
    return;
  }

  const selectedPreset = getAssignmentRulePreset(selectedAssignmentPolicyId || getScopedAssignmentRules(selectedAdminRegionId)?.preset);
  elements.assignmentPolicyDescriptions.innerHTML = ASSIGNMENT_RULE_PRESETS.map((preset) => {
    const selectedClass = preset.id === selectedPreset.id ? " selected" : "";
    const currentLabel = preset.id === selectedPreset.id ? "<span class=\"policy-current\">Selected</span>" : "";
    const chain = getAssignmentRuleChain(preset).map((rule, index) => `
      <li>
        <span>${index + 1}</span>
        <strong>${escapeHtml(ASSIGNMENT_RULE_LABELS[rule])}</strong>
      </li>
    `).join("");
    return `
      <button class="policy-description-card${selectedClass}" type="button" data-policy-id="${escapeHtml(preset.id)}">
        <span class="policy-description-title">
          <strong>${escapeHtml(preset.name)}</strong>
          ${currentLabel}
        </span>
        <ol class="policy-chain-list">${chain}</ol>
      </button>
    `;
  }).join("");
}

function selectAssignmentPolicyFromCard(event) {
  const card = event.target.closest("[data-policy-id]");
  if (!card || card.disabled) {
    return;
  }

  selectedAssignmentPolicyId = getAssignmentRulePreset(card.dataset.policyId).id;
  renderAssignmentPolicyDescriptions();
}

function renderAdminLocks() {
  document.querySelectorAll("[data-lockable-admin-tab]").forEach((panel) => {
    const tabName = panel.dataset.lockableAdminTab;
    const unlocked = unlockedAdminTabs.has(tabName);
    const saveButton = ADMIN_TABS_WITH_DRAFT_SAVE.has(tabName)
      ? `
        <button class="${unlocked ? "primary-button" : "secondary-button"} admin-save-button" type="button" data-lock-action="save" data-tab="${escapeHtml(tabName)}">
          Save changes
        </button>
      `
      : "";
    let lockBar = panel.querySelector(".admin-lock-bar");
    if (!lockBar) {
      lockBar = document.createElement("div");
      lockBar.className = "admin-lock-bar";
      panel.prepend(lockBar);
    }

    lockBar.innerHTML = `
      <div>
        <strong>${unlocked ? "Editing unlocked" : "Editing locked"}</strong>
      </div>
      <div class="admin-lock-actions">
        ${saveButton}
        <button class="${unlocked ? "secondary-button" : "primary-button"}" type="button" data-lock-action="${unlocked ? "lock" : "unlock"}" data-tab="${escapeHtml(tabName)}">
          ${unlocked ? "Lock" : "Unlock changes"}
        </button>
      </div>
    `;

    panel.classList.toggle("is-locked", !unlocked);
    panel.querySelectorAll("input, select, textarea, button").forEach((control) => {
      if (control.closest(".admin-lock-bar")) {
        control.disabled = false;
        return;
      }

      if (control.matches("[data-lock-exempt]")) {
        control.disabled = false;
        return;
      }

      if (control.closest(".region-management-disabled")) {
        control.disabled = true;
        return;
      }

      if (control.closest(".incident-config-disabled, .incident-settings-disabled")) {
        control.disabled = true;
        return;
      }

      control.disabled = !unlocked;
    });
  });
}

function handleAdminLockAction(event) {
  const button = event.target.closest("[data-lock-action]");
  if (!button) {
    return;
  }

  const tabName = button.dataset.tab;
  if (button.dataset.lockAction === "save") {
    if (saveAdminTabChanges(tabName)) {
      return;
    }
    completeDataSave("Saved.", { showToast: true });
    return;
  }

  if (button.dataset.lockAction === "unlock") {
    if (tabName === "data" && !unlockedAdminTabs.has("data")) {
      openBackupUnlockModal();
      return;
    }
    unlockedAdminTabs.add(tabName);
  } else {
    unlockedAdminTabs.delete(tabName);
  }

  renderAdminLocks();
}

function saveAdminTabChanges(tabName) {
  if (tabName === "shifts") {
    saveShiftsTabChanges();
    return true;
  }

  if (tabName === "rules") {
    return submitForm(elements.assignmentRulesForm);
  }

  if (tabName === "incidents") {
    return submitForm(elements.incidentConfigForm);
  }

  return false;
}

function submitForm(form) {
  if (!form) {
    return false;
  }

  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
  } else {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }
  return true;
}

function openBackupUnlockModal() {
  if (!elements.backupUnlockModal) {
    unlockedAdminTabs.add("data");
    renderAdminLocks();
    return;
  }

  elements.backupUnlockModal.classList.remove("hidden");
  elements.backupUnlockModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.cancelBackupUnlockButton?.focus(), 0);
}

function closeBackupUnlockModal() {
  if (!elements.backupUnlockModal) {
    return;
  }

  elements.backupUnlockModal.classList.add("hidden");
  elements.backupUnlockModal.setAttribute("aria-hidden", "true");
}

function confirmBackupUnlock() {
  unlockedAdminTabs.add("data");
  closeBackupUnlockModal();
  renderAdminLocks();
}

function isAdminTabUnlocked(tabName) {
  return !document.querySelector(`[data-lockable-admin-tab="${cssEscape(tabName)}"]`) || unlockedAdminTabs.has(tabName);
}

function completeAdminSave(message = "Saved.", tabName = null) {
  completeDataSave(message, { showToast: true });
}

function completeDataSave(message = "Saved.", options = {}) {
  normalizeData();
  const snapshot = cloneData(data);
  const saveGeneration = sharedStateGeneration;

  const pendingSave = sharedStateSaveQueue
    .catch(() => {})
    .then(async () => {
      if (saveGeneration !== sharedStateGeneration) {
        return { status: "skipped" };
      }

      return persistDataSnapshot(snapshot);
    })
    .then((result) => {
      if (result.status !== "saved") {
        if (typeof options.onNotSaved === "function") {
          options.onNotSaved(result);
        }
        return;
      }

      applyPersistedData(result.data, result.revision);
      render();
      if (options.showToast !== false) {
        showSaveToast(message);
      }
      if (typeof options.onSaved === "function") {
        options.onSaved(result.data, result.revision);
      }
    })
    .catch((error) => {
      handleSharedStateSaveError(error);
      if (typeof options.onNotSaved === "function") {
        options.onNotSaved({ status: "error", error });
      }
    });

  sharedStateSaveQueue = pendingSave.catch(() => {});
}

function showSaveToast(message) {
  if (!elements.saveToast || !elements.saveToastText) {
    return;
  }

  elements.saveToastText.textContent = message;
  elements.saveToast.setAttribute("aria-hidden", "false");
  elements.saveToast.classList.add("show");
  window.clearTimeout(saveToastTimer);
  saveToastTimer = window.setTimeout(() => {
    elements.saveToast.classList.remove("show");
    elements.saveToast.setAttribute("aria-hidden", "true");
  }, 2600);
}

function getAssignmentRulePreset(presetId) {
  const defaultPreset = ASSIGNMENT_RULE_PRESETS.find((preset) => preset.id === DEFAULT_ASSIGNMENT_RULES.preset) || ASSIGNMENT_RULE_PRESETS[0];
  return ASSIGNMENT_RULE_PRESETS.find((preset) => preset.id === presetId) || defaultPreset;
}

function getAssignmentRuleChain(preset) {
  return ALWAYS_ASSIGNMENT_RULES.concat(preset.rules);
}

function isShiftOrderPolicy(regionId = selectedAssignmentRegionId) {
  return getAssignmentRulePreset(getScopedAssignmentRules(regionId)?.preset).id === SHIFT_ORDER_PRESET_ID;
}

function getAssignmentQueueSystemId() {
  return isShiftOrderPolicy(selectedAssignmentRegionId)
    ? SHIFT_QUEUE_SYSTEM_ID
    : elements.assignmentSystemSelect?.value || "";
}

function renderSuggestion(queueState) {
  if (!elements.markAssignedButton) {
    return;
  }

  if (!queueState.system) {
    elements.markAssignedButton.disabled = true;
    return;
  }

  const selectedRow = queueState.rows.find((row) => row.user.id === selectedAssigneeId);
  if (!selectedRow) {
    elements.markAssignedButton.disabled = true;
    return;
  }

  elements.markAssignedButton.disabled = !selectedRow.selectable
    || (selectedRow.isOther && !getSelectedOtherRosterRow(queueState));
}

function renderQueue(queueState) {
  if (!elements.queueList) {
    return;
  }

  if (!queueState.system) {
    elements.queueList.innerHTML = "";
    renderOtherAssigneePicker(queueState);
    return;
  }

  const rows = queueState.rows.map((row, index) => {
    const selectedClass = row.user.id === selectedAssigneeId ? " selected" : "";
    const otherClass = row.isOther ? " other" : "";
    const disabled = row.selectable ? "" : "disabled";
    const selectableOtherCount = row.isOther ? getSelectableOtherRows(queueState).length : 0;
    const metricText = row.isOther
      ? `${selectableOtherCount} roster option${selectableOtherCount === 1 ? "" : "s"}`
      : `${row.dailyTickets} today · ${row.consecutiveTickets} in a row`;
    const regionTags = row.isOther ? "" : renderUserRegionTags(row.user, "queue-region-list");
    const fallbackDisclaimer = !row.isOther && row.user.id === selectedAssigneeId && !row.isCoverageMember
      ? "<span class=\"queue-disclaimer\">Fallback pick — not an SME for this coverage.</span>"
      : "";
    const nonSmeInlineLabel = row.isOther ? "<span class=\"queue-inline-note\">Non-SME fallback</span>" : "";
    return `
      <div class="queue-step queue-rank-${index % 5} ${row.status}${selectedClass}${otherClass}">
        <div class="queue-stop" aria-hidden="true">
          <span>${index + 1}</span>
        </div>
        <button class="queue-card ${row.status}${selectedClass}${otherClass}" type="button" data-user-id="${escapeHtml(row.user.id)}" ${disabled}>
          <span class="queue-card-header">
            <span class="queue-position">${getOrdinalLabel(index + 1)} in queue</span>
            ${renderQueueStatusBadge(row, { showWaitTime: true })}
          </span>
          <span class="queue-person-row">
            <span class="queue-identity">
              <span class="queue-name">${escapeHtml(row.user.name)}${nonSmeInlineLabel}</span>
              ${regionTags}
            </span>
          </span>
          <span class="queue-message">${escapeHtml(getQueueCardMessage(row))}</span>
          <span class="queue-card-footer">
            <span class="queue-metrics">${escapeHtml(metricText)}</span>
          </span>
          ${fallbackDisclaimer}
        </button>
      </div>
    `;
  }).join("");

  elements.queueList.innerHTML = rows || emptyState("No SMEs are assigned to this system/app yet.");
  elements.queueList.querySelectorAll(".queue-card").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAssigneeId = button.dataset.userId;
      if (selectedAssigneeId !== OTHER_QUEUE_USER_ID) {
        selectedOtherAssigneeId = null;
      }
      renderClockAndAssignment();
    });
  });
  renderOtherAssigneePicker(queueState);
}

function renderOtherAssigneePicker(queueState) {
  if (!elements.otherAssigneePicker || !elements.otherAssigneeSelect) {
    return;
  }

  const shouldShow = selectedAssigneeId === OTHER_QUEUE_USER_ID && Array.isArray(queueState.otherRows);
  elements.otherAssigneePicker.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) {
    elements.otherAssigneeSelect.innerHTML = "";
    return;
  }

  const options = queueState.otherRows.map((row) => {
    const disabled = row.selectable ? "" : "disabled";
    return `<option value="${escapeHtml(row.user.id)}" ${disabled}>${escapeHtml(row.user.name)} · ${escapeHtml(formatOtherRosterAvailability(row))}</option>`;
  }).join("");
  elements.otherAssigneeSelect.innerHTML = options || "<option value=\"\" disabled>No roster users</option>";
  elements.otherAssigneeSelect.value = selectedOtherAssigneeId || "";
}

function formatOtherRosterAvailability(row) {
  return getQueueCardMessage(row)
    .replace(/\. You can pick them anyway\.$/, "")
    .replace(/\.$/, "");
}

function renderQueueDashboard(easternNow) {
  if (!elements.queueDashboardPanel || !elements.queueDashboardList) {
    return;
  }

  const shiftOrderMode = isShiftOrderPolicy(selectedAssignmentRegionId);
  if (shiftOrderMode) {
    showQueueDashboard = false;
  }

  elements.activityPanelSection?.classList.toggle("has-open-panel", showQueueDashboard || showRecentAssignments);
  elements.queueDashboardPanel.classList.toggle("hidden", !showQueueDashboard);

  if (elements.toggleQueueDashboardButton) {
    elements.toggleQueueDashboardButton.classList.toggle("hidden", shiftOrderMode);
    elements.toggleQueueDashboardButton.textContent = showQueueDashboard ? "Hide all queues" : "Show all queues";
  }

  if (!showQueueDashboard) {
    elements.queueDashboardList.innerHTML = "";
    return;
  }

  const cards = getScopedSystems(selectedAssignmentRegionId).map((system) => {
    const queueState = getQueueState(system.id, easternNow, selectedAssignmentRegionId);
    const coverageTicketCount = getDailyCoverageAssignmentCount(system, queueState.effectiveNow.date, selectedAssignmentRegionId);
    const rows = queueState.rows.filter((row) => !row.isOther).map((row, index) => {
      const nextClass = index === 0 ? " next" : "";
      const metricText = `${row.dailyTickets} today · ${row.consecutiveTickets} in a row`;
      const regionTags = renderUserRegionTags(row.user, "dashboard-region-list");
      return `
        <li class="dashboard-queue-row ${row.status}${nextClass}">
          <span class="dashboard-queue-number">${index + 1}</span>
          <span class="dashboard-queue-person">
            <strong>${escapeHtml(row.user.name)}</strong>
            <small>${escapeHtml(metricText)}</small>
            ${regionTags}
          </span>
          ${renderQueueStatusBadge(row, { showWaitTime: true })}
        </li>
      `;
    }).join("");

    return `
      <article class="queue-dashboard-row-card">
        <div class="dashboard-system-label">
          <h4>${escapeHtml(system.name)}</h4>
          <span class="dashboard-coverage-meta">
            <strong>${coverageTicketCount} ticket${coverageTicketCount === 1 ? "" : "s"} today</strong>
          </span>
        </div>
        <ol class="dashboard-queue-list">
          ${rows || "<li class=\"empty-state\">No SMEs assigned.</li>"}
        </ol>
        <button class="small-button dashboard-open-button" type="button" data-dashboard-system-id="${escapeHtml(system.id)}">Open</button>
      </article>
    `;
  }).join("");

  elements.queueDashboardList.innerHTML = cards || emptyState("No systems/apps yet.");
  elements.queueDashboardList.querySelectorAll("[data-dashboard-system-id]").forEach((button) => {
    button.addEventListener("click", () => openDashboardSystem(button.dataset.dashboardSystemId));
  });
}

function renderQueueStatusBadge(row, options = {}) {
  const badge = options.showWaitTime && row.status === "later"
    ? `Available in ${formatWaitDuration(row.waitMinutes)}`
    : row.badge;

  return row.status === "available"
    ? ""
    : `<span class="status-pill ${row.status}">${escapeHtml(badge)}</span>`;
}

function renderUserRegionTags(user, className = "region-tag-list") {
  const regions = getUserRegions(user);
  if (regions.length === 0) {
    return "";
  }

  return `
    <span class="${className}">
      ${regions.map((region) => `<span>${escapeHtml(region.name)}</span>`).join("")}
    </span>
  `;
}

function getUserRegions(user) {
  if (!areRegionsEnabled()) {
    return [];
  }

  const regionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
  return regionIds
    .map((regionId) => data.regions.find((region) => region.id === regionId))
    .filter(Boolean);
}

function areRegionsEnabled() {
  return data.regionsEnabled !== false;
}

function getQueueCardMessage(row) {
  if (row.status === "later") {
    const availableIn = formatWaitDuration(row.waitMinutes);
    const availableAt = formatEasternTimeForDisplay(row.effectiveDate, minutesToTime(row.availabilityStart));
    return `Available in ${availableIn} at ${availableAt}. You can pick them anyway.`;
  }

  return row.message.replace(/;\s*/g, ". ");
}

function renderDailyRankings(date) {
  if (!elements.dailyRankingsList) {
    return;
  }

  const rankings = getDailyTicketRankings(date);
  const rows = rankings.map((entry, index) => `
    <div class="ranking-item">
      <span class="rank-number">#${index + 1}</span>
      <span class="rank-name">${escapeHtml(entry.user.name)}</span>
      <span class="ranking-count">${entry.count} ticket${entry.count === 1 ? "" : "s"}</span>
    </div>
  `).join("");

  elements.dailyRankingsList.innerHTML = rows || emptyState("No tickets assigned today yet.");
}

function renderAssignmentLog() {
  if (!elements.assignmentLog) {
    return;
  }

  elements.activityPanelSection?.classList.toggle("has-open-panel", showQueueDashboard || showRecentAssignments);

  if (elements.recentAssignmentsPanel) {
    elements.recentAssignmentsPanel.classList.toggle("hidden", !showRecentAssignments);
  }

  if (elements.toggleRecentAssignmentsButton) {
    elements.toggleRecentAssignmentsButton.textContent = showRecentAssignments ? "Hide recent tickets" : "Show recent tickets";
  }

  if (!showRecentAssignments) {
    elements.assignmentLog.innerHTML = "";
    return;
  }

  const rows = getRecentAssignments().map((entry) => {
    return renderAssignmentListItem(entry, { allowActions: true });
  }).join("");

  elements.assignmentLog.innerHTML = rows || emptyState("No assignments in the last 24 hours.");
  bindAssignmentLogActions();
  bindIncidentActionButtons(elements.assignmentLog);
}

function buildIncidentHandoffUrl(entry) {
  const config = getIncidentConfig();
  const redirectUrl = config.redirect?.url || INCIDENT_CREATE_URL;
  try {
    new URL(redirectUrl);
  } catch {
    return INCIDENT_CREATE_URL;
  }
  return redirectUrl;
}

function renderIncidentAction(entry) {
  const config = getIncidentConfig();
  if (!config.enabled) {
    return "";
  }

  if (config.mode === "redirect") {
    const incidentUrl = buildIncidentHandoffUrl(entry);
    return `<a class="primary-button incident-action-link" href="${escapeHtml(incidentUrl)}" target="_blank" rel="noopener noreferrer">Open incident</a>`;
  }

  if (entry.serviceNowIncident?.payload) {
    return `
      <span class="assignment-done-badge incident-mode-badge">ServiceNow details ready</span>
      <button class="small-button incident-detail-button" type="button" data-action="open-servicenow-incident-form" data-assignment-id="${escapeHtml(entry.id)}">Edit incident</button>
    `;
  }

  return `<button class="primary-button incident-action-link" type="button" data-action="open-servicenow-incident-form" data-assignment-id="${escapeHtml(entry.id)}">Add incident details</button>`;
}

function bindIncidentActionButtons(container) {
  container?.querySelectorAll("[data-action='open-servicenow-incident-form']").forEach((button) => {
    button.addEventListener("click", () => openServiceNowIncidentModal(button.dataset.assignmentId));
  });
}

function openServiceNowIncidentModal(assignmentId) {
  const entry = data.assignmentLog.find((assignment) => assignment.id === assignmentId);
  if (!entry || !elements.serviceNowIncidentModal || !elements.serviceNowIncidentForm) {
    return;
  }

  pendingServiceNowAssignmentId = entry.id;
  const existingIncident = entry.serviceNowIncident || {};
  const existingPayload = existingIncident.payload || {};
  const description = existingIncident.description
    || existingIncident.serviceNowIncidentDescription
    || existingPayload.description
    || existingPayload.short_description
    || "";
  const configItem = existingIncident.configItem
    || existingIncident.configurationItem
    || existingPayload.cmdb_ci
    || getServiceNowConfigItemForAssignment(entry)
    || "";
  const priority = normalizeServiceNowPriority(existingIncident.priority || existingPayload.priority);

  if (elements.serviceNowDescriptionInput) {
    elements.serviceNowDescriptionInput.value = description;
    elements.serviceNowDescriptionInput.placeholder = getServiceNowDescriptionPlaceholder(entry);
  }
  if (elements.serviceNowConfigItemInput) {
    elements.serviceNowConfigItemInput.value = configItem;
  }
  if (elements.serviceNowPrioritySelect) {
    elements.serviceNowPrioritySelect.value = priority;
  }

  elements.serviceNowIncidentModal.classList.remove("hidden");
  elements.serviceNowIncidentModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.serviceNowDescriptionInput?.focus(), 0);
}

function closeServiceNowIncidentModal() {
  pendingServiceNowAssignmentId = null;
  elements.serviceNowIncidentModal?.classList.add("hidden");
  elements.serviceNowIncidentModal?.setAttribute("aria-hidden", "true");
}

function saveServiceNowIncidentDetails(event) {
  event.preventDefault();
  const entry = data.assignmentLog.find((assignment) => assignment.id === pendingServiceNowAssignmentId);
  if (!entry) {
    closeServiceNowIncidentModal();
    return;
  }

  const details = getServiceNowIncidentFormDetails();
  if (!details.description) {
    showGenericAlert("Missing incident description", "Add a description before saving the ServiceNow incident details.");
    return;
  }
  if (!details.configItem) {
    showGenericAlert("Missing coverage config item", "Add a ServiceNow config item for this coverage in Admin → Systems / apps before saving incident details.");
    return;
  }

  const hiddenFields = getServiceNowHiddenPayloadFields();
  entry.serviceNowIncident = {
    mode: "servicenow",
    status: "ready",
    preparedAt: new Date().toISOString(),
    description: details.description,
    serviceNowIncidentDescription: details.description,
    configItem: details.configItem,
    priority: details.priority,
    severity: details.priority,
    hiddenFields,
    payload: buildServiceNowIncidentPayload(details, hiddenFields)
  };

  closeServiceNowIncidentModal();
  lastAssignmentId = entry.id;
  completeDataSave("ServiceNow incident details saved.", { showToast: true });
}

function getServiceNowIncidentFormDetails() {
  const priority = normalizeServiceNowPriority(elements.serviceNowPrioritySelect?.value);
  return {
    description: String(elements.serviceNowDescriptionInput?.value || "").trim(),
    configItem: String(elements.serviceNowConfigItemInput?.value || "").trim(),
    priority
  };
}

function getServiceNowDescriptionPlaceholder(entry) {
  return `Give a description to the incident that will be assigned to ${entry.userName || "the assignee"} for ${entry.systemName || "the selected coverage"}.`;
}

function getServiceNowConfigItemForAssignment(entry) {
  const assignmentConfigItem = String(entry?.serviceNowConfigItem || "").trim();
  if (assignmentConfigItem) {
    return assignmentConfigItem;
  }

  const systemConfigItem = String(getAssignmentSystemById(entry?.systemId, entry?.regionId)?.serviceNowConfigItem || "").trim();
  return systemConfigItem;
}

function buildServiceNowIncidentPayload(details = {}, hiddenFields = getServiceNowHiddenPayloadFields()) {
  const description = String(details.description || "").trim();
  const configItem = String(details.configItem || details.configurationItem || "").trim();
  const priority = normalizeServiceNowPriority(details.priority);
  return {
    ...normalizeServiceNowHiddenPayloadFields(hiddenFields),
    short_description: description,
    description,
    cmdb_ci: configItem,
    priority,
    severity: priority
  };
}

function normalizeServiceNowHiddenPayloadFields(fields) {
  if (Array.isArray(fields)) {
    return getServiceNowHiddenPayloadFields(fields);
  }

  return Object.entries(fields && typeof fields === "object" ? fields : {})
    .filter(([name, value]) => (
      SERVICENOW_FIELD_NAME_PATTERN.test(name)
        && !SERVICENOW_FORM_CONTROLLED_FIELDS.includes(name)
        && String(value ?? "").trim()
    ))
    .reduce((payloadFields, [name, value]) => {
      payloadFields[name] = String(value).trim();
      return payloadFields;
    }, {});
}

function normalizeServiceNowPriority(priority) {
  const value = String(priority || "").replace(/^p/i, "");
  return SERVICENOW_PRIORITIES.includes(value) ? value : DEFAULT_SERVICENOW_PRIORITY;
}

function renderAssignmentConfirmation(hasSelectedSystem) {
  if (!elements.assignmentConfirmation) {
    return;
  }

  const entry = lastAssignmentId
    ? data.assignmentLog.find((assignment) => assignment.id === lastAssignmentId)
    : null;

  if (!hasSelectedSystem || !entry) {
    elements.assignmentConfirmation.classList.add("hidden");
    elements.assignmentConfirmation.innerHTML = "";
    return;
  }

  elements.assignmentConfirmation.classList.remove("hidden");
  elements.assignmentConfirmation.innerHTML = renderAssignmentConfirmationItem(entry);
  bindIncidentActionButtons(elements.assignmentConfirmation);
}

function renderAssignmentConfirmationItem(entry) {
  const devModeText = formatAssignmentDevModeText(entry);
  const regionText = formatAssignmentRegionText(entry);
  const incidentAction = renderIncidentAction(entry);
  return `
    <div class="list-item assignment-log-item assignment-confirmation-item">
      <div>
        <div class="item-title">${escapeHtml(entry.userName || "Removed user")}</div>
        <div class="meta">${escapeHtml(entry.systemName || "Removed system")}${escapeHtml(regionText)}${escapeHtml(devModeText)}</div>
      </div>
      <div class="assignment-confirmation-actions">
        <span class="assignment-done-badge">Assigned</span>
        ${incidentAction}
      </div>
    </div>
  `;
}

function renderAssignmentListItem(entry, options = {}) {
  if (options.allowActions && editingAssignmentId === entry.id) {
    return renderAssignmentEditor(entry);
  }

  const assignedAt = formatAssignmentTimestamp(entry);
  const amendedAt = formatAmendedTimestamp(entry);
  const amendedText = amendedAt ? ` · Amended ${amendedAt}` : "";
  const devModeText = formatAssignmentDevModeText(entry);
  const regionText = formatAssignmentRegionText(entry);
  const doneBadge = options.showDoneBadge
    ? "<span class=\"assignment-done-badge\">Assigned</span>"
    : "";
  const incidentAction = options.allowActions ? renderIncidentAction(entry) : "";
  const actions = options.allowActions
    ? `
      <div class="item-actions">
        ${incidentAction}
        <button class="small-button" type="button" data-action="edit-assignment" data-assignment-id="${escapeHtml(entry.id)}">Edit</button>
        <button class="remove-button" type="button" data-action="delete-assignment" data-assignment-id="${escapeHtml(entry.id)}">Delete</button>
      </div>
    `
    : "";
  return `
    <div class="list-item assignment-log-item">
      <div>
        <div class="item-title">${escapeHtml(entry.userName || "Removed user")}</div>
        <div class="meta">${escapeHtml(entry.systemName || "Removed system")}${escapeHtml(regionText)} · ${escapeHtml(assignedAt)}${escapeHtml(devModeText)}${escapeHtml(amendedText)}</div>
      </div>
      ${doneBadge}
      ${actions}
    </div>
  `;
}

function formatAssignmentDevModeText(entry) {
  return entry?.devMode ? " · Dev mode test time" : "";
}

function formatAssignmentRegionText(entry) {
  return entry?.regionId ? ` · ${entry.regionName || getRegionScopeLabel(entry.regionId)}` : "";
}

function renderAssignmentEditor(entry) {
  const entryRegionId = normalizeRegionScopeId(entry.regionId);
  const shiftQueueOption = (isShiftOrderPolicy(entryRegionId) || entry.systemId === SHIFT_QUEUE_SYSTEM_ID)
    ? `<option value="${SHIFT_QUEUE_SYSTEM_ID}" ${entry.systemId === SHIFT_QUEUE_SYSTEM_ID ? "selected" : ""}>${SHIFT_QUEUE_SYSTEM_NAME}</option>`
    : "";
  const systemOptions = shiftQueueOption + getScopedSystems(entryRegionId).map((system) => `
    <option value="${escapeHtml(system.id)}" ${system.id === entry.systemId ? "selected" : ""}>${escapeHtml(system.name)}</option>
  `).join("");
  const userOptions = getRankedUsersForRegionScope(entryRegionId).map((user) => `
    <option value="${escapeHtml(user.id)}" ${user.id === entry.userId ? "selected" : ""}>${escapeHtml(user.name)}</option>
  `).join("");

  return `
    <form class="list-item assignment-log-item assignment-edit-form" data-assignment-edit-id="${escapeHtml(entry.id)}">
      <div class="assignment-edit-grid">
        <label class="field">
          <span>Queue</span>
          <select data-edit-field="systemId" required>${systemOptions}</select>
        </label>
        <label class="field">
          <span>User</span>
          <select data-edit-field="userId" required>${userOptions}</select>
        </label>
      </div>
      <div class="assignment-edit-meta">Original time: ${escapeHtml(formatAssignmentTimestamp(entry))}${escapeHtml(formatAssignmentDevModeText(entry))}</div>
      <div class="item-actions assignment-edit-actions">
        <button class="primary-button" type="submit">Save</button>
        <button class="secondary-button" type="button" data-action="cancel-assignment-edit">Cancel</button>
        <button class="remove-button" type="button" data-action="delete-assignment" data-assignment-id="${escapeHtml(entry.id)}">Delete</button>
      </div>
    </form>
  `;
}

function bindAssignmentLogActions() {
  if (!elements.assignmentLog) {
    return;
  }

  elements.assignmentLog.querySelectorAll("[data-action='edit-assignment']").forEach((button) => {
    button.addEventListener("click", () => {
      editingAssignmentId = button.dataset.assignmentId;
      renderAssignmentLog();
    });
  });

  elements.assignmentLog.querySelectorAll("[data-action='cancel-assignment-edit']").forEach((button) => {
    button.addEventListener("click", () => {
      editingAssignmentId = null;
      renderAssignmentLog();
    });
  });

  elements.assignmentLog.querySelectorAll("[data-action='delete-assignment']").forEach((button) => {
    button.addEventListener("click", () => deleteAssignment(button.dataset.assignmentId));
  });

  elements.assignmentLog.querySelectorAll("[data-assignment-edit-id]").forEach((form) => {
    form.addEventListener("submit", saveAmendedAssignment);
  });
}

function formatAssignmentTimestamp(entry) {
  return entry.easternDate && entry.easternTime
    ? formatEasternDateTimeForDisplay(entry.easternDate, entry.easternTime)
    : formatInstantDateTimeForDisplay(new Date(entry.assignedAt));
}

function formatAmendedTimestamp(entry) {
  if (!entry.amendedAt) {
    return "";
  }

  return formatInstantDateTimeForDisplay(new Date(entry.amendedAt));
}

function toggleRecentAssignments() {
  showRecentAssignments = !showRecentAssignments;
  renderAssignmentLog();
}

function saveAmendedAssignment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const entry = data.assignmentLog.find((assignment) => assignment.id === form.dataset.assignmentEditId);
  if (!entry) {
    return;
  }

  const entryRegionId = normalizeRegionScopeId(entry.regionId);
  const system = getAssignmentSystemById(getAssignmentEditValue(form, "systemId"), entryRegionId);
  const user = getUsersForRegionScope(entryRegionId).find((item) => item.id === getAssignmentEditValue(form, "userId"));
  if (!system || !user) {
    showGenericAlert("Invalid selection", "Choose a valid queue and user.");
    return;
  }

  entry.systemId = system.id;
  entry.systemName = system.name;
  entry.regionId = entryRegionId;
  entry.regionName = getRegionScopeLabel(entryRegionId);
  entry.userId = user.id;
  entry.userName = user.name;
  entry.amendedAt = new Date().toISOString();
  editingAssignmentId = null;
  lastAssignmentId = entry.id;
  completeDataSave("Assignment updated.", { showToast: true });
}

function getAssignmentEditValue(form, fieldName) {
  return form.querySelector(`[data-edit-field="${fieldName}"]`)?.value || "";
}

function deleteAssignment(assignmentId) {
  const entry = data.assignmentLog.find((assignment) => assignment.id === assignmentId);
  if (!entry) {
    return;
  }

  showGenericConfirm("Delete assignment", "Delete this ticket assignment?", () => {
    data.assignmentLog = data.assignmentLog.filter((assignment) => assignment.id !== assignmentId);
    if (lastAssignmentId === assignmentId) {
      lastAssignmentId = null;
    }
    editingAssignmentId = null;
    completeDataSave("Assignment deleted.", { showToast: true });
  });
}

function toggleQueueDashboard() {
  showQueueDashboard = !showQueueDashboard;
  renderClockAndAssignment();
}

function openDashboardSystem(systemId) {
  if (!elements.assignmentSystemSelect) {
    return;
  }

  elements.assignmentSystemSelect.value = systemId;
  clearSelectedAssignee();
  lastAssignmentId = null;
  renderClockAndAssignment();
  elements.queueSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderUsers() {
  if (!elements.usersList) {
    return;
  }

  renderUsersScopeMeta();
  elements.usersList.innerHTML = selectedAdminRegionId
    ? renderRegionTeamList(selectedAdminRegionId)
    : renderGlobalTeamBreakdown();
  elements.usersList.querySelectorAll("[data-action='move-team-user']").forEach((button) => {
    button.addEventListener("click", () => moveTeamUser(button.dataset.userId, Number(button.dataset.direction), button.dataset.regionId || GLOBAL_REGION_SCOPE_ID));
  });
  elements.usersList.querySelectorAll("[data-action='remove-user']").forEach((button) => {
    button.addEventListener("click", () => removeUser(button.dataset.userId));
  });
  elements.usersList.querySelectorAll("[data-action='toggle-user-region']").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleUserRegion(checkbox.dataset.userId, checkbox.dataset.regionId, checkbox.checked));
  });
}

function renderUsersScopeMeta() {
  if (!elements.usersScopeMeta) {
    return;
  }

  if (!areRegionsEnabled() || data.regions.length === 0) {
    elements.usersScopeMeta.textContent = "Showing the global team list.";
    return;
  }

  elements.usersScopeMeta.textContent = selectedAdminRegionId
    ? `Showing only users assigned to ${getRegionScopeLabel(selectedAdminRegionId)}. New users added here will be assigned to this region.`
    : "Showing users grouped by region. Users assigned to multiple regions can appear in more than one group.";
}

function renderRegionTeamList(regionId) {
  const regionUsers = getRankedUsersForRegionScope(regionId);
  return regionUsers.map((user, index) => renderTeamMemberRow(user, { regionId, index, total: regionUsers.length })).join("")
    || emptyState(`No users assigned to ${getRegionScopeLabel(regionId)}. Add a user here, or assign existing users to this region from All regions.`);
}

function renderGlobalTeamBreakdown() {
  if (!areRegionsEnabled() || data.regions.length === 0) {
    return data.users.map((user, index) => renderTeamMemberRow(user, { index, total: data.users.length })).join("")
      || emptyState("Add your first user.");
  }

  const assignedUserIds = new Set();
  const regionSections = data.regions.map((region) => {
    const users = getRankedUsersForRegionScope(region.id);
    users.forEach((user) => assignedUserIds.add(user.id));
    const rows = users.map((user, index) => renderTeamMemberRow(user, { regionId: region.id, index, total: users.length })).join("")
      || emptyState(`No users assigned to ${region.name}.`);
    return `
      <section class="team-region-section">
        <div class="team-region-section-heading">
          <h3>${escapeHtml(region.name)}</h3>
          <span class="meta">${users.length} user${users.length === 1 ? "" : "s"}</span>
        </div>
        <div class="team-region-section-list">${rows}</div>
      </section>
    `;
  }).join("");
  const unassignedUsers = data.users.filter((user) => !assignedUserIds.has(user.id));
  const unassignedSection = unassignedUsers.length > 0
    ? `
      <section class="team-region-section">
        <div class="team-region-section-heading">
          <h3>Unassigned</h3>
          <span class="meta">${unassignedUsers.length} user${unassignedUsers.length === 1 ? "" : "s"}</span>
        </div>
        <div class="team-region-section-list">${unassignedUsers.map((user, index) => renderTeamMemberRow(user, { index, total: unassignedUsers.length })).join("")}</div>
      </section>
    `
    : "";

  return regionSections + unassignedSection;
}

function renderTeamMemberRow(user, options = {}) {
  const regionId = normalizeRegionScopeId(options.regionId);
  const rankedUsers = regionId ? getRankedUsersForRegionScope(regionId) : data.users;
  const index = Number.isInteger(options.index) ? options.index : rankedUsers.findIndex((item) => item.id === user.id);
  const total = Number.isInteger(options.total) ? options.total : rankedUsers.length;
  const rankLabel = index >= 0 ? `#${index + 1}` : "#–";
  const moveUpDisabled = index <= 0 ? "disabled" : "";
  const moveDownDisabled = index < 0 || index === total - 1 ? "disabled" : "";
  const regionAttribute = regionId ? ` data-region-id="${escapeHtml(regionId)}"` : "";
  const regionEditor = renderUserRegionEditor(user);
  return `
    <div class="list-item team-member-row">
      <div class="team-rank">${rankLabel}</div>
      <div class="team-member-main">
        <div class="item-title">${escapeHtml(user.name)}</div>
        ${regionEditor}
      </div>
      <div class="item-actions team-member-actions">
        <button class="small-button hierarchy-button" type="button" data-action="move-team-user" data-user-id="${escapeHtml(user.id)}"${regionAttribute} data-direction="-1" aria-label="Move ${escapeHtml(user.name)} up" ${moveUpDisabled}>↑</button>
        <button class="small-button hierarchy-button" type="button" data-action="move-team-user" data-user-id="${escapeHtml(user.id)}"${regionAttribute} data-direction="1" aria-label="Move ${escapeHtml(user.name)} down" ${moveDownDisabled}>↓</button>
        <button class="remove-button team-remove-button" type="button" data-action="remove-user" data-user-id="${escapeHtml(user.id)}">Remove</button>
      </div>
    </div>
  `;
}

function renderUserRegionEditor(user) {
  if (!areRegionsEnabled()) {
    return "";
  }

  if (data.regions.length === 0) {
    return "<div class=\"team-region-empty meta\">No regions defined.</div>";
  }

  const assignedRegions = new Set(user.regionIds || []);
  const regions = selectedAdminRegionId
    ? data.regions.filter((region) => region.id === selectedAdminRegionId)
    : data.regions;
  const chips = regions.map((region) => `
    <label class="region-chip">
      <input type="checkbox" data-action="toggle-user-region" data-user-id="${escapeHtml(user.id)}" data-region-id="${escapeHtml(region.id)}" ${assignedRegions.has(region.id) ? "checked" : ""}>
      <span>${escapeHtml(region.name)}</span>
    </label>
  `).join("");

  return `<div class="team-region-editor">${chips}</div>`;
}

function renderRegions() {
  if (!elements.regionsList) {
    return;
  }

  const regionsEnabled = areRegionsEnabled();
  if (elements.regionsEnabledInput) {
    elements.regionsEnabledInput.checked = regionsEnabled;
  }
  if (elements.regionsEnabledLabel) {
    elements.regionsEnabledLabel.textContent = regionsEnabled ? "Yes" : "No";
  }
  const rows = data.regions.map((region) => {
    const assignedCount = data.users.filter((user) => user.regionIds?.includes(region.id)).length;
    const coverageWindow = getRegionCoverageWindow(region.id);
    const abbreviation = getSelectedTimezoneAbbreviationForEasternTime(getScheduleReferenceDate(), coverageWindow.start);
    return `
      <div class="list-item region-row">
        <div>
          <div class="item-title">${escapeHtml(region.name)}</div>
          <div class="meta">${assignedCount} user${assignedCount === 1 ? "" : "s"} assigned</div>
        </div>
        <div class="region-coverage-editor">
          <label class="field mini-field">
            <span>Start ${escapeHtml(abbreviation)}</span>
            <input type="time" value="${escapeHtml(coverageWindow.start)}" data-region-coverage-start="${escapeHtml(region.id)}">
          </label>
          <label class="field mini-field">
            <span>End ${escapeHtml(abbreviation)}</span>
            <input type="time" value="${escapeHtml(coverageWindow.end)}" data-region-coverage-end="${escapeHtml(region.id)}">
          </label>
          <button class="small-button" type="button" data-action="update-region-coverage" data-region-id="${escapeHtml(region.id)}">Update</button>
        </div>
        <div class="item-actions">
          <button class="remove-button" type="button" data-action="remove-region" data-region-id="${escapeHtml(region.id)}">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  elements.regionsList.innerHTML = rows || emptyState("No regions defined yet.");
  elements.regionsList.querySelectorAll("[data-action='update-region-coverage']").forEach((button) => {
    button.addEventListener("click", () => updateRegionCoverage(button.dataset.regionId));
  });
  elements.regionsList.querySelectorAll("[data-action='remove-region']").forEach((button) => {
    button.addEventListener("click", () => removeRegion(button.dataset.regionId));
  });
  setRegionManagementEnabled(regionsEnabled);
}

function setRegionManagementEnabled(isEnabled) {
  elements.addRegionForm?.classList.toggle("region-management-disabled", !isEnabled);
  elements.regionsList?.classList.toggle("region-management-disabled", !isEnabled);

  elements.addRegionForm?.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !isEnabled;
  });
  elements.regionsList?.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !isEnabled;
  });
}

function renderDayCheckboxes() {
  if (!elements.dayCheckboxes) {
    return;
  }

  elements.dayCheckboxes.innerHTML = SCHEDULE_DAYS.map((day) => `
    <label class="day-chip">
      <input type="checkbox" value="${day}" checked>
      <span>${day.slice(0, 3)}</span>
    </label>
  `).join("");
}

function renderTimelineTools() {
  if (!elements.timelineCanvas) {
    return;
  }

  updateGraphDateCopy();
  renderTimeline();
  renderTimelineDraftActions();
}

function updateGraphDateCopy() {
  const isWeekView = elements.scheduleViewSelect?.value === "week";

  if (elements.graphDateLabel) {
    elements.graphDateLabel.textContent = isWeekView ? "Week containing date" : "Schedule date";
  }
}

function renderTimeline() {
  if (!elements.timelineCanvas || !elements.timelineDateInput) {
    return;
  }

  const date = elements.timelineDateInput.value || getEasternNow().date;
  const view = elements.scheduleViewSelect?.value || "week";

  if (view === "week") {
    renderWeekScheduleGraph(date);
    return;
  }

  renderDayScheduleGraph(date);
}

function renderDayScheduleGraph(date) {
  const graphRange = getScheduleGraphTimeRange();
  const rows = getSortedGraphUserRowsForDate(date).map(({ user, graphBlocks }) => {
    const blocks = graphBlocks
      .map((block) => graphBlock(block))
      .join("");
    const draft = graphDraftBlock(user.id, date);
    const laneClass = draft ? "graph-lane has-draft" : "graph-lane";

    return `
      <div class="graph-row">
        <div class="graph-user">${escapeHtml(user.name)}</div>
        <div class="${laneClass}" data-user-id="${escapeHtml(user.id)}" data-date="${escapeHtml(date)}">
          ${blocks}${draft || (!blocks ? "<span class=\"graph-empty\">+</span>" : "")}
        </div>
      </div>
    `;
  }).join("");

  elements.timelineCanvas.className = "schedule-graph day-graph";
  setScheduleGraphRangeStyle(graphRange);
  elements.timelineCanvas.innerHTML = `
    ${renderGraphTimeAxis(date)}
    ${rows || emptyState(getScheduleGraphEmptyMessage())}
  `;
}

function renderGraphTimeAxis(date) {
  const graphRange = getScheduleGraphTimeRange();
  const labelMinutes = [];
  for (let minutes = graphRange.start; minutes <= graphRange.end; minutes += 120) {
    labelMinutes.push(minutes);
  }
  if (labelMinutes[labelMinutes.length - 1] !== graphRange.end) {
    labelMinutes.push(graphRange.end);
  }
  const axisLabels = labelMinutes.map((minutes, index) => {
    const easternTime = graphMinutesToTime(minutes);
    const axisDate = getGraphDateForMinutes(date, minutes);
    const position = ((minutes - graphRange.start) / graphRange.duration) * 100;
    const edgeClass = index === 0
      ? " start"
      : index === labelMinutes.length - 1
        ? " end"
        : "";
    return `
      <span class="graph-axis-tick${edgeClass}" style="left:${position}%;">
        <span class="graph-axis-tick-label">${escapeHtml(formatEasternTimeInputForDisplay(axisDate, easternTime))}</span>
      </span>
    `;
  }).join("");

  return `
    <div class="graph-time-axis">
      <div class="graph-axis-spacer"></div>
      <div class="graph-axis-track">${axisLabels}</div>
    </div>
  `;
}

function getScheduleGraphTimeRange(regionId = selectedAdminRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  if (!normalizedRegionId) {
    return getGlobalScheduleGraphTimeRange();
  }

  const coverageWindow = getRegionCoverageWindow(normalizedRegionId);
  return createPaddedGraphTimeRange(coverageWindow.start, coverageWindow.end);
}

function getGlobalScheduleGraphTimeRange() {
  const americasRegion = findRegionByBoundary(["amer", "america"]);
  const asiaRegion = findRegionByBoundary(["apac", "asia", "pacific"]);
  if (!americasRegion && !asiaRegion) {
    return createGraphTimeRange(0, 0);
  }

  if (americasRegion) {
    const endMinutes = toMinutes(getRegionCoverageWindow(americasRegion.id).end) + SCHEDULE_GRAPH_PADDING_MINUTES;
    return createGraphTimeRange(endMinutes - GLOBAL_SCHEDULE_GRAPH_DURATION_MINUTES, endMinutes);
  }

  const startMinutes = toMinutes(getRegionCoverageWindow(asiaRegion.id).start)
    - SCHEDULE_GRAPH_PADDING_MINUTES
    - 24 * 60;
  return createGraphTimeRange(startMinutes, startMinutes + GLOBAL_SCHEDULE_GRAPH_DURATION_MINUTES);
}

function createPaddedGraphTimeRange(start, end) {
  const startMinutes = toMinutes(start) - SCHEDULE_GRAPH_PADDING_MINUTES;
  const endMinutes = toMinutes(end) + SCHEDULE_GRAPH_PADDING_MINUTES;
  return toMinutes(end) <= toMinutes(start)
    ? createGraphTimeRange(startMinutes - 24 * 60, endMinutes)
    : createGraphTimeRange(startMinutes, endMinutes);
}

function findRegionByBoundary(keywords) {
  if (!hasRegionalScopes()) {
    return null;
  }

  return data.regions.find((region) => {
    const haystack = `${region.id || ""} ${region.name || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  }) || null;
}

function createGraphTimeRange(startMinutes, endMinutes) {
  const duration = endMinutes > startMinutes
    ? endMinutes - startMinutes
    : endMinutes + 24 * 60 - startMinutes;
  const safeDuration = Number.isFinite(duration) && duration > 0
    ? duration
    : TIMELINE_END_MINUTES - TIMELINE_START_MINUTES;
  const end = startMinutes + safeDuration;
  return {
    start: startMinutes,
    end,
    duration: safeDuration,
    startTime: graphMinutesToTime(startMinutes),
    endTime: graphMinutesToTime(end)
  };
}

function setScheduleGraphRangeStyle(graphRange = getScheduleGraphTimeRange()) {
  const hours = graphRange.duration / 60;
  const gridSize = Number.isFinite(hours) && hours > 0 ? 100 / hours : 6.25;
  elements.timelineCanvas?.style.setProperty("--timeline-grid-size", `${gridSize}%`);
}

function clearScheduleGraphRangeStyle() {
  elements.timelineCanvas?.style.removeProperty("--timeline-grid-size");
}

function graphMinutesToTime(totalMinutes) {
  const normalized = ((Math.round(totalMinutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return minutesToTime(normalized);
}

function getGraphDateForMinutes(date, totalMinutes) {
  return formatDate(addDays(parseDate(date), Math.floor(totalMinutes / (24 * 60))));
}

function getGraphSourceDatesForRange(date, graphRange = getScheduleGraphTimeRange()) {
  const startOffset = Math.floor(graphRange.start / (24 * 60));
  const endOffset = Math.ceil(graphRange.end / (24 * 60)) - 1;
  return Array.from(
    { length: Math.max(endOffset - startOffset + 1, 1) },
    (_, index) => formatDate(addDays(parseDate(date), startOffset + index))
  );
}

function renderWeekScheduleGraph(date) {
  timelineDrafts = [];
  renderTimelineDraftActions();
  const weekDates = getWeekDates(date);
  const header = weekDates.map((weekDate) => `
    <div class="week-header-cell">
      <strong>${getDayNameFromDate(weekDate).slice(0, 3)}</strong>
      <span>${weekDate.slice(5)}</span>
    </div>
  `).join("");

  const rows = getSortedGraphUserRowsForWeek(weekDates).map(({ user }) => {
    const cells = weekDates.map((weekDate) => {
      const day = getDayNameFromDate(weekDate);
      const blocks = getGraphBlocksForUser(user, weekDate, day)
        .map((block) => weekGraphPill(block))
        .join("");

      return `
        <div class="week-cell" data-user-id="${escapeHtml(user.id)}" data-date="${escapeHtml(weekDate)}">
          ${blocks || "<span class=\"meta\">No schedule</span>"}
        </div>
      `;
    }).join("");

    return `
      <div class="week-row">
        <div class="graph-user">${escapeHtml(user.name)}</div>
        ${cells}
      </div>
    `;
  }).join("");

  elements.timelineCanvas.className = "schedule-graph week-graph";
  clearScheduleGraphRangeStyle();
  elements.timelineCanvas.innerHTML = `
    <div class="week-row week-header">
      <div class="graph-user">User</div>
      ${header}
    </div>
    ${rows || emptyState(getScheduleGraphEmptyMessage())}
  `;
}

function getScheduleGraphEmptyMessage() {
  if (selectedAdminRegionId) {
    return `No users assigned to ${getRegionScopeLabel(selectedAdminRegionId)}. Region hours only set the graph timeline limits.`;
  }

  return "Add users before viewing schedules.";
}

function getGraphBlocksForUser(user, date, day) {
  const holidays = getHolidaysForUser(user.id, date, selectedAdminRegionId);
  if (holidays.length > 0) {
    const graphRange = getScheduleGraphTimeRange();
    return [{
      type: "holiday",
      start: graphRange.startTime,
      end: graphRange.endTime,
      date,
      graphStartMinutes: graphRange.start,
      graphEndMinutes: graphRange.end,
      label: holidays.map((holiday) => holiday.name || "OOO").join(", ")
    }];
  }

  const sourceDates = getGraphSourceDatesForRange(date);
  const scheduleBlocks = getGraphScheduleBlocksForDate(user, date, day)
    .map((window) => ({
      type: "schedule",
      id: window.id,
      userId: user.id,
      date,
      sourceDate: window.sourceDate || date,
      removeDate: window.removeDate || window.sourceDate || date,
      start: window.start,
      end: window.end,
      priority: window.priority,
      label: "Schedule"
    }));

  const extraBlocks = data.exceptions
    .filter((slot) => slot.userId === user.id && sourceDates.includes(slot.date) && slot.type === "extra")
    .map((slot) => ({
      type: "extra",
      id: slot.id,
      userId: user.id,
      date,
      sourceDate: slot.date,
      start: slot.start,
      end: slot.end,
      priority: Number.MAX_SAFE_INTEGER,
      label: "Extra"
    }))
    .filter((block) => isGraphBlockVisible(block));

  const breakBlocks = data.exceptions
    .filter((slot) => slot.userId === user.id && sourceDates.includes(slot.date) && slot.type === "break")
    .map((slot) => ({
      type: "break",
      id: slot.id,
      userId: user.id,
      date,
      sourceDate: slot.date,
      start: slot.start,
      end: slot.end,
      label: slot.reason || "Break"
    }))
    .filter((block) => isGraphBlockVisible(block));

  const oooBreakBlocks = sourceDates
    .flatMap((sourceDate) => getTimedOooBlocksForUser(user.id, sourceDate, selectedAdminRegionId))
    .map((holiday) => ({
      type: "break",
      id: holiday.id,
      source: "ooo",
      userId: user.id,
      date,
      sourceDate: holiday.date,
      start: holiday.start,
      end: holiday.end,
      label: holiday.name || "OOO"
    }))
    .filter((block) => isGraphBlockVisible(block));

  return scheduleBlocks.concat(extraBlocks, breakBlocks, oooBreakBlocks).sort(compareGraphBlocks);
}

function getGraphScheduleBlocksForDate(user, date, day = getDayNameFromDate(date)) {
  return user.schedules
    .flatMap((schedule) => getGraphScheduleBlocksForScheduleOnDate(schedule, user, date, day))
    .sort(compareGraphBlocks);
}

function getGraphScheduleBlocksForScheduleOnDate(schedule, user, date, day = getDayNameFromDate(date)) {
  if (!isValidScheduleTimeRange(schedule.start, schedule.end)) {
    return [];
  }

  if (!isScheduleActiveOnDate(schedule, date, day)) {
    return [];
  }

  const sourceDate = getScheduleEndpointDate(date, schedule, "start", user);
  const block = {
    id: schedule.id,
    source: "schedule",
    date,
    sourceDate,
    removeDate: date,
    start: schedule.start,
    end: schedule.end
  };

  return isGraphBlockVisible(block) ? [block] : [];
}

function compareGraphBlocks(left, right) {
  const leftRange = getGraphBlockAbsoluteRange(left);
  const rightRange = getGraphBlockAbsoluteRange(right);
  return (leftRange?.start ?? toGraphMinutes(left.start)) - (rightRange?.start ?? toGraphMinutes(right.start));
}

function getSortedGraphUserRowsForDate(date) {
  const day = getDayNameFromDate(date);
  return getRankedUsersForRegionScope(selectedAdminRegionId)
    .map((user, index) => {
      const graphBlocks = getGraphBlocksForUser(user, date, day);
      return {
        user,
        index,
        graphBlocks,
        sortKey: getGraphSortKey(graphBlocks)
      };
    })
    .sort(compareGraphUserRows);
}

function getSortedGraphUserRowsForWeek(weekDates) {
  return getRankedUsersForRegionScope(selectedAdminRegionId)
    .map((user, index) => ({
      user,
      index,
      sortKey: weekDates
        .map((weekDate) => getGraphSortKey(getGraphBlocksForUser(user, weekDate, getDayNameFromDate(weekDate))))
        .sort(compareGraphSortKeys)[0] || emptyGraphSortKey()
    }))
    .sort(compareGraphUserRows);
}

function getGraphSortKey(blocks) {
  const coverageBlocks = blocks.filter((block) => block.type === "schedule" || block.type === "extra");
  if (coverageBlocks.length === 0) {
    return emptyGraphSortKey();
  }

  return coverageBlocks
    .map((block) => ({
      start: getGraphBlockSortStartMinutes(block),
      priority: Number(block.priority || Number.MAX_SAFE_INTEGER)
    }))
    .sort(compareGraphSortKeys)[0];
}

function getGraphBlockSortStartMinutes(block) {
  const start = getGraphEndpointDisplayParts(block, "start");
  const end = getGraphEndpointDisplayParts(block, "end");
  const showDayOffsets = shouldShowGraphDayOffsets(start, end);
  const anchorDayOffset = getGraphDayOffsetAnchor(start, end, showDayOffsets);
  return (start.dayOffset - anchorDayOffset) * 24 * 60 + toMinutes(start.time);
}

function emptyGraphSortKey() {
  return {
    start: Number.POSITIVE_INFINITY,
    priority: Number.POSITIVE_INFINITY
  };
}

function compareGraphUserRows(left, right) {
  return compareGraphSortKeys(left.sortKey, right.sortKey) || left.index - right.index;
}

function compareGraphSortKeys(left, right) {
  if (left.start !== right.start) {
    return left.start < right.start ? -1 : 1;
  }

  if (left.priority !== right.priority) {
    return left.priority < right.priority ? -1 : 1;
  }

  return 0;
}

function shouldShowServiceNowCoverageConfigItems() {
  const config = getIncidentConfig();
  return config.enabled && config.mode === "servicenow";
}

function renderSystems() {
  if (!elements.systemsList) {
    return;
  }

  const showServiceNowConfigItems = shouldShowServiceNowCoverageConfigItems();
  const showSystemRegionControls = areRegionsEnabled() && !selectedAdminRegionId;
  const systems = getScopedSystems(selectedAdminRegionId);
  const rows = systems.map((system) => {
    const systemRegionIds = getSystemRegionIds(system);
    const systemRegionLabel = getSystemRegionLabel(system);
    const coverageUsers = getSystemCoverageUsers(system);
    const regionRows = areRegionsEnabled()
      ? data.regions.map((region) => `
        <label class="region-chip system-region-chip">
          <input type="checkbox" data-action="toggle-system-region" data-system-id="${escapeHtml(system.id)}" data-region-id="${escapeHtml(region.id)}" ${systemRegionIds.includes(region.id) ? "checked" : ""}>
          <span>${escapeHtml(region.name)}</span>
        </label>
      `).join("")
      : "";
    const assignedRows = system.primaryUserIds.map((userId, index) => {
      const user = data.users.find((item) => item.id === userId);
      if (!user) {
        return "";
      }

      return `
        <div class="coverage-priority-row">
          <div class="priority-badge">#${index + 1}</div>
          <div class="priority-person">
            <div class="item-title">${escapeHtml(user.name)}</div>
            <div class="meta">Queue priority</div>
          </div>
          <div class="item-actions">
            <button class="small-button priority-move-button" type="button" data-action="move-user" data-system-id="${escapeHtml(system.id)}" data-user-id="${escapeHtml(user.id)}" data-direction="-1" aria-label="Move ${escapeHtml(user.name)} up">↑</button>
            <button class="small-button priority-move-button" type="button" data-action="move-user" data-system-id="${escapeHtml(system.id)}" data-user-id="${escapeHtml(user.id)}" data-direction="1" aria-label="Move ${escapeHtml(user.name)} down">↓</button>
            <button class="remove-button priority-remove-button" type="button" data-action="remove-covered-user" data-system-id="${escapeHtml(system.id)}" data-user-id="${escapeHtml(user.id)}" aria-label="Remove ${escapeHtml(user.name)} from ${escapeHtml(system.name)}">Delete</button>
          </div>
        </div>
      `;
    }).join("");

    const coverageRows = coverageUsers.map((user) => `
      <label class="coverage-chip">
        <input type="checkbox" data-action="toggle-coverage" data-system-id="${escapeHtml(system.id)}" data-user-id="${escapeHtml(user.id)}" ${system.primaryUserIds.includes(user.id) ? "checked" : ""}>
        <span>${escapeHtml(user.name)}</span>
      </label>
    `).join("");
    const serviceNowConfigItemSection = showServiceNowConfigItems
      ? `
        <div class="coverage-section">
          <label class="field coverage-config-item-field">
            <span>ServiceNow config item</span>
            <input type="text" value="${escapeHtml(system.serviceNowConfigItem || "")}" data-action="update-system-servicenow-config-item" data-system-id="${escapeHtml(system.id)}" placeholder="${escapeHtml(system.name)}">
            <span class="meta">Sent as cmdb_ci when ServiceNow incident creation is enabled.</span>
          </label>
        </div>
      `
      : "";

    return `
      <article class="system-card">
        <div class="system-card-header">
          <div>
            <h3>${escapeHtml(system.name)}</h3>
            ${showSystemRegionControls ? `<div class="meta">Regions: ${escapeHtml(systemRegionLabel)}</div>` : ""}
          </div>
          <button class="remove-button subtle-danger" type="button" data-action="remove-system" data-system-id="${escapeHtml(system.id)}">Remove</button>
        </div>
        ${serviceNowConfigItemSection}
        ${showSystemRegionControls ? `
          <div class="coverage-section">
            <div class="coverage-section-label">Regions</div>
            <div class="region-tag-list system-region-grid">${regionRows}</div>
            <div class="meta">Coverage users below come from the selected system regions.</div>
          </div>
        ` : ""}
        <div class="coverage-section">
          <div class="coverage-section-label">Coverage users</div>
          <div class="coverage-grid">${coverageRows || emptyState(areRegionsEnabled() ? "No users in selected system regions." : "Add users first.")}</div>
        </div>
        <div class="coverage-section">
          <div class="coverage-section-label">Priority order</div>
          <div class="coverage-priority-list">${assignedRows || emptyState("No SMEs assigned.")}</div>
        </div>
      </article>
    `;
  }).join("");

  elements.systemsList.innerHTML = rows || emptyState("Add your first system/app.");
  elements.systemsList.querySelectorAll("[data-action='toggle-coverage']").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleCoverage(checkbox.dataset.systemId, checkbox.dataset.userId, checkbox.checked));
  });
  elements.systemsList.querySelectorAll("[data-action='toggle-system-region']").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleSystemRegion(checkbox.dataset.systemId, checkbox.dataset.regionId, checkbox.checked));
  });
  elements.systemsList.querySelectorAll("[data-action='move-user']").forEach((button) => {
    button.addEventListener("click", () => moveCoveredUser(button.dataset.systemId, button.dataset.userId, Number(button.dataset.direction)));
  });
  elements.systemsList.querySelectorAll("[data-action='remove-covered-user']").forEach((button) => {
    button.addEventListener("click", () => removeCoveredUser(button.dataset.systemId, button.dataset.userId));
  });
  elements.systemsList.querySelectorAll("[data-action='remove-system']").forEach((button) => {
    button.addEventListener("click", () => removeSystem(button.dataset.systemId));
  });
  elements.systemsList.querySelectorAll("[data-action='update-system-servicenow-config-item']").forEach((input) => {
    input.addEventListener("change", () => updateSystemServiceNowConfigItem(input.dataset.systemId, input.value));
  });
}

function renderHolidayFormMode() {
  const isTimedBlock = elements.holidayTypeSelect?.value === OOO_TYPE_TIME;
  if (elements.holidayDateLabel) {
    elements.holidayDateLabel.textContent = isTimedBlock ? "Date" : "Start date";
  }
  elements.holidayDateRangeFields?.classList.toggle("single-date", isTimedBlock);
  elements.holidayEndDateField?.classList.toggle("hidden", isTimedBlock);
  if (elements.holidayEndDateInput) {
    elements.holidayEndDateInput.required = !isTimedBlock;
    elements.holidayEndDateInput.disabled = isTimedBlock || !isAdminTabUnlocked("holidays");
    if (!elements.holidayEndDateInput.value) {
      elements.holidayEndDateInput.value = elements.holidayDateInput?.value || getEasternNow().date;
    }
  }
  elements.holidayTimeFields?.classList.toggle("hidden", !isTimedBlock);
  [elements.holidayStartInput, elements.holidayEndInput].forEach((input) => {
    if (input) {
      input.required = isTimedBlock;
      input.disabled = !isTimedBlock || !isAdminTabUnlocked("holidays");
    }
  });
  normalizeHolidayDateRangeInputs("start");
  updateForwardTimeInputConstraints();
}

function renderHolidays() {
  if (!elements.holidaysList) {
    return;
  }

  if (areRegionsEnabled() && !selectedAdminRegionId) {
    renderHolidayOverview();
    return;
  }

  if (areRegionsEnabled() && selectedAdminRegionId) {
    const individualRows = renderHolidayRows(
      getGlobalIndividualHolidaysForRegion(selectedAdminRegionId),
      GLOBAL_REGION_SCOPE_ID,
      "Individual OOO"
    );
    const regionRows = renderHolidayRows(
      getScopedHolidays(selectedAdminRegionId),
      selectedAdminRegionId,
      `${getRegionScopeLabel(selectedAdminRegionId)} OOO`
    );
    elements.holidaysList.innerHTML = individualRows || regionRows
      ? `${individualRows}${regionRows}`
      : emptyState("No OOO yet.");
    bindHolidayRemoveButtons();
    return;
  }

  elements.holidaysList.innerHTML = renderHolidayRows(getScopedHolidays(selectedAdminRegionId), selectedAdminRegionId)
    || emptyState("No OOO yet.");
  bindHolidayRemoveButtons();
}

function renderHolidayOverview() {
  const individualRows = renderHolidayRows(
    getGlobalIndividualHolidays(),
    GLOBAL_REGION_SCOPE_ID,
    "Individual OOO"
  );
  const regionRows = data.regions
    .map((region) => renderHolidayRows(getScopedHolidays(region.id), region.id, `${region.name} OOO`))
    .filter(Boolean)
    .join("");

  elements.holidaysList.innerHTML = individualRows || regionRows
    ? `${individualRows}${regionRows}`
    : emptyState("No OOO yet.");
  bindHolidayRemoveButtons();
}

function renderHolidayRows(holidays, regionId = selectedAdminRegionId, heading = "") {
  const rows = holidays
    .slice()
    .sort(compareOooRecords)
    .map((holiday) => {
      const userName = getHolidayUserName(holiday, regionId);
      return `
        <div class="list-item">
          <div>
            <div class="item-title">${escapeHtml(userName)}</div>
            <div class="meta">${escapeHtml(formatOooRecordLabel(holiday))}</div>
          </div>
          <button class="remove-button" type="button" data-action="remove-holiday" data-holiday-id="${escapeHtml(holiday.id)}" data-region-id="${escapeHtml(regionId || GLOBAL_REGION_SCOPE_ID)}">Remove</button>
        </div>
      `;
    }).join("");

  if (!rows) {
    return "";
  }

  return `
    ${heading ? `<div class="systems-list-heading">${escapeHtml(heading)}</div>` : ""}
    ${rows}
  `;
}

function bindHolidayRemoveButtons() {
  elements.holidaysList.querySelectorAll("[data-action='remove-holiday']").forEach((button) => {
    button.addEventListener("click", () => removeHoliday(button.dataset.holidayId, button.dataset.regionId));
  });
}

function renderDelegationSlots() {
  if (!elements.delegationSlotsList) {
    return;
  }

  const rows = getSortedDelegationSlots().map((slot) => `
    <div class="list-item">
      <div>
        <div class="item-title">${escapeHtml(formatDelegationSlotDefinition(slot))}</div>
      </div>
      <button class="remove-button" type="button" data-action="remove-delegation-slot" data-slot-id="${escapeHtml(slot.id)}">Delete</button>
    </div>
  `).join("");

  elements.delegationSlotsList.innerHTML = rows || emptyState("No predefined coverage slots yet.");
  elements.delegationSlotsList.querySelectorAll("[data-action='remove-delegation-slot']").forEach((button) => {
    button.addEventListener("click", () => removeDelegationSlot(button.dataset.slotId));
  });
}

function toggleDelegationSlotEditor() {
  setDelegationSlotEditorVisible(elements.delegationSlotEditor?.classList.contains("hidden"));
}

function setDelegationSlotEditorVisible(isVisible) {
  if (!elements.delegationSlotEditor) {
    return;
  }

  elements.delegationSlotEditor.classList.toggle("hidden", !isVisible);
  elements.toggleDelegationSlotEditorButton?.setAttribute("aria-expanded", String(isVisible));
  if (elements.toggleDelegationSlotEditorButton) {
    elements.toggleDelegationSlotEditorButton.textContent = isVisible ? "Close time slots" : "Edit time slots";
  }
  if (isVisible) {
    elements.delegationStartInput?.focus();
  }
}

function renderDelegations() {
  renderDelegationGraph();
}

function renderDelegationGraph() {
  if (!elements.delegationCanvas || !elements.delegationGraphDateInput) {
    return;
  }

  updateDelegationGraphDateCopy();
  const date = elements.delegationGraphDateInput.value || getEasternNow().date;
  const view = elements.delegationViewSelect?.value || "day";

  renderDelegationAssignmentBoard(date, view);
}

function updateDelegationGraphDateCopy() {
  if (!elements.delegationGraphDateLabel) {
    return;
  }

  const isWeekView = elements.delegationViewSelect?.value === "week";
  elements.delegationGraphDateLabel.textContent = isWeekView ? "Week containing date" : "Delegation date";
}

function renderDelegationAssignmentBoard(date, view) {
  const container = getDelegationAssignmentContainer();
  if (!container) {
    return;
  }

  const slots = getSortedDelegationSlots();
  const dates = view === "week" ? getDelegationWeekDates(date) : [date];
  container.className = `delegation-assignment-board ${view === "week" ? "week-board" : "day-board"}`;

  if (slots.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No time slots yet. Click “Edit time slots” to create the coverage times once.
      </div>
    `;
    if (elements.saveDelegationAssignmentsButton) {
      elements.saveDelegationAssignmentsButton.disabled = true;
    }
    return;
  }

  if (elements.saveDelegationAssignmentsButton) {
    elements.saveDelegationAssignmentsButton.disabled = false;
  }

  container.innerHTML = view === "week"
    ? renderWeeklyDelegationAssignmentBoard(slots, dates)
    : renderDailyDelegationAssignmentBoard(slots, dates[0]);
}

function getDelegationAssignmentContainer() {
  return elements.delegationCanvas;
}

function getDelegationWeekDates(date) {
  return getWeekDates(date).slice(0, 5);
}

function renderDailyDelegationAssignmentBoard(slots, date) {
  const rows = slots.map((slot) => {
    const delegation = getDelegationForSlotDate(slot, date);
    return `
      <div class="delegation-board-row">
        <div class="delegation-slot-label">
          <strong>${escapeHtml(formatDelegationSlotDefinition(slot))}</strong>
        </div>
        ${renderDelegationOwnerSelect(slot, date, delegation)}
      </div>
    `;
  }).join("");

  return `
    <div class="delegation-board-day">
      ${rows}
    </div>
  `;
}

function renderWeeklyDelegationAssignmentBoard(slots, dates) {
  const header = dates.map((date) => `
    <div class="delegation-board-heading">
      <strong>${getDayNameFromDate(date).slice(0, 3)}</strong>
      <span>${date.slice(5)}</span>
    </div>
  `).join("");

  const rows = slots.map((slot) => {
    const cells = dates.map((date) => renderDelegationOwnerSelect(slot, date, getDelegationForSlotDate(slot, date))).join("");
    return `
      <div class="delegation-board-row delegation-board-week-row">
        <div class="delegation-slot-label">
          <strong>${escapeHtml(formatDelegationSlotDefinition(slot))}</strong>
        </div>
        ${cells}
      </div>
    `;
  }).join("");

  return `
    <div class="delegation-board-row delegation-board-week-row delegation-board-header">
      <div class="delegation-slot-label">Slot</div>
      ${header}
    </div>
    ${rows}
  `;
}

function renderDelegationOwnerSelect(slot, date, delegation) {
  const selectedUserId = delegation?.delegatorUserId || "";
  const label = `${formatDelegationSlotDefinitionForDate(slot, date)} on ${formatDisplayDate(date)}`;
  const selectedUser = getUserFromReference(selectedUserId);
  const selectedEligibility = selectedUser
    ? getDelegatorAssignmentEligibility(selectedUser, slot, date)
    : { selectable: true, reason: "" };
  const invalidSelectedUser = Boolean(selectedUser && !selectedEligibility.selectable);
  const options = [
    `<option value="">Unassigned</option>`,
    ...data.users.map((user) => {
      const eligibility = getDelegatorAssignmentEligibility(user, slot, date);
      const reason = eligibility.selectable ? "" : ` — ${eligibility.reason}`;
      return `<option value="${escapeHtml(user.id)}" ${user.id === selectedUserId ? "selected" : ""} ${eligibility.selectable ? "" : "disabled"}>${escapeHtml(user.name)}${escapeHtml(reason)}</option>`;
    })
  ].join("");
  const warning = invalidSelectedUser
    ? `<span class="delegation-owner-warning">${escapeHtml(selectedEligibility.reason)}</span>`
    : "";

  return `
    <label class="delegation-owner-field ${invalidSelectedUser ? "invalid" : ""}">
      <select class="delegation-owner-select" data-slot-id="${escapeHtml(slot.id)}" data-date="${escapeHtml(date)}" aria-label="Delegator for ${escapeHtml(label)}">
        ${options}
      </select>
      ${warning}
    </label>
  `;
}

function handleDelegationOwnerSelectChange(event) {
  const select = event.target?.matches?.(".delegation-owner-select")
    ? event.target
    : null;
  if (!select) {
    return;
  }

  updateDelegationOwnerSelectState(select);
}

function updateDelegationOwnerSelectState(select) {
  const field = select.closest?.(".delegation-owner-field");
  if (!field) {
    return;
  }

  const slot = getDelegationSlotById(select.dataset.slotId);
  const date = select.dataset.date || "";
  const user = getUserFromReference(select.value);
  const eligibility = user
    ? getDelegatorAssignmentEligibility(user, slot, date)
    : { selectable: true, reason: "" };
  const invalid = Boolean(user && !eligibility.selectable);

  field.classList.toggle("invalid", invalid);
  field.querySelector(".delegation-owner-warning")?.remove();
  if (!invalid) {
    return;
  }

  const warning = document.createElement("span");
  warning.className = "delegation-owner-warning";
  warning.textContent = eligibility.reason;
  field.append(warning);
}

function renderDelegationAssignments(easternNow = getEasternNow()) {
  if (!elements.delegationAssignmentsList) {
    return;
  }

  const currentDelegations = getCurrentDelegations(easternNow);
  const rows = currentDelegations.map((delegation) => `
    <div class="delegation-card ${getDelegationStatus(delegation, easternNow).status}${delegation.delegatorUserId ? "" : " unassigned"}">
      <div>
        <div class="item-title">${escapeHtml(formatCurrentDelegationLine(delegation))}</div>
      </div>
    </div>
  `).join("");

  elements.delegationAssignmentsList.innerHTML = rows || `
    <div class="delegation-card unassigned">
      <div>
        <div class="item-title">Unassigned</div>
      </div>
    </div>
  `;
}

function formatCurrentDelegationLine(delegation) {
  const abbreviation = getSelectedTimezoneAbbreviationForDelegation(delegation);
  return `${getDelegationUserName(delegation)} · ${formatDelegationRecordDisplayTimeRange(delegation)} ${abbreviation}`;
}

function renderDataPreview() {
  if (!elements.dataPreview) {
    return;
  }

  elements.dataPreview.value = JSON.stringify(data, null, 2);
}

function renderRetentionPolicy() {
  const policy = getRetentionPolicy();
  setRetentionInputValue(elements.assignmentRetentionDaysInput, policy.assignmentLogDays);
  setRetentionInputValue(elements.oooRetentionDaysInput, policy.oooDays);
  setRetentionInputValue(elements.delegationRetentionDaysInput, policy.delegationDays);
  setRetentionInputValue(elements.backupRetentionDaysInput, policy.backupSnapshotDays);
}

function setRetentionInputValue(input, value) {
  if (!input || document.activeElement === input) {
    return;
  }

  input.value = String(value);
}

function saveRetentionPolicy(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("data")) {
    return;
  }

  data.retentionPolicy = readRetentionPolicyForm();
  completeAdminSave("Policy saved and old records cleaned.", "data");
}

function readRetentionPolicyForm() {
  const current = getRetentionPolicy();
  return normalizeRetentionPolicy({
    assignmentLogDays: elements.assignmentRetentionDaysInput?.value || current.assignmentLogDays,
    oooDays: elements.oooRetentionDaysInput?.value || current.oooDays,
    delegationDays: elements.delegationRetentionDaysInput?.value || current.delegationDays,
    backupSnapshotDays: elements.backupRetentionDaysInput?.value || current.backupSnapshotDays
  });
}

function renderIncidentConfig() {
  if (!elements.incidentConfigForm) {
    return;
  }

  const config = getIncidentConfig();
  if (elements.incidentEnabledInput) {
    elements.incidentEnabledInput.checked = config.enabled;
  }
  document.querySelectorAll("input[name='incidentCreationMode']").forEach((input) => {
    input.checked = input.value === config.mode;
  });
  if (elements.incidentRedirectUrlInput) {
    elements.incidentRedirectUrlInput.value = config.redirect.url;
  }
  if (elements.serviceNowInstanceUrlInput) {
    elements.serviceNowInstanceUrlInput.value = config.serviceNow.instanceUrl;
  }
  if (elements.serviceNowApiPathInput) {
    elements.serviceNowApiPathInput.value = config.serviceNow.apiPath;
  }
  if (elements.serviceNowShortDescriptionInput) {
    elements.serviceNowShortDescriptionInput.value = config.serviceNow.shortDescriptionTemplate;
  }
  renderServiceNowHiddenFields(config.serviceNow.hiddenFields);
  if (elements.teamsEnabledInput) {
    elements.teamsEnabledInput.checked = config.teams.enabled;
  }
  if (elements.teamsWebhookUrlInput) {
    elements.teamsWebhookUrlInput.value = config.teams.webhookUrl;
  }
  if (elements.teamsMessageFormatSelect) {
    elements.teamsMessageFormatSelect.value = config.teams.messageFormat;
  }
  if (elements.teamsMessageTemplateInput) {
    elements.teamsMessageTemplateInput.value = config.teams.messageTemplate;
  }

  updateIncidentConfigControlState();
}

function renderServiceNowHiddenFields(fields = []) {
  if (!elements.serviceNowHiddenFieldsList) {
    return;
  }

  const normalizedFields = normalizeServiceNowHiddenFields(fields);
  elements.serviceNowHiddenFieldsList.innerHTML = normalizedFields.length > 0
    ? normalizedFields.map((field) => `
      <div class="service-now-hidden-field-row" data-service-now-hidden-field-row data-field-id="${escapeHtml(field.id)}">
        <input type="hidden" data-service-now-hidden-field-name value="${escapeHtml(field.name)}">
        <input type="hidden" data-service-now-hidden-field-value value="${escapeHtml(field.value)}">
        <div class="service-now-hidden-field-copy">
          <code>${escapeHtml(field.name)}</code>
          <span>${escapeHtml(field.value)}</span>
        </div>
        <button class="remove-button" type="button" data-action="remove-service-now-hidden-field">Remove</button>
      </div>
    `).join("")
    : emptyState("No hidden ServiceNow values yet.");

  bindServiceNowHiddenFieldActions();
  renderAdminLocks();
}

function bindServiceNowHiddenFieldActions() {
  elements.serviceNowHiddenFieldsList?.querySelectorAll("[data-action='remove-service-now-hidden-field']").forEach((button) => {
    button.addEventListener("click", () => {
      if (!isAdminTabUnlocked("incidents")) {
        return;
      }
      button.closest("[data-service-now-hidden-field-row]")?.remove();
      renderAdminLocks();
    });
  });
}

function addServiceNowHiddenField() {
  if (!isAdminTabUnlocked("incidents")) {
    return;
  }

  const name = String(elements.serviceNowHiddenFieldNameInput?.value || "").trim();
  const value = String(elements.serviceNowHiddenFieldValueInput?.value || "").trim();
  const currentFields = getServiceNowHiddenFieldsFromForm();
  const validationMessage = getServiceNowHiddenFieldValidationMessage(name, value, currentFields);
  if (validationMessage) {
    showGenericAlert("Invalid ServiceNow value", validationMessage);
    return;
  }

  renderServiceNowHiddenFields(currentFields.concat({
    id: makeRecordId("servicenow-field"),
    name,
    value
  }));

  if (elements.serviceNowHiddenFieldNameInput) {
    elements.serviceNowHiddenFieldNameInput.value = "";
    elements.serviceNowHiddenFieldNameInput.focus();
  }
  if (elements.serviceNowHiddenFieldValueInput) {
    elements.serviceNowHiddenFieldValueInput.value = "";
  }
}

function getServiceNowHiddenFieldValidationMessage(name, value, currentFields = []) {
  if (!name) {
    return "Add the ServiceNow field name.";
  }
  if (!SERVICENOW_FIELD_NAME_PATTERN.test(name)) {
    return "Use a valid ServiceNow field name, such as assignment_group, category, or u_source.";
  }
  if (SERVICENOW_FORM_CONTROLLED_FIELDS.includes(name)) {
    return "That field is controlled by the assignment incident form.";
  }
  if (!value) {
    return "Add the value that should be sent for this field.";
  }
  if (currentFields.some((field) => field.name === name)) {
    return "That ServiceNow field is already configured.";
  }

  return "";
}

function getServiceNowHiddenFieldsFromForm() {
  return normalizeServiceNowHiddenFields(Array.from(elements.serviceNowHiddenFieldsList?.querySelectorAll("[data-service-now-hidden-field-row]") || [])
    .map((row) => ({
      id: row.dataset.fieldId,
      name: row.querySelector("[data-service-now-hidden-field-name]")?.value || "",
      value: row.querySelector("[data-service-now-hidden-field-value]")?.value || ""
    })));
}

function updateIncidentConfigControlState() {
  if (!elements.incidentConfigForm) {
    return;
  }

  const enabled = Boolean(elements.incidentEnabledInput?.checked);
  const mode = getSelectedIncidentCreationMode();
  const teamsEnabled = Boolean(elements.teamsEnabledInput?.checked);

  if (elements.incidentEnabledLabel) {
    elements.incidentEnabledLabel.textContent = enabled ? "Yes" : "No";
  }
  if (elements.teamsEnabledLabel) {
    elements.teamsEnabledLabel.textContent = teamsEnabled ? "Yes" : "No";
  }

  elements.incidentConfigFields?.classList.toggle("incident-config-disabled", !enabled);
  elements.incidentRedirectSettings?.classList.toggle("incident-settings-disabled", !enabled || mode !== "redirect");
  elements.incidentServiceNowSettings?.classList.toggle("incident-settings-disabled", !enabled || mode !== "servicenow");
  elements.teamsConfigFields?.classList.toggle("incident-settings-disabled", !enabled || !teamsEnabled);
  renderAdminLocks();
}

function saveIncidentConfig(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("incidents")) {
    renderIncidentConfig();
    return;
  }

  data.incidentConfig = normalizeIncidentConfig({
    enabled: Boolean(elements.incidentEnabledInput?.checked),
    mode: getSelectedIncidentCreationMode(),
    redirect: {
      url: elements.incidentRedirectUrlInput?.value || ""
    },
    serviceNow: {
      instanceUrl: elements.serviceNowInstanceUrlInput?.value || "",
      apiPath: elements.serviceNowApiPathInput?.value || "",
      shortDescriptionTemplate: elements.serviceNowShortDescriptionInput?.value || "",
      hiddenFields: getServiceNowHiddenFieldsFromForm()
    },
    teams: {
      enabled: Boolean(elements.teamsEnabledInput?.checked),
      webhookUrl: elements.teamsWebhookUrlInput?.value || "",
      messageFormat: elements.teamsMessageFormatSelect?.value || "",
      messageTemplate: elements.teamsMessageTemplateInput?.value || ""
    }
  });

  completeAdminSave("Incident configuration saved.", "incidents");
}

function getSelectedIncidentCreationMode() {
  const selected = document.querySelector("input[name='incidentCreationMode']:checked")?.value;
  return INCIDENT_CREATION_MODES.includes(selected) ? selected : DEFAULT_INCIDENT_CONFIG.mode;
}

function saveAssignmentRules(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("rules")) {
    return;
  }

  setScopedAssignmentRules(selectedAdminRegionId, {
    preset: getAssignmentRulePreset(selectedAssignmentPolicyId || getScopedAssignmentRules(selectedAdminRegionId)?.preset).id
  });
  completeAdminSave("Assignment rules saved.", "rules");
}

function addShiftTemplate(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("shifts")) {
    return;
  }
  if (shouldRenderGroupedRegionalShifts()) {
    showGenericAlert("Pick a region", "Choose a specific region before adding a shift preset.");
    return;
  }

  const name = elements.shiftNameInput.value.trim();
  const displayStart = elements.shiftStartInput.value;
  const displayEnd = elements.shiftEndInput.value;

  if (!name || !isValidScheduleTimeRange(displayStart, displayEnd)) {
    showGenericAlert("Invalid shift", "Add a shift name and keep the shift 12 hours or less. Overnight shifts are allowed.");
    return;
  }

  const date = getScheduleReferenceDate();
  const convertedStart = convertDisplayDateTimeToEastern(date, displayStart);
  const convertedEnd = convertDisplayDateTimeToEastern(date, displayEnd);
  if (!isValidScheduleTimeRange(convertedStart.time, convertedEnd.time)) {
    showGenericAlert("Invalid shift", "Shift times must be 12 hours or less in Eastern Time.");
    return;
  }

  const shiftTemplates = getScopedShiftTemplates(selectedAdminRegionId);
  shiftTemplates.push({
    id: makeId(name, shiftTemplates.map((template) => template.id)),
    name,
    start: convertedStart.time,
    end: convertedEnd.time
  });

  shiftAddFormOpen = false;
  resetShiftAddForm();
  completeAdminSave("Shift saved.", "shifts");
}

function getShiftRowElement(shiftId, regionId = selectedAdminRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  return elements.shiftsList.querySelector(`[data-shift-id="${cssEscape(shiftId)}"][data-region-id="${cssEscape(normalizedRegionId)}"]`);
}

function updateShiftTemplate(shiftId, regionId = selectedAdminRegionId) {
  if (!isAdminTabUnlocked("shifts")) {
    return;
  }

  const normalizedRegionId = normalizeRegionScopeId(regionId);
  const row = getShiftRowElement(shiftId, normalizedRegionId);
  const template = getScopedShiftTemplates(normalizedRegionId).find((item) => item.id === shiftId);
  if (!row || !template) {
    return;
  }

  const name = row.querySelector(".shift-name-field").value.trim();
  const displayStart = row.querySelector(".shift-start-field").value;
  const displayEnd = row.querySelector(".shift-end-field").value;
  const maxDurationMinutes = getShiftTemplateMaxDurationMinutes(template, normalizedRegionId);
  const maxDurationLabel = formatDurationMinutes(maxDurationMinutes);
  const isRegionCoverageTemplate = isRegionCoverageShiftTemplate(template, normalizedRegionId);

  if (!name || !isValidTimeRangeWithinDuration(displayStart, displayEnd, maxDurationMinutes)) {
    showGenericAlert("Invalid shift", `Shifts need a name and a duration of ${maxDurationLabel} or less. Overnight shifts are allowed.`);
    return;
  }

  const date = getScheduleReferenceDate();
  const convertedStart = convertDisplayDateTimeToEastern(date, displayStart);
  const convertedEnd = convertDisplayDateTimeToEastern(date, displayEnd);
  if (!isValidTimeRangeWithinDuration(convertedStart.time, convertedEnd.time, maxDurationMinutes)) {
    showGenericAlert("Invalid shift", `Shift times must be ${maxDurationLabel} or less in Eastern Time.`);
    return;
  }

  template.name = name;
  template.start = convertedStart.time;
  template.end = convertedEnd.time;
  if (isRegionCoverageTemplate) {
    const region = getRegionById(normalizedRegionId);
    if (region) {
      region.coverageStart = convertedStart.time;
      region.coverageEnd = convertedEnd.time;
      syncRegionCoverageShift(region.id);
    }
  }
  completeAdminSave("Shift saved.", "shifts");
}

function removeShiftTemplate(shiftId, regionId = selectedAdminRegionId) {
  if (!isAdminTabUnlocked("shifts")) {
    return;
  }

  const normalizedRegionId = normalizeRegionScopeId(regionId);
  const template = getScopedShiftTemplates(normalizedRegionId).find((item) => item.id === shiftId);
  if (!template) {
    return;
  }

  openRemoveShiftModal(template, normalizedRegionId);
}

function openRemoveShiftModal(template, regionId = selectedAdminRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  if (!elements.removeShiftModal) {
    performRemoveShiftTemplate(template.id, normalizedRegionId);
    return;
  }

  pendingRemoveShiftId = template.id;
  pendingRemoveShiftRegionId = normalizedRegionId;
  if (elements.removeShiftModalName) {
    const date = getScheduleReferenceDate();
    const abbreviation = getSelectedTimezoneAbbreviationForDate(date);
    elements.removeShiftModalName.textContent = `${template.name} · ${formatEasternTimeInputForDisplay(date, template.start)}–${formatEasternTimeInputForDisplay(date, template.end)} ${abbreviation}`;
  }
  if (elements.removeShiftModalImpact) {
    elements.removeShiftModalImpact.textContent = getRemoveShiftImpactText(template, normalizedRegionId);
  }

  elements.removeShiftModal.classList.remove("hidden");
  elements.removeShiftModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.cancelRemoveShiftButton?.focus(), 0);
}

function closeRemoveShiftModal() {
  pendingRemoveShiftId = null;
  pendingRemoveShiftRegionId = GLOBAL_REGION_SCOPE_ID;
  if (!elements.removeShiftModal) {
    return;
  }

  elements.removeShiftModal.classList.add("hidden");
  elements.removeShiftModal.setAttribute("aria-hidden", "true");
}

function confirmRemoveShift() {
  if (!pendingRemoveShiftId || !isAdminTabUnlocked("shifts")) {
    closeRemoveShiftModal();
    return;
  }

  const shiftId = pendingRemoveShiftId;
  const regionId = pendingRemoveShiftRegionId;
  closeRemoveShiftModal();
  performRemoveShiftTemplate(shiftId, regionId);
}

function performRemoveShiftTemplate(shiftId, regionId = selectedAdminRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  setScopedShiftTemplates(normalizedRegionId, getScopedShiftTemplates(normalizedRegionId).filter((item) => item.id !== shiftId));
  if (!normalizedRegionId) {
    data.users.forEach((user) => {
      user.schedules.forEach((schedule) => {
        if (schedule.shiftType === shiftId) {
          schedule.shiftType = "custom";
        }
      });
    });
  }
  completeAdminSave("Shift removed.");
}

function getRemoveShiftImpactText(template, regionId = selectedAdminRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  if (normalizedRegionId) {
    return "Regional shift presets can be removed without changing saved user schedules.";
  }

  const affectedSchedules = data.users.reduce((count, user) => (
    count + user.schedules.filter((schedule) => schedule.shiftType === template.id).length
  ), 0);

  return affectedSchedules === 0
    ? "No existing schedules use this shift."
    : `${affectedSchedules} existing schedule${affectedSchedules === 1 ? "" : "s"} will keep their times and become custom schedules.`;
}

function addUser(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("users")) {
    return;
  }

  const name = elements.userNameInput.value.trim();
  if (!name) {
    return;
  }

  const userId = makeId(name, data.users.map((user) => user.id));
  data.users.push({
    id: userId,
    name,
    regionIds: selectedAdminRegionId ? [selectedAdminRegionId] : [],
    schedules: []
  });
  addUserToRegionTeamOrder(selectedAdminRegionId, userId);

  elements.addUserForm.reset();
  completeAdminSave(selectedAdminRegionId ? `User saved to ${getRegionScopeLabel(selectedAdminRegionId)}.` : "User saved.");
}

function addRegion(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("regions")) {
    return;
  }

  const name = elements.regionNameInput.value.trim();
  if (!name) {
    return;
  }

  const coverageStart = elements.regionCoverageStartInput?.value || "07:00";
  const coverageEnd = elements.regionCoverageEndInput?.value || "19:00";
  if (!isValidRegionCoverageTimeRange(coverageStart, coverageEnd)) {
    showGenericAlert("Invalid region hours", "Region hours must be more than 0 minutes and no more than 14 hours. Overnight windows are allowed.");
    return;
  }

  const id = makeId(name, data.regions.map((region) => region.id));
  data.regions.push({
    id,
    name,
    coverageStart,
    coverageEnd
  });
  data.regionalSettings ||= {};
  data.regionalSettings[id] = createDefaultRegionSettings(id);

  elements.addRegionForm.reset();
  if (elements.regionCoverageStartInput) {
    elements.regionCoverageStartInput.value = "07:00";
  }
  if (elements.regionCoverageEndInput) {
    elements.regionCoverageEndInput.value = "19:00";
  }
  completeAdminSave("Region saved.");
}

function updateRegionCoverage(regionId) {
  if (!isAdminTabUnlocked("regions")) {
    return;
  }

  const startInput = elements.regionsList?.querySelector(`[data-region-coverage-start="${cssEscape(regionId)}"]`);
  const endInput = elements.regionsList?.querySelector(`[data-region-coverage-end="${cssEscape(regionId)}"]`);
  saveRegionCoverage(regionId, startInput?.value || "", endInput?.value || "", "regions");
}

function updateShiftRegionCoverage(regionId) {
  if (!isAdminTabUnlocked("shifts")) {
    return;
  }

  const startInput = elements.shiftsList?.querySelector(`[data-shift-region-coverage-start="${cssEscape(regionId)}"]`);
  const endInput = elements.shiftsList?.querySelector(`[data-shift-region-coverage-end="${cssEscape(regionId)}"]`);
  const displayStart = startInput?.value || "";
  const displayEnd = endInput?.value || "";
  if (!isValidRegionCoverageTimeRange(displayStart, displayEnd)) {
    showGenericAlert("Invalid region hours", "Region hours must be more than 0 minutes and no more than 14 hours. Overnight windows are allowed.");
    return;
  }

  const date = getScheduleReferenceDate();
  const convertedStart = convertDisplayDateTimeToEastern(date, displayStart);
  const convertedEnd = convertDisplayDateTimeToEastern(date, displayEnd);
  saveRegionCoverage(regionId, convertedStart.time, convertedEnd.time, "shifts");
}

function saveRegionCoverage(regionId, coverageStart, coverageEnd, tabName = "regions") {
  const region = data.regions.find((item) => item.id === regionId);
  if (!region) {
    return;
  }

  if (!isValidRegionCoverageTimeRange(coverageStart, coverageEnd)) {
    showGenericAlert("Invalid region hours", "Region hours must be more than 0 minutes and no more than 14 hours. Overnight windows are allowed.");
    return;
  }

  region.coverageStart = coverageStart;
  region.coverageEnd = coverageEnd;
  syncRegionCoverageShift(region.id);
  completeAdminSave("Region hours saved.", tabName);
}

function syncRegionCoverageShift(regionId, shiftTemplates = getScopedShiftTemplates(regionId)) {
  const region = getRegionById(regionId);
  if (!region) {
    return;
  }

  const coverageWindow = getRegionCoverageWindow(region.id);
  const shiftId = `${region.id}-coverage`;
  const existingShift = shiftTemplates.find((template) => template.id === shiftId);
  if (existingShift) {
    existingShift.name = `${region.name} region hours`;
    existingShift.start = coverageWindow.start;
    existingShift.end = coverageWindow.end;
    return;
  }

  shiftTemplates.unshift({
    id: shiftId,
    name: `${region.name} region hours`,
    start: coverageWindow.start,
    end: coverageWindow.end
  });
}

function isRegionCoverageShiftTemplate(template, regionId = selectedAdminRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  return Boolean(normalizedRegionId && template?.id === `${normalizedRegionId}-coverage`);
}

function getShiftTemplateMaxDurationMinutes(template, regionId = selectedAdminRegionId) {
  return isRegionCoverageShiftTemplate(template, regionId)
    ? MAX_REGION_COVERAGE_MINUTES
    : MAX_SCHEDULE_DURATION_MINUTES;
}

function toggleRegionsEnabled() {
  if (!isAdminTabUnlocked("regions")) {
    if (elements.regionsEnabledInput) {
      elements.regionsEnabledInput.checked = areRegionsEnabled();
    }
    return;
  }

  data.regionsEnabled = Boolean(elements.regionsEnabledInput?.checked);
  completeAdminSave(data.regionsEnabled ? "Regions enabled." : "Regions disabled.");
}

function removeRegion(regionId) {
  if (!isAdminTabUnlocked("regions")) {
    return;
  }

  const region = data.regions.find((item) => item.id === regionId);
  if (!region) {
    return;
  }

  showGenericConfirm("Remove region", `Remove ${region.name}?`, () => {
    data.regions = data.regions.filter((item) => item.id !== regionId);
  data.users.forEach((user) => {
    user.regionIds = (user.regionIds || []).filter((id) => id !== regionId);
  });
    data.systems.forEach((system) => {
      system.regionIds = getSystemRegionIds(system).filter((id) => id !== regionId);
      if (areRegionsEnabled() && data.regions.length > 0 && system.regionIds.length === 0) {
        system.regionIds = [data.regions[0].id];
      }
      pruneSystemCoverageToRegions(system);
    });
    delete data.regionalSettings?.[regionId];
    if (selectedAssignmentRegionId === regionId) {
      selectedAssignmentRegionId = GLOBAL_REGION_SCOPE_ID;
    }
    if (selectedAdminRegionId === regionId) {
      selectedAdminRegionId = GLOBAL_REGION_SCOPE_ID;
    }
    completeAdminSave("Region removed.");
  });
}

function toggleUserRegion(userId, regionId, checked) {
  if (!isAdminTabUnlocked("users")) {
    return;
  }

  const user = data.users.find((item) => item.id === userId);
  const region = data.regions.find((item) => item.id === regionId);
  if (!user || !region || !areRegionsEnabled()) {
    return;
  }

  user.regionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
  if (checked && !user.regionIds.includes(regionId)) {
    user.regionIds.push(regionId);
    addUserToRegionTeamOrder(regionId, userId);
  }
  if (!checked) {
    user.regionIds = user.regionIds.filter((id) => id !== regionId);
    removeUserFromRegionTeamOrder(regionId, userId);
    data.systems.forEach(pruneSystemCoverageToRegions);
  }

  completeAdminSave("User regions saved.");
}

function removeUser(userId) {
  if (!isAdminTabUnlocked("users")) {
    return;
  }

  const user = data.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  openRemoveUserModal(user);
}

function openRemoveUserModal(user) {
  if (!elements.removeUserModal) {
    performRemoveUser(user.id);
    return;
  }

  pendingRemoveUserId = user.id;
  if (elements.removeUserModalName) {
    elements.removeUserModalName.textContent = user.name;
  }
  if (elements.removeUserModalImpact) {
    elements.removeUserModalImpact.textContent = getRemoveUserImpactText(user);
  }

  elements.removeUserModal.classList.remove("hidden");
  elements.removeUserModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.cancelRemoveUserButton?.focus(), 0);
}

function closeRemoveUserModal() {
  pendingRemoveUserId = null;
  if (!elements.removeUserModal) {
    return;
  }

  elements.removeUserModal.classList.add("hidden");
  elements.removeUserModal.setAttribute("aria-hidden", "true");
}

function confirmRemoveUser() {
  if (!pendingRemoveUserId || !isAdminTabUnlocked("users")) {
    closeRemoveUserModal();
    return;
  }

  const userId = pendingRemoveUserId;
  closeRemoveUserModal();
  performRemoveUser(userId);
}

function performRemoveUser(userId) {
  const user = data.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  data.users = data.users.filter((item) => item.id !== userId);
  removeUserFromAllRegionTeamOrders(userId);
  data.exceptions = data.exceptions.filter((slot) => slot.userId !== userId);
  data.holidays = data.holidays.filter((holiday) => holiday.userId !== userId);
  Object.values(data.regionalSettings || {}).forEach((settings) => {
    settings.holidays = (settings.holidays || []).filter((holiday) => holiday.userId !== userId);
    (settings.systems || []).forEach((system) => {
      system.primaryUserIds = system.primaryUserIds.filter((id) => id !== userId);
    });
  });
  data.delegations.forEach((delegation) => {
    if (delegation.delegatorUserId === userId) {
      delegation.delegatorUserId = "";
    }
  });
  data.systems.forEach((system) => {
    system.primaryUserIds = system.primaryUserIds.filter((id) => id !== userId);
    clampQueue(system.id, GLOBAL_REGION_SCOPE_ID);
  });
  clearSelectedAssignee();
  completeAdminSave("User removed.");
}

function getRemoveUserImpactText(user) {
  const scheduleCount = user.schedules.length;
  const slotCount = data.exceptions.filter((slot) => slot.userId === user.id).length;
  const regionalSettings = Object.values(data.regionalSettings || {});
  const holidayCount = data.holidays.filter((holiday) => holiday.userId === user.id).length
    + regionalSettings.reduce((count, settings) => count + (settings.holidays || []).filter((holiday) => holiday.userId === user.id).length, 0);
  const coverageCount = data.systems.filter((system) => system.primaryUserIds.includes(user.id)).length
    + regionalSettings.reduce((count, settings) => count + (settings.systems || []).filter((system) => system.primaryUserIds.includes(user.id)).length, 0);
  const impact = [
    `${scheduleCount} schedule${scheduleCount === 1 ? "" : "s"}`,
    `${slotCount} break/extra slot${slotCount === 1 ? "" : "s"}`,
    `${holidayCount} OOO block${holidayCount === 1 ? "" : "s"}`,
    `${coverageCount} coverage mapping${coverageCount === 1 ? "" : "s"}`
  ].join(", ");

  return `This will remove ${impact}. Existing ticket history remains visible.`;
}

function moveTeamUser(userId, direction, regionId = selectedAdminRegionId) {
  if (!isAdminTabUnlocked("users")) {
    return;
  }

  const normalizedRegionId = normalizeRegionScopeId(regionId);
  if (normalizedRegionId) {
    const regionUsers = getRankedUsersForRegionScope(normalizedRegionId);
    const currentIndex = regionUsers.findIndex((user) => user.id === userId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= regionUsers.length) {
      return;
    }

    const orderIds = regionUsers.map((user) => user.id);
    [orderIds[currentIndex], orderIds[nextIndex]] = [orderIds[nextIndex], orderIds[currentIndex]];
    setRegionTeamOrderIds(normalizedRegionId, orderIds);
    completeAdminSave(`${getRegionScopeLabel(normalizedRegionId)} team ranking updated.`);
    return;
  }

  const currentIndex = data.users.findIndex((user) => user.id === userId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= data.users.length) {
    return;
  }

  const [user] = data.users.splice(currentIndex, 1);
  data.users.splice(nextIndex, 0, user);
  completeAdminSave("Team hierarchy updated.");
}

function applyShiftTemplate() {
  const template = getShiftTemplate(elements.shiftTemplateSelect.value);
  if (!template || elements.shiftTemplateSelect.value === "custom") {
    return;
  }

  const date = getScheduleReferenceDate();
  elements.scheduleStartInput.value = formatEasternTimeInputForDisplay(date, template.start);
  elements.scheduleEndInput.value = formatEasternTimeInputForDisplay(date, template.end);
  updateForwardTimeInputConstraints();
}

function renderScheduleFormMode() {
  const isEditing = Boolean(editingSchedule);
  if (elements.scheduleFormTitle) {
    elements.scheduleFormTitle.textContent = isEditing ? "Update schedule" : "Add schedule";
  }
  if (elements.scheduleSubmitButton) {
    elements.scheduleSubmitButton.textContent = isEditing ? "Update schedule" : "Add schedule";
  }
  elements.cancelScheduleEditButton?.classList.toggle("hidden", !isEditing);
}

function cancelScheduleEdit() {
  editingSchedule = null;
  syncScheduleDateRangeToGraphWeek();
  renderScheduleFormMode();
}

function addSchedule(event) {
  event.preventDefault();
  const user = data.users.find((item) => item.id === elements.scheduleUserSelect.value);
  if (!user) {
    showGenericAlert("Missing user", "Add a user before adding a schedule.");
    return;
  }

  const days = [...elements.dayCheckboxes.querySelectorAll("input:checked")].map((input) => input.value);
  if (days.length === 0) {
    showGenericAlert("Missing days", "Choose at least one day.");
    return;
  }

  const displayStart = elements.scheduleStartInput.value;
  const displayEnd = elements.scheduleEndInput.value;
  if (!isValidScheduleTimeRange(displayStart, displayEnd)) {
    showGenericAlert("Invalid time", "Schedule duration must be 12 hours or less. Overnight schedules are allowed.");
    return;
  }

  const date = getScheduleReferenceDate();
  const convertedStart = convertDisplayDateTimeToEastern(date, displayStart);
  const convertedEnd = convertDisplayDateTimeToEastern(date, displayEnd);
  if (!isValidScheduleTimeRange(convertedStart.time, convertedEnd.time)) {
    showGenericAlert("Invalid time", "Schedule duration must be 12 hours or less in Eastern Time.");
    return;
  }

  const start = convertedStart.time;
  const end = convertedEnd.time;
  const startDayOffset = getDateOffset(date, convertedStart.date);
  const endDayOffset = getDateOffset(date, convertedEnd.date);
  const dateRange = getScheduleDateRangeFromForm();
  if (!dateRange) {
    return;
  }

  if (editingSchedule) {
    updateSchedule(user, days, start, end, dateRange, { startDayOffset, endDayOffset });
    return;
  }

  const conflictDays = getScheduleDayConflicts(user, days, dateRange);
  if (conflictDays.length > 0) {
    showGenericAlert("Schedule conflict", formatScheduleConflictMessage(user, conflictDays));
    return;
  }

  user.schedules.push({
    id: makeRecordId("schedule"),
    shiftType: elements.shiftTemplateSelect.value,
    days,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    start,
    end,
    startDayOffset,
    endDayOffset
  });

  completeAdminSave("Schedule saved.");
}

function updateSchedule(user, days, start, end, dateRange, dayOffsets = {}) {
  const originalUser = data.users.find((item) => item.id === editingSchedule.userId);
  const schedule = originalUser?.schedules.find((item) => item.id === editingSchedule.scheduleId);
  if (!schedule) {
    editingSchedule = null;
    renderScheduleFormMode();
    showGenericAlert("Schedule gone", "This schedule no longer exists.");
    return;
  }

  const ignoredScheduleId = user.id === originalUser.id ? schedule.id : null;
  const conflictDays = getScheduleDayConflicts(user, days, dateRange, ignoredScheduleId);
  if (conflictDays.length > 0) {
    showGenericAlert("Schedule conflict", formatScheduleConflictMessage(user, conflictDays));
    return;
  }

  const updatedSchedule = {
    ...schedule,
    shiftType: elements.shiftTemplateSelect.value,
    days,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    start,
    end,
    startDayOffset: dayOffsets.startDayOffset ?? getScheduleStartDayOffset(schedule, originalUser),
    endDayOffset: dayOffsets.endDayOffset ?? getScheduleEndDayOffset(schedule, originalUser)
  };

  if (user.id === originalUser.id) {
    Object.assign(schedule, updatedSchedule);
  } else {
    originalUser.schedules = originalUser.schedules.filter((item) => item.id !== schedule.id);
    user.schedules.push(updatedSchedule);
  }

  editingSchedule = null;
  completeAdminSave("Schedule updated.");
}

function getScheduleDateRangeFromForm() {
  normalizeScheduleDateRangeInputs("start");
  const startDate = elements.scheduleStartDateInput?.value || "";
  const endDate = elements.scheduleEndDateInput?.value || "";
  if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
    showGenericAlert("Invalid dates", "Choose valid schedule dates.");
    return null;
  }

  if (!isForwardDateRange(startDate, endDate)) {
    showGenericAlert("Invalid dates", "Schedule dates must go from older to newer.");
    return null;
  }

  return { startDate, endDate };
}

function removeSchedule(userId, scheduleId, date = getScheduleReferenceDate()) {
  const user = data.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  const schedule = user.schedules.find((item) => item.id === scheduleId);
  if (!schedule) {
    return;
  }

  openRemoveScheduleModal(user, schedule, date);
}

function openRemoveScheduleModal(user, schedule, date) {
  if (!elements.removeScheduleModal) {
    performRemoveScheduleDay(user.id, schedule.id, date);
    return;
  }

  pendingRemoveSchedule = { userId: user.id, scheduleId: schedule.id, date };
  const scheduleDayCount = Array.isArray(schedule.days) ? schedule.days.length : 0;
  const hasMultipleDays = scheduleDayCount > 1;
  if (elements.removeScheduleModalName) {
    elements.removeScheduleModalName.textContent = formatRemoveScheduleName(user, schedule, date);
  }
  if (elements.removeScheduleModalImpact) {
    const day = getDayNameFromDate(date);
    const days = getScheduleDaySummary(schedule);
    elements.removeScheduleModalImpact.textContent = hasMultipleDays
      ? `${day} only removes that weekday from this saved schedule. Remove schedule removes the full saved date range across ${days}. Existing ticket history stays unchanged.`
      : "This removes the saved schedule. Existing ticket history stays unchanged.";
  }
  if (elements.removeScheduleDayButton) {
    elements.removeScheduleDayButton.textContent = `Remove ${getDayNameFromDate(date).slice(0, 3)} only`;
    elements.removeScheduleDayButton.classList.toggle("hidden", !hasMultipleDays);
  }
  if (elements.removeScheduleAllButton) {
    elements.removeScheduleAllButton.textContent = hasMultipleDays
      ? "Remove schedule"
      : "Remove schedule";
  }

  elements.removeScheduleModal.classList.remove("hidden");
  elements.removeScheduleModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.cancelRemoveScheduleButton?.focus(), 0);
}

function closeRemoveScheduleModal() {
  pendingRemoveSchedule = null;
  if (!elements.removeScheduleModal) {
    return;
  }

  elements.removeScheduleModal.classList.add("hidden");
  elements.removeScheduleModal.setAttribute("aria-hidden", "true");
}

function confirmRemoveScheduleDay() {
  if (!pendingRemoveSchedule) {
    closeRemoveScheduleModal();
    return;
  }

  const { userId, scheduleId, date } = pendingRemoveSchedule;
  closeRemoveScheduleModal();
  performRemoveScheduleDay(userId, scheduleId, date);
}

function confirmRemoveScheduleAll() {
  if (!pendingRemoveSchedule) {
    closeRemoveScheduleModal();
    return;
  }

  const { userId, scheduleId } = pendingRemoveSchedule;
  closeRemoveScheduleModal();
  performRemoveScheduleAll(userId, scheduleId);
}

function performRemoveScheduleDay(userId, scheduleId, date) {
  const user = data.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  const schedule = user.schedules.find((item) => item.id === scheduleId);
  if (!schedule) {
    return;
  }

  const day = getDayNameFromDate(date);
  schedule.days = Array.isArray(schedule.days)
    ? schedule.days.filter((item) => item !== day)
    : [];

  if (schedule.days.length === 0) {
    user.schedules = user.schedules.filter((item) => item.id !== scheduleId);
  }
  clearScheduleEditIfNeeded(scheduleId);

  completeAdminSave("Schedule updated.");
}

function performRemoveScheduleAll(userId, scheduleId) {
  const user = data.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  user.schedules = user.schedules.filter((schedule) => schedule.id !== scheduleId);
  clearScheduleEditIfNeeded(scheduleId);
  completeAdminSave("Schedule removed.");
}

function clearScheduleEditIfNeeded(scheduleId) {
  if (editingSchedule?.scheduleId === scheduleId) {
    editingSchedule = null;
  }
}

function formatRemoveScheduleName(user, schedule, date) {
  const abbreviation = getSelectedTimezoneAbbreviationForDate(date);
  const startDate = getScheduleEndpointDate(date, schedule, "start", user);
  const endDate = getScheduleEndpointDate(date, schedule, "end", user);
  const start = formatEasternTimeInputForDisplay(startDate, schedule.start);
  const end = formatEasternTimeInputForDisplay(endDate, schedule.end);
  const days = getScheduleDaySummary(schedule);
  return `${user.name} · ${getScheduleDateRangeSummary(schedule)} · ${days} · ${start}–${end} ${abbreviation}`;
}

function getScheduleDaySummary(schedule) {
  return Array.isArray(schedule.days) && schedule.days.length > 0
    ? schedule.days.map((day) => day.slice(0, 3)).join(", ")
    : "No days";
}

function getScheduleDateRangeSummary(schedule) {
  const startDate = getScheduleStartDate(schedule);
  const endDate = getScheduleEndDate(schedule);
  if (startDate === "0001-01-01" && endDate === "9999-12-31") {
    return "All dates";
  }

  if (startDate === endDate) {
    return formatDisplayDate(startDate);
  }

  return `${formatDisplayDate(startDate)}–${formatDisplayDate(endDate)}`;
}

function removeTimelineSlot(slotId) {
  data.exceptions = data.exceptions.filter((slot) => slot.id !== slotId);
  completeAdminSave("Change removed.");
}

function startTimelineDraft(event) {
  if (elements.scheduleViewSelect?.value === "week" || event.button !== 0 || event.target.closest("button")) {
    return;
  }

  const lane = event.target.closest(".graph-lane");
  if (!lane) {
    return;
  }

  event.preventDefault();
  const pointerMinutes = getTimelineMinutesFromPointer(lane, event.clientX);
  const isDraftTarget = Boolean(event.target.closest(".graph-block.draft, .graph-edge-label.draft"));
  const existingDraft = getTimelineDraft(lane.dataset.userId, lane.dataset.date);
  const canMoveDraft = isDraftTarget
    && existingDraft;

  if (canMoveDraft) {
    const draftRange = getGraphBlockRange(existingDraft);
    timelineDrag = {
      mode: "move",
      draftId: existingDraft.id,
      pointerId: event.pointerId,
      lane,
      userId: lane.dataset.userId,
      date: lane.dataset.date,
      durationMinutes: Math.max(draftRange ? draftRange.end - draftRange.start : SLOT_MINUTES, SLOT_MINUTES),
      pointerOffsetMinutes: pointerMinutes - (draftRange?.start ?? pointerMinutes)
    };
    lane.classList.add("moving-draft");
    renderLiveDraftOverlay(lane);
  } else {
    timelineDrag = {
      mode: "create",
      draftId: existingDraft?.id || makeRecordId("draft"),
      pointerId: event.pointerId,
      lane,
      userId: lane.dataset.userId,
      date: lane.dataset.date,
      anchorMinutes: pointerMinutes
    };
  }

  lane.setPointerCapture?.(event.pointerId);
  updateTimelineDraftFromDrag(pointerMinutes);
}

function moveTimelineDraft(event) {
  if (!timelineDrag || event.pointerId !== timelineDrag.pointerId) {
    return;
  }

  event.preventDefault();
  updateTimelineDraftFromDrag(getTimelineMinutesFromPointer(timelineDrag.lane, event.clientX));
}

function finishTimelineDraft(event) {
  if (!timelineDrag || event.pointerId !== timelineDrag.pointerId) {
    return;
  }

  timelineDrag.lane.releasePointerCapture?.(event.pointerId);
  timelineDrag.lane.classList.remove("moving-draft");
  timelineDrag = null;
  renderTimelineTools();
}

function updateTimelineDraftFromDrag(currentMinutes) {
  const range = timelineDrag.mode === "move"
    ? normalizeMovedTimelineDraftRange(currentMinutes, timelineDrag.pointerOffsetMinutes, timelineDrag.durationMinutes)
    : normalizeTimelineDraftRange(timelineDrag.anchorMinutes, currentMinutes);
  const sourceDate = getGraphDateForMinutes(timelineDrag.date, range.start);
  upsertTimelineDraft({
    id: timelineDrag.draftId,
    userId: timelineDrag.userId,
    date: timelineDrag.date,
    sourceDate,
    start: graphMinutesToTime(range.start),
    end: graphMinutesToTime(range.end)
  });

  renderTimelineDraftActions();
  renderLiveDraftOverlay(timelineDrag.lane);
}

function renderLiveDraftOverlay(lane) {
  lane.querySelectorAll("[data-live-draft], .graph-edge-label.draft, .graph-block.draft").forEach((element) => element.remove());
  const draft = getTimelineDraft(lane.dataset.userId, lane.dataset.date);
  if (!draft) {
    lane.classList.remove("has-draft");
    return;
  }

  lane.classList.add("has-draft");
  lane.querySelectorAll(".graph-empty").forEach((element) => element.remove());
  const wrapper = document.createElement("span");
  wrapper.dataset.liveDraft = "true";
  wrapper.innerHTML = graphDraftBlock(draft.userId, draft.date);
  lane.append(wrapper);
}

function getTimelineDraft(userId, date) {
  return timelineDrafts.find((draft) => draft.userId === userId && draft.date === date);
}

function upsertTimelineDraft(draft) {
  const existingIndex = timelineDrafts.findIndex((item) => (
    item.id === draft.id || (item.userId === draft.userId && item.date === draft.date)
  ));

  if (existingIndex >= 0) {
    timelineDrafts[existingIndex] = { ...timelineDrafts[existingIndex], ...draft };
    return;
  }

  timelineDrafts.push(draft);
}

function normalizeTimelineDraftRange(anchorMinutes, currentMinutes) {
  const graphRange = getScheduleGraphTimeRange();
  const first = Math.min(anchorMinutes, currentMinutes);
  const last = Math.max(anchorMinutes, currentMinutes);
  const start = Math.min(Math.max(first, graphRange.start), graphRange.end - SLOT_MINUTES);
  const end = Math.min(Math.max(last, start + SLOT_MINUTES), graphRange.end);
  return { start, end };
}

function normalizeMovedTimelineDraftRange(currentMinutes, pointerOffsetMinutes, durationMinutes) {
  const graphRange = getScheduleGraphTimeRange();
  const duration = Math.min(Math.max(durationMinutes, SLOT_MINUTES), graphRange.duration);
  const maxStart = graphRange.end - duration;
  const rawStart = currentMinutes - pointerOffsetMinutes;
  const start = Math.min(Math.max(roundToNearestSlot(rawStart), graphRange.start), maxStart);
  return { start, end: start + duration };
}

function getTimelineMinutesFromPointer(lane, clientX) {
  const graphRange = getScheduleGraphTimeRange();
  const rect = lane.getBoundingClientRect();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  const rawMinutes = graphRange.start + ratio * graphRange.duration;
  return Math.min(Math.max(roundToNearestSlot(rawMinutes), graphRange.start), graphRange.end);
}

function renderTimelineDraftActions() {
  if (!elements.timelineDraftActions) {
    return;
  }

  if (timelineDrafts.length === 0) {
    elements.timelineDraftActions.classList.add("hidden");
    if (elements.timelineDraftTitle) {
      elements.timelineDraftTitle.textContent = "";
    }
    if (elements.timelineDraftMeta) {
      elements.timelineDraftMeta.textContent = "";
    }
    return;
  }

  const draftSummaries = timelineDrafts.map((draft) => formatTimelineDraftSummary(draft));
  elements.timelineDraftActions.classList.remove("hidden");
  if (elements.timelineDraftTitle) {
    elements.timelineDraftTitle.textContent = timelineDrafts.length === 1
      ? "Draft schedule"
      : `${timelineDrafts.length} draft schedules`;
  }
  if (elements.timelineDraftMeta) {
    elements.timelineDraftMeta.textContent = draftSummaries.join(" · ");
  }
  if (elements.saveTimelineDraftButton) {
    elements.saveTimelineDraftButton.textContent = timelineDrafts.length === 1 ? "Save schedule" : "Save schedules";
  }
  if (elements.clearTimelineDraftButton) {
    elements.clearTimelineDraftButton.textContent = timelineDrafts.length === 1 ? "Clear" : "Clear all";
  }
}

function saveTimelineDraftSchedule() {
  if (timelineDrafts.length === 0) {
    return;
  }

  const conflict = getTimelineDraftScheduleConflict();

  if (conflict) {
    showGenericAlert("Schedule conflict", formatScheduleConflictMessage(conflict.user, conflict.conflictDays));
    return;
  }

  let savedCount = 0;
  timelineDrafts.forEach((draft) => {
    const user = data.users.find((item) => item.id === draft.userId);
    if (!user) {
      return;
    }

    const sourceDate = draft.sourceDate || draft.date;
    user.schedules.push({
      id: makeRecordId("schedule"),
      shiftType: "custom",
      days: [getDayNameFromDate(sourceDate)],
      startDate: sourceDate,
      endDate: sourceDate,
      start: draft.start,
      end: draft.end
    });
    savedCount += 1;
  });

  timelineDrafts = [];
  completeAdminSave(savedCount === 1 ? "Schedule saved." : "Schedules saved.");
}

function clearTimelineDraft() {
  timelineDrafts = [];
  renderTimelineTools();
}

function formatTimelineDraftSummary(draft) {
  const user = data.users.find((item) => item.id === draft.userId);
  const sourceDate = draft.sourceDate || draft.date;
  const abbreviation = getSelectedTimezoneAbbreviationForDate(sourceDate);
  const start = formatEasternTimeInputForDisplay(sourceDate, draft.start);
  const endDate = toMinutes(draft.end) <= toMinutes(draft.start)
    ? formatDate(addDays(parseDate(sourceDate), 1))
    : sourceDate;
  const end = formatEasternTimeInputForDisplay(endDate, draft.end);
  return `${user?.name || "Removed user"} · ${getDayNameFromDate(sourceDate).slice(0, 3)} · ${start}–${end} ${abbreviation}`;
}

function getScheduleDayConflicts(user, days, dateRange, ignoredScheduleId = null) {
  const proposedRange = dateRange || { startDate: "0001-01-01", endDate: "9999-12-31" };
  const businessDays = Array.from(new Set(days.filter((day) => SCHEDULE_DAYS.includes(day))));
  return businessDays.filter((day) => user.schedules.some((schedule) => (
    schedule.id !== ignoredScheduleId
      && Array.isArray(schedule.days)
      && schedule.days.includes(day)
      && scheduleDateRangesOverlap(schedule, proposedRange)
  )));
}

function scheduleDateRangesOverlap(schedule, dateRange) {
  const scheduleStart = getScheduleStartDate(schedule);
  const scheduleEnd = getScheduleEndDate(schedule);
  return scheduleStart <= dateRange.endDate && dateRange.startDate <= scheduleEnd;
}

function getScheduleStartDate(schedule) {
  return isValidDateInput(schedule?.startDate || "") ? schedule.startDate : "0001-01-01";
}

function getScheduleEndDate(schedule) {
  return isValidDateInput(schedule?.endDate || "") ? schedule.endDate : "9999-12-31";
}

function getTimelineDraftScheduleConflict() {
  const proposedDaysByUser = new Map();
  for (const draft of timelineDrafts) {
    const user = data.users.find((item) => item.id === draft.userId);
    if (!user) {
      continue;
    }

    const sourceDate = draft.sourceDate || draft.date;
    const day = getDayNameFromDate(sourceDate);
    const draftDateRange = { startDate: sourceDate, endDate: sourceDate };
    const existingConflicts = getScheduleDayConflicts(user, [day], draftDateRange);
    if (existingConflicts.length > 0) {
      return { user, conflictDays: existingConflicts };
    }

    if (!SCHEDULE_DAYS.includes(day)) {
      continue;
    }

    const proposedDays = proposedDaysByUser.get(user.id) || new Set();
    const proposedKey = `${sourceDate}:${day}`;
    if (proposedDays.has(proposedKey)) {
      return { user, conflictDays: [day] };
    }

    proposedDays.add(proposedKey);
    proposedDaysByUser.set(user.id, proposedDays);
  }

  return null;
}

function formatScheduleConflictMessage(user, conflictDays) {
  const days = conflictDays.map((day) => day.slice(0, 3)).join(", ");
  return `${user.name} already has a schedule in this date range for ${days}. Update the existing schedule or choose another date range.`;
}

function prefillSlotFromTimeline(event) {
  const removeButton = event.target.closest("[data-action='remove-schedule']");
  if (removeButton) {
    removeSchedule(removeButton.dataset.userId, removeButton.dataset.scheduleId, removeButton.dataset.date);
    return;
  }

  const removeSlotButton = event.target.closest("[data-action='remove-slot']");
  if (removeSlotButton) {
    removeTimelineSlot(removeSlotButton.dataset.slotId);
    return;
  }

  const weekCell = event.target.closest(".week-cell");
  if (weekCell) {
    const editButton = event.target.closest("[data-action='edit-schedule']");
    if (editButton) {
      editScheduleFromGraph(editButton.dataset.userId, editButton.dataset.scheduleId, editButton.dataset.date);
      return;
    }

    const template = getShiftTemplate(elements.shiftTemplateSelect?.value)
      || getDefaultQuickShiftTemplateForUser(weekCell.dataset.userId)
      || getShiftTemplate("regular");
    prefillScheduleForm(weekCell.dataset.userId, weekCell.dataset.date, template?.start || "09:00", template?.end || "17:00", false);
    return;
  }
}

function editScheduleFromGraph(userId, scheduleId, date) {
  const user = data.users.find((item) => item.id === userId);
  const schedule = user?.schedules.find((item) => item.id === scheduleId);
  if (!user || !schedule) {
    return;
  }

  prefillScheduleForm(userId, date, schedule.start, schedule.end, false, {
    scheduleId,
    schedule,
    days: schedule.days,
    shiftType: schedule.shiftType,
    startDate: isValidDateInput(schedule.startDate || "") ? schedule.startDate : getWeekDates(date)[0],
    endDate: isValidDateInput(schedule.endDate || "") ? schedule.endDate : getWeekDates(date)[4]
  });
}

function prefillScheduleForm(userId, date, start, end, forceCustom, options = {}) {
  const user = data.users.find((item) => item.id === userId);
  const displayStartDate = options.schedule ? getScheduleEndpointDate(date, options.schedule, "start", user) : date;
  const displayEndDate = options.schedule ? getScheduleEndpointDate(date, options.schedule, "end", user) : date;
  const displayStart = formatEasternTimeInputForDisplay(displayStartDate, start);
  const displayEnd = formatEasternTimeInputForDisplay(displayEndDate, end);
  editingSchedule = options.scheduleId ? { userId, scheduleId: options.scheduleId } : null;
  const weekDates = getWeekDates(date);
  const startDate = options.startDate ? getBusinessWeekRange(options.startDate).startDate : weekDates[0];
  const endDate = options.endDate ? getBusinessWeekRange(options.endDate).endDate : weekDates[4];

  if (elements.scheduleUserSelect) {
    elements.scheduleUserSelect.value = userId;
  }

  if (elements.shiftTemplateSelect) {
    const quickShiftOptions = getCurrentQuickShiftOptionsFromSelect();
    const optionValues = quickShiftOptions.map((quickShiftOption) => quickShiftOption.value);
    const preferredValue = getPreferredQuickShiftValue(options.shiftType || "", userId, quickShiftOptions);
    if (optionValues.includes(preferredValue)) {
      elements.shiftTemplateSelect.value = preferredValue;
    } else if (forceCustom) {
      elements.shiftTemplateSelect.value = "custom";
    } else {
      elements.shiftTemplateSelect.value = "custom";
    }
  }

  if (elements.scheduleStartDateInput) {
    elements.scheduleStartDateInput.value = startDate;
  }

  if (elements.scheduleEndDateInput) {
    elements.scheduleEndDateInput.value = endDate;
  }

  if (elements.scheduleStartInput) {
    elements.scheduleStartInput.value = displayStart;
  }

  if (elements.scheduleEndInput) {
    elements.scheduleEndInput.value = displayEnd;
  }

  selectScheduleDays(options.days || [getDayNameFromDate(date)]);
  updateScheduleRangeConstraints();
  renderScheduleFormMode();
}

function selectScheduleDays(days) {
  if (!elements.dayCheckboxes) {
    return;
  }

  const selectedDays = new Set(days);
  elements.dayCheckboxes.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = selectedDays.has(checkbox.value);
  });
}

function addDelegationSlot(event) {
  event.preventDefault();

  const displayStart = elements.delegationStartInput.value;
  const displayEnd = elements.delegationEndInput.value;
  if (!isForwardTimeRange(displayStart, displayEnd)) {
    showGenericAlert("Invalid time", "Coverage slot times must stay older-to-newer on the same local day.");
    return;
  }

  if (!isSlotAlignedTimeRange(displayStart, displayEnd)) {
    showGenericAlert("Invalid time", `Coverage slots use ${SLOT_MINUTES}-minute increments.`);
    return;
  }

  const date = getDelegationReferenceDate();
  const convertedStart = convertDisplayDateTimeToEastern(date, displayStart);
  const convertedEnd = convertDisplayDateTimeToEastern(date, displayEnd);
  if (!isSameDayForwardEasternRange(convertedStart, convertedEnd)) {
    showGenericAlert("Invalid time", "Coverage slot times must stay older-to-newer on the same Eastern day.");
    return;
  }

  const start = convertedStart.time;
  const end = convertedEnd.time;
  const slotLabel = formatDelegationSlotTimeRange({ start, end });
  const slot = {
    id: makeId(`delegation-${start}-${end}`, (data.delegationSlots || []).map((item) => item.id)),
    name: slotLabel,
    start,
    end
  };
  const overlap = getDelegationSlotDefinitionOverlap(slot);
  if (overlap) {
    showGenericAlert("Slot overlap", `This coverage slot overlaps ${formatDelegationSlotDefinition(overlap)}.`);
    return;
  }

  data.delegationSlots.push(slot);
  advanceDelegationFormAfterSave(displayEnd);
  completeAdminSave("Coverage slot saved.");
}

function saveDelegationAssignmentBoard() {
  const selects = Array.from(getDelegationAssignmentContainer()?.querySelectorAll(".delegation-owner-select") || []);
  if (selects.length === 0) {
    showGenericAlert("No slots", "Create time slots before assigning delegation ownership.");
    return;
  }

  const visibleAssignments = selects
    .map((select) => ({
      select,
      slot: getDelegationSlotById(select.dataset.slotId),
      date: select.dataset.date || ""
    }))
    .filter((assignment) => assignment.slot && isValidDateInput(assignment.date));

  if (visibleAssignments.length === 0) {
    showGenericAlert("No slots", "Create time slots before assigning delegation ownership.");
    return;
  }

  const invalidAssignment = visibleAssignments
    .map(({ select, slot, date }) => {
      const user = getUserFromReference(select.value);
      return {
        select,
        slot,
        date,
        user,
        eligibility: user ? getDelegatorAssignmentEligibility(user, slot, date) : { selectable: true, reason: "" }
      };
    })
    .find(({ user, eligibility }) => user && !eligibility.selectable);
  if (invalidAssignment) {
    showGenericAlert("Delegator unavailable", formatDelegatorUnavailableMessage(invalidAssignment));
    invalidAssignment.select.focus();
    return;
  }

  data.delegations = data.delegations.filter((delegation) => (
    !visibleAssignments.some(({ slot, date }) => isDelegationForSlotDate(delegation, slot, date))
  ));

  visibleAssignments.forEach(({ select, slot, date }) => {
    const delegatorUserId = data.users.some((user) => user.id === select.value) ? select.value : "";
    data.delegations.push({
      id: makeRecordId("delegation"),
      delegatorUserId,
      systemId: "",
      slotId: slot.id,
      slotName: formatDelegationSlotTimeRange(slot),
      date,
      start: slot.start,
      end: slot.end,
      timezoneId: "et",
      timeZone: EASTERN_TIME_ZONE,
      timezoneLabel: "Eastern (New York)",
      note: ""
    });
  });

  completeAdminSave("Delegation ownership saved.");
}

function removeDelegationSlot(slotId) {
  const slot = getDelegationSlotById(slotId);
  if (!slot) {
    return;
  }

  showGenericConfirm("Delete coverage slot", `Delete ${formatDelegationSlotDefinition(slot)}? Existing scheduled assignments keep their saved time.`, () => {
    data.delegationSlots = data.delegationSlots.filter((item) => item.id !== slotId);
    data.delegations.forEach((delegation) => {
      if (delegation.slotId === slotId) {
        delegation.slotId = "";
      }
    });
    completeAdminSave("Coverage slot deleted.");
  });
}

function getSortedDelegations(delegations) {
  return delegations
    .slice()
    .sort(compareDelegationsByStart);
}

function getCurrentDelegations(easternNow) {
  return getSortedDelegations(data.delegations)
    .filter((delegation) => isDelegationActive(delegation, easternNow));
}

function compareDelegationsByStart(left, right) {
  return getDelegationInstant(left, "start").getTime() - getDelegationInstant(right, "start").getTime()
    || getDelegationUserName(left).localeCompare(getDelegationUserName(right))
    || getDelegationSystemName(left).localeCompare(getDelegationSystemName(right));
}

function getDelegationStatus(delegation, easternNow) {
  if (isDelegationActive(delegation, easternNow)) {
    return { status: "active", label: "Current" };
  }

  if (isDelegationPast(delegation, easternNow)) {
    return { status: "past", label: "Past" };
  }

  return { status: "upcoming", label: "Upcoming" };
}

function isDelegationActive(delegation, easternNow) {
  const now = zonedWallTimeToDate(easternNow.date, easternNow.time, EASTERN_TIME_ZONE).getTime();
  return getDelegationInstant(delegation, "start").getTime() <= now
    && now < getDelegationInstant(delegation, "end").getTime();
}

function isDelegationPast(delegation, easternNow) {
  const now = zonedWallTimeToDate(easternNow.date, easternNow.time, EASTERN_TIME_ZONE).getTime();
  return getDelegationInstant(delegation, "end").getTime() <= now;
}

function getDelegationUserName(delegation) {
  if (!delegation.delegatorUserId) {
    return "Unassigned";
  }

  return data.users.find((user) => user.id === delegation.delegatorUserId)?.name || "Removed user";
}

function getDelegationSystemName(delegation) {
  if (!delegation.systemId) {
    return "All coverage";
  }

  return data.systems.find((system) => system.id === delegation.systemId)?.name || "Removed coverage";
}

function formatDelegationSlotTimeRange(delegation) {
  return `${delegation.start}–${delegation.end}`;
}

function formatDelegationSlotDisplayTimeRange(slot, date = getDelegationReferenceDate()) {
  return formatTimeRangeForDisplay(date, slot.start, slot.end, EASTERN_TIME_ZONE);
}

function formatDelegationRecordDisplayTimeRange(delegation) {
  return formatTimeRangeForDisplay(delegation.date, delegation.start, delegation.end, getDelegationTimezone(delegation).timeZone);
}

function formatTimeRangeForDisplay(date, start, end, sourceTimeZone = EASTERN_TIME_ZONE) {
  return `${formatTimeInputForDisplay(date, start, sourceTimeZone)}–${formatTimeInputForDisplay(date, end, sourceTimeZone)}`;
}

function formatDelegationSlotDefinition(slot) {
  return formatDelegationSlotDefinitionForDate(slot, getDelegationReferenceDate());
}

function formatDelegationSlotDefinitionForDate(slot, date) {
  const abbreviation = getSelectedTimezoneAbbreviationForEasternTime(date, slot.start);
  return `${formatDelegationSlotDisplayTimeRange(slot, date)} ${abbreviation}`;
}

function getDelegatorAssignmentEligibility(user, slot, date) {
  if (!user || !slot || !isValidDateInput(date) || !isValidTimeRange(slot.start, slot.end)) {
    return { selectable: false, reason: "Invalid slot" };
  }

  const holidays = getHolidaysForUser(user.id, date);
  if (holidays.length > 0) {
    const holidayLabel = holidays.map((holiday) => holiday.name || "OOO").join(", ");
    return { selectable: false, reason: `OOO: ${holidayLabel}` };
  }

  const windows = getScheduleWindowsForDate(user, date, getDayNameFromDate(date));
  const slotStart = toMinutes(slot.start);
  const slotEnd = toMinutes(slot.end);
  if (!isTimeRangeCoveredByWindows(slotStart, slotEnd, windows)) {
    return { selectable: false, reason: formatDelegatorScheduleCoverageReason(windows, date) };
  }

  const overlappingBreak = getDelegatorOverlappingBreak(user, slot, date);
  if (overlappingBreak) {
    return {
      selectable: false,
      reason: `OOO ${formatTimeRangeForDisplay(date, overlappingBreak.start, overlappingBreak.end, EASTERN_TIME_ZONE)} overlaps this slot`
    };
  }

  return { selectable: true, reason: "" };
}

function isTimeRangeCoveredByWindows(startMinutes, endMinutes, windows) {
  let coveredUntil = startMinutes;
  const sortedWindows = windows
    .slice()
    .sort((left, right) => toMinutes(left.start) - toMinutes(right.start));

  for (const window of sortedWindows) {
    const windowStart = toMinutes(window.start);
    const windowEnd = toMinutes(window.end);
    if (windowEnd <= coveredUntil) {
      continue;
    }
    if (windowStart > coveredUntil) {
      return false;
    }

    coveredUntil = Math.max(coveredUntil, windowEnd);
    if (coveredUntil >= endMinutes) {
      return true;
    }
  }

  return false;
}

function formatDelegatorScheduleCoverageReason(windows, date) {
  if (windows.length === 0) {
    return "Not scheduled";
  }

  const scheduleLabel = windows
    .map((window) => formatTimeRangeForDisplay(date, window.start, window.end, EASTERN_TIME_ZONE))
    .join(", ");
  return `Only scheduled ${scheduleLabel}`;
}

function getDelegatorOverlappingBreak(user, slot, date) {
  const regularBreak = data.exceptions.find((exception) => (
    exception.userId === user.id
      && exception.date === date
      && exception.type === "break"
      && isValidTimeRange(exception.start, exception.end)
      && delegationSlotsOverlap(exception, slot)
  ));
  if (regularBreak) {
    return regularBreak;
  }

  return getTimedOooBlocksForUser(user.id, date).find((oooBlock) => delegationSlotsOverlap(oooBlock, slot)) || null;
}

function formatDelegatorUnavailableMessage({ slot, date, user, eligibility }) {
  const slotLabel = `${formatDelegationSlotDefinitionForDate(slot, date)} on ${formatDisplayDate(date)}`;
  return `${user.name} cannot be assigned to ${slotLabel}. ${eligibility.reason}. Choose someone scheduled for the full slot or leave it unassigned.`;
}

function getDelegationSlotById(slotId) {
  return data.delegationSlots.find((slot) => slot.id === slotId) || null;
}

function getSortedDelegationSlots(slots = data.delegationSlots) {
  return slots
    .slice()
    .sort(compareDelegationSlots);
}

function compareDelegationSlots(left, right) {
  return toMinutes(left.start) - toMinutes(right.start)
    || toMinutes(left.end) - toMinutes(right.end)
    || left.id.localeCompare(right.id);
}

function getDelegationSlotDefinitionOverlap(nextSlot) {
  return data.delegationSlots.find((slot) => (
    slot.id !== nextSlot.id
      && delegationSlotsOverlap(slot, nextSlot)
  ));
}

function getDelegationForSlotDate(slot, date) {
  return data.delegations.find((delegation) => isDelegationForSlotDate(delegation, slot, date)) || null;
}

function isDelegationForSlotDate(delegation, slot, date) {
  return Boolean(slot)
    && delegation.date === date
    && (
      delegation.slotId === slot.id
        || (!delegation.slotId && delegation.start === slot.start && delegation.end === slot.end)
    );
}

function delegationSlotsOverlap(left, right) {
  return toMinutes(left.start) < toMinutes(right.end)
    && toMinutes(right.start) < toMinutes(left.end);
}

function getDelegationInstant(delegation, boundary) {
  const timezone = getDelegationTimezone(delegation);
  const time = boundary === "end" ? delegation.end : delegation.start;
  return zonedWallTimeToDate(delegation.date, time, timezone.timeZone);
}

function getDelegationTimezone(delegation) {
  const timezoneId = delegation.timezoneId || delegation.timeZoneId;
  const byId = timezoneId
    ? getDisplayTimezones().find((timezone) => timezone.id === timezoneId)
      || AVAILABLE_TIMEZONES.find((timezone) => timezone.id === timezoneId)
    : null;
  const byZone = delegation.timeZone
    ? getDisplayTimezones().find((timezone) => timezone.timeZone === delegation.timeZone)
      || AVAILABLE_TIMEZONES.find((timezone) => timezone.timeZone === delegation.timeZone)
    : null;
  return byId || byZone || {
    id: timezoneId || "et",
    timeZone: delegation.timeZone || EASTERN_TIME_ZONE,
    label: delegation.timezoneLabel || "Eastern (New York)"
  };
}

function isSlotAlignedTimeRange(start, end) {
  return toMinutes(start) % SLOT_MINUTES === 0 && toMinutes(end) % SLOT_MINUTES === 0;
}

function advanceDelegationFormAfterSave(previousEnd) {
  const nextStartMinutes = toMinutes(previousEnd);
  if (!elements.delegationStartInput || !elements.delegationEndInput || nextStartMinutes >= TIMELINE_END_MINUTES) {
    return;
  }

  const nextEndMinutes = Math.min(nextStartMinutes + SLOT_MINUTES, TIMELINE_END_MINUTES);
  if (nextStartMinutes < nextEndMinutes) {
    elements.delegationStartInput.value = minutesToTime(nextStartMinutes);
    elements.delegationEndInput.value = minutesToTime(nextEndMinutes);
  }
}

function addSystem(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("systems")) {
    return;
  }

  const name = elements.systemNameInput.value.trim();
  if (!name) {
    return;
  }

  const id = makeId(name, data.systems.map((system) => system.id));
  const system = {
    id,
    name,
    regionIds: getDefaultSystemRegionIds(selectedAdminRegionId),
    primaryUserIds: [],
    serviceNowConfigItem: ""
  };
  data.systems.push(system);
  ensureSystemQueues(system);
  elements.addSystemForm.reset();
  completeAdminSave("System saved.");
}

function updateSystemServiceNowConfigItem(systemId, value) {
  if (!isAdminTabUnlocked("systems")) {
    return;
  }

  const system = data.systems.find((item) => item.id === systemId);
  if (!system) {
    return;
  }

  system.serviceNowConfigItem = String(value || "").trim();
  completeAdminSave("ServiceNow config item saved.");
}

function removeSystem(systemId) {
  if (!isAdminTabUnlocked("systems")) {
    return;
  }

  const system = data.systems.find((item) => item.id === systemId);
  if (!system) {
    return;
  }

  const title = selectedAdminRegionId ? "Remove system from region" : "Remove system";
  const message = selectedAdminRegionId
    ? `Remove ${system.name} from ${getRegionScopeLabel(selectedAdminRegionId)}? Other selected regions stay attached.`
    : `Remove ${system.name}?`;
  showGenericConfirm(title, message, () => {
    if (selectedAdminRegionId) {
      removeSystemFromRegion(system, selectedAdminRegionId);
      if (getSystemRegionIds(system).length === 0) {
        data.systems = data.systems.filter((item) => item.id !== systemId);
      }
    } else {
      data.systems = data.systems.filter((item) => item.id !== systemId);
      data.regions.forEach((region) => {
        delete getScopedQueues(region.id)[systemId];
      });
      delete data.queues[systemId];
    }
    clearSelectedAssignee();
    completeAdminSave("System removed.");
  });
}

function toggleSystemRegion(systemId, regionId, checked) {
  if (!isAdminTabUnlocked("systems")) {
    return;
  }

  const system = data.systems.find((item) => item.id === systemId);
  const region = data.regions.find((item) => item.id === regionId);
  if (!system || !region || !areRegionsEnabled()) {
    renderSystems();
    return;
  }

  const regionIds = getSystemRegionIds(system);
  if (checked && !regionIds.includes(regionId)) {
    system.regionIds = regionIds.concat(regionId);
    getScopedQueues(regionId)[system.id] ??= 0;
  }

  if (!checked) {
    if (regionIds.length <= 1) {
      showGenericAlert("Region required", "Each system must have at least one region selected.");
      renderSystems();
      return;
    }
    system.regionIds = regionIds.filter((id) => id !== regionId);
    delete getScopedQueues(regionId)[system.id];
  }

  pruneSystemCoverageToRegions(system);
  getSystemRegionIds(system).forEach((id) => clampQueue(system.id, id));
  clearSelectedAssignee();
  completeAdminSave("System regions saved.", "systems");
}

function toggleCoverage(systemId, userId, checked) {
  if (!isAdminTabUnlocked("systems")) {
    return;
  }

  const system = data.systems.find((item) => item.id === systemId);
  if (!system) {
    return;
  }
  const user = data.users.find((item) => item.id === userId);
  if (checked && (!user || !userBelongsToAnyRegion(user, getSystemRegionIds(system)))) {
    showGenericAlert("User outside system regions", "Pick users from the selected system regions.");
    renderSystems();
    return;
  }

  if (checked && !system.primaryUserIds.includes(userId)) {
    system.primaryUserIds.push(userId);
  }

  if (!checked) {
    system.primaryUserIds = system.primaryUserIds.filter((id) => id !== userId);
  }

  getSystemRegionIds(system).forEach((regionId) => clampQueue(systemId, regionId));
  clearSelectedAssignee();
  completeAdminSave("Coverage mapping saved.");
}

function moveCoveredUser(systemId, userId, direction) {
  if (!isAdminTabUnlocked("systems")) {
    return;
  }

  const system = data.systems.find((item) => item.id === systemId);
  if (!system) {
    return;
  }

  const currentIndex = system.primaryUserIds.indexOf(userId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= system.primaryUserIds.length) {
    return;
  }

  [system.primaryUserIds[currentIndex], system.primaryUserIds[nextIndex]] = [system.primaryUserIds[nextIndex], system.primaryUserIds[currentIndex]];
  getSystemRegionIds(system).forEach((regionId) => clampQueue(systemId, regionId));
  clearSelectedAssignee();
  completeAdminSave("System priority saved.");
}

function removeCoveredUser(systemId, userId) {
  if (!isAdminTabUnlocked("systems")) {
    return;
  }

  const system = data.systems.find((item) => item.id === systemId);
  if (!system || !system.primaryUserIds.includes(userId)) {
    return;
  }

  system.primaryUserIds = system.primaryUserIds.filter((id) => id !== userId);
  getSystemRegionIds(system).forEach((regionId) => clampQueue(systemId, regionId));
  if (selectedAssigneeId === userId) {
    clearSelectedAssignee();
  }
  if (selectedOtherAssigneeId === userId) {
    selectedOtherAssigneeId = null;
  }
  completeAdminSave("Coverage user removed.");
}

function addHoliday(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("holidays")) {
    return;
  }

  if (!elements.holidayDateInput.value) {
    showGenericAlert("Missing date", "Choose an OOO date.");
    return;
  }

  const holidayTarget = getHolidayTargetFromSelectValue(elements.holidayUserSelect.value);
  if (!holidayTarget) {
    showGenericAlert("Missing user", "Choose a specific user, or pick a region before adding OOO for all users.");
    return;
  }

  const oooType = elements.holidayTypeSelect?.value === OOO_TYPE_TIME ? OOO_TYPE_TIME : OOO_TYPE_ALL_DAY;
  const name = elements.holidayNameInput.value.trim() || "OOO";
  const startDate = elements.holidayDateInput.value;
  const endDate = oooType === OOO_TYPE_TIME
    ? startDate
    : elements.holidayEndDateInput?.value || startDate;
  if (!isForwardDateRange(startDate, endDate)) {
    showGenericAlert("Invalid date range", "OOO end date cannot be before the start date.");
    return;
  }

  const holiday = {
    id: makeRecordId("holiday"),
    userId: holidayTarget.userId,
    date: startDate,
    name,
    type: oooType
  };
  if (oooType === OOO_TYPE_TIME) {
    const displayStart = elements.holidayStartInput?.value || "";
    const displayEnd = elements.holidayEndInput?.value || "";
    if (!isForwardTimeRange(displayStart, displayEnd)) {
      showGenericAlert("Invalid time", "OOO start time must be earlier than end time.");
      return;
    }

    const start = convertDisplayDateTimeToEastern(elements.holidayDateInput.value, displayStart);
    const end = convertDisplayDateTimeToEastern(elements.holidayDateInput.value, displayEnd);
    if (!isSameDayForwardEasternRange(start, end)) {
      showGenericAlert("Invalid time", "OOO time blocks must stay older-to-newer on the same Eastern day.");
      return;
    }

    holiday.date = start.date;
    holiday.start = start.time;
    holiday.end = end.time;
  } else if (endDate !== startDate) {
    holiday.endDate = endDate;
  }
  getHolidayTargetList(holidayTarget).push(holiday);

  elements.holidayNameInput.value = "";
  if (elements.holidayEndDateInput) {
    elements.holidayEndDateInput.value = elements.holidayDateInput.value;
  }
  completeAdminSave("OOO saved.");
}

function removeHoliday(holidayId, regionId = selectedAdminRegionId) {
  if (!isAdminTabUnlocked("holidays")) {
    return;
  }

  const normalizedRegionId = normalizeRegionScopeId(regionId);
  const holiday = getScopedHolidays(normalizedRegionId).find((item) => item.id === holidayId);
  if (!holiday) {
    return;
  }

  openRemoveHolidayModal(holiday, normalizedRegionId);
}

function openRemoveHolidayModal(holiday, regionId = selectedAdminRegionId) {
  if (!elements.removeHolidayModal) {
    performRemoveHoliday(holiday.id, regionId);
    return;
  }

  pendingRemoveHolidayId = holiday.id;
  pendingRemoveHolidayRegionId = normalizeRegionScopeId(regionId);
  if (elements.removeHolidayModalName) {
    elements.removeHolidayModalName.textContent = formatOooRecordLabel(holiday);
  }
  if (elements.removeHolidayModalImpact) {
    const userName = getHolidayUserName(holiday, regionId);
    const scopeText = holiday.userId === GLOBAL_HOLIDAY_USER_ID
      ? userName.toLowerCase()
      : userName;
    elements.removeHolidayModalImpact.textContent = `This removes the OOO block for ${scopeText}. Availability will update immediately.`;
  }

  elements.removeHolidayModal.classList.remove("hidden");
  elements.removeHolidayModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.cancelRemoveHolidayButton?.focus(), 0);
}

function closeRemoveHolidayModal() {
  pendingRemoveHolidayId = null;
  pendingRemoveHolidayRegionId = GLOBAL_REGION_SCOPE_ID;
  if (!elements.removeHolidayModal) {
    return;
  }

  elements.removeHolidayModal.classList.add("hidden");
  elements.removeHolidayModal.setAttribute("aria-hidden", "true");
}

function confirmRemoveHoliday() {
  if (!pendingRemoveHolidayId || !isAdminTabUnlocked("holidays")) {
    closeRemoveHolidayModal();
    return;
  }

  const holidayId = pendingRemoveHolidayId;
  const regionId = pendingRemoveHolidayRegionId;
  closeRemoveHolidayModal();
  performRemoveHoliday(holidayId, regionId);
}

function performRemoveHoliday(holidayId, regionId = selectedAdminRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  setScopedHolidays(normalizedRegionId, getScopedHolidays(normalizedRegionId).filter((holiday) => holiday.id !== holidayId));
  completeAdminSave("OOO removed.");
}

function getHolidayTargetFromSelectValue(value) {
  if (!value) {
    return null;
  }

  if (value.startsWith(REGION_HOLIDAY_USER_PREFIX)) {
    const regionId = normalizeRegionScopeId(value.slice(REGION_HOLIDAY_USER_PREFIX.length));
    return regionId
      ? { userId: GLOBAL_HOLIDAY_USER_ID, regionId }
      : null;
  }

  if (value === GLOBAL_HOLIDAY_USER_ID) {
    if (areRegionsEnabled() && !selectedAdminRegionId) {
      return null;
    }

    return { userId: GLOBAL_HOLIDAY_USER_ID, regionId: selectedAdminRegionId };
  }

  return data.users.some((user) => user.id === value)
    ? { userId: value, regionId: GLOBAL_REGION_SCOPE_ID }
    : null;
}

function getHolidayTargetList(target) {
  if (target.userId === GLOBAL_HOLIDAY_USER_ID || !areRegionsEnabled()) {
    return getScopedHolidays(target.regionId);
  }

  return data.holidays;
}

function getHolidayUserName(holiday, regionId = selectedAdminRegionId) {
  if (holiday.userId === GLOBAL_HOLIDAY_USER_ID) {
    return normalizeRegionScopeId(regionId)
      ? `All users in ${getRegionScopeLabel(regionId)}`
      : "All users";
  }

  return data.users.find((user) => user.id === holiday.userId)?.name || "Removed user";
}

function formatHolidayDate(date) {
  return isValidDateInput(date || "") ? formatDisplayDate(date) : date || "No date";
}

function getOooEndDate(record) {
  return isValidDateInput(record?.endDate || "") && (record.endDate >= record.date)
    ? record.endDate
    : record?.date || "";
}

function isOooRecordActiveOnDate(record, date) {
  if (!isValidDateInput(date || "") || !isValidDateInput(record?.date || "")) {
    return false;
  }

  if (isTimedOooRecord(record)) {
    return record.date === date;
  }

  return record.date <= date && date <= getOooEndDate(record);
}

function formatOooDateRange(record) {
  const startDate = record?.date || "";
  const endDate = getOooEndDate(record);
  if (!endDate || startDate === endDate) {
    return formatHolidayDate(startDate);
  }

  return `${formatHolidayDate(startDate)}–${formatHolidayDate(endDate)}`;
}

function getOooType(record) {
  return isTimedOooRecord(record) ? OOO_TYPE_TIME : OOO_TYPE_ALL_DAY;
}

function isTimedOooRecord(record) {
  if (record?.type === OOO_TYPE_ALL_DAY) {
    return false;
  }

  return record?.type === OOO_TYPE_TIME
    || record?.allDay === false
    || (isValidTimeInput(record?.start || "") && isValidTimeInput(record?.end || ""));
}

function isAllDayOooRecord(record) {
  return !isTimedOooRecord(record);
}

function formatOooRecordLabel(record) {
  const name = record.name || "OOO";
  if (isTimedOooRecord(record)) {
    const displayDate = getZonedDateTimeParts(
      zonedWallTimeToDate(record.date, record.start, EASTERN_TIME_ZONE),
      getSelectedDisplayTimezone().timeZone
    ).date;
    const abbreviation = getSelectedTimezoneAbbreviationForEasternTime(record.date, record.start);
    const start = formatEasternTimeInputForDisplay(record.date, record.start);
    const end = formatEasternTimeInputForDisplay(record.date, record.end);
    return `${formatHolidayDate(displayDate)} · ${start}–${end} ${abbreviation} · ${name}`;
  }

  return `${formatOooDateRange(record)} · All day · ${name}`;
}

function compareOooRecords(left, right) {
  return (left.date || "").localeCompare(right.date || "")
    || getOooEndDate(left).localeCompare(getOooEndDate(right))
    || toMinutes(left.start || "00:00") - toMinutes(right.start || "00:00")
    || (left.name || "").localeCompare(right.name || "");
}

function markSelectedAssigned(options = {}) {
  const easternNow = getEasternNow();
  const queueState = getQueueState(getAssignmentQueueSystemId(), easternNow, selectedAssignmentRegionId);
  const selectedRow = queueState.rows.find((row) => row.user.id === selectedAssigneeId);
  if (!queueState.system || !selectedRow || !selectedRow.selectable) {
    return;
  }

  const assignmentRow = selectedRow.isOther ? getSelectedOtherRosterRow(queueState) : selectedRow;
  if (!assignmentRow) {
    return;
  }

  if (!options.skipLongWaitConfirmation && shouldConfirmLongWaitAssignment(assignmentRow)) {
    showLongWaitAssignmentSpeedBump(assignmentRow, () => markSelectedAssigned({ skipLongWaitConfirmation: true }));
    return;
  }

  const assignmentRecord = {
    id: makeRecordId("assignment"),
    assignedAt: new Date().toISOString(),
    devMode: isDevModeAssignmentActive(),
    easternDate: queueState.effectiveNow.date,
    easternTime: queueState.effectiveNow.date === easternNow.date
      ? easternNow.time
      : minutesToTime(assignmentRow.availabilityStart),
    systemId: queueState.system.id,
    systemName: queueState.system.name,
    regionId: queueState.regionId,
    regionName: getRegionScopeLabel(queueState.regionId),
    serviceNowConfigItem: String(queueState.system.serviceNowConfigItem || "").trim(),
    userId: assignmentRow.user.id,
    userName: assignmentRow.user.name
  };
  data.assignmentLog.push(assignmentRecord);
  lastAssignmentId = assignmentRecord.id;
  const shouldCollectServiceNowDetails = shouldCollectServiceNowIncidentDetails();

  const originalIndex = queueState.system.primaryUserIds.indexOf(assignmentRow.user.id);
  if (!selectedRow.isOther && originalIndex >= 0) {
    getScopedQueues(queueState.regionId)[queueState.system.id] = (originalIndex + 1) % queueState.system.primaryUserIds.length;
  }

  clearSelectedAssignee();
  completeDataSave("Ticket assigned.", {
    showToast: false,
    onSaved: () => {
      if (shouldCollectServiceNowDetails) {
        openServiceNowIncidentModal(assignmentRecord.id);
      }
    }
  });
}

function shouldCollectServiceNowIncidentDetails() {
  const config = getIncidentConfig();
  return config.enabled && config.mode === "servicenow";
}

function shouldConfirmLongWaitAssignment(row) {
  return row.status === "later"
    && Number.isFinite(row.waitMinutes)
    && row.waitMinutes > LONG_FUTURE_ASSIGNMENT_MINUTES;
}

function showLongWaitAssignmentSpeedBump(row, onConfirm) {
  const availableAt = `${formatDisplayDate(row.effectiveDate)} at ${formatEasternTimeForDisplay(row.effectiveDate, minutesToTime(row.availabilityStart))}`;
  const message = `${row.user.name} is scheduled to be online in ${formatWaitDuration(row.waitMinutes)} (${availableAt}). This task can be assigned now, but they will not be online until then.`;
  showGenericConfirm("Assign future task?", message, onConfirm, {
    cancelLabel: "Choose someone else",
    confirmLabel: "Assign task anyway",
    confirmClass: "primary-button",
    variant: "assignment-speed-bump"
  });
}

function getQueueState(systemId, easternNow, regionId = selectedAssignmentRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  const system = getAssignmentSystemById(systemId, normalizedRegionId);
  if (!system) {
    return { system: null, rows: [], otherRows: [], recommendedRow: null, effectiveNow: easternNow };
  }

  const effectiveNow = getEffectiveQueueNow(easternNow, normalizedRegionId);
  const isShiftQueue = system.id === SHIFT_QUEUE_SYSTEM_ID;
  const allRows = getQueueUserRowsForSystem(system, easternNow, effectiveNow, isShiftQueue, normalizedRegionId);
  const otherRows = isShiftQueue ? [] : getGlobalRosterRows(easternNow, effectiveNow, system.primaryUserIds, normalizedRegionId);
  const rows = isShiftQueue
    ? allRows
    : allRows.filter((row) => row.isCoverageMember).concat(getOtherQueueRow(otherRows, effectiveNow, selectedOtherAssigneeId));

  const recommendedRow = rows.find((row) => row.selectable) || null;

  return { system, rows, otherRows, recommendedRow, effectiveNow, regionId: normalizedRegionId };
}

function getQueueUserRowsForSystem(system, easternNow, effectiveNow, isShiftQueue = false, regionId = selectedAssignmentRegionId) {
  return getRankedUsersForRegionScope(regionId).map((user) => {
    const systemPriority = isShiftQueue ? -1 : system.primaryUserIds.indexOf(user.id);
    const isCoverageMember = isShiftQueue || systemPriority >= 0;
    const queuePriority = isShiftQueue ? Number.POSITIVE_INFINITY : getRotatedQueuePriority(system, systemPriority, regionId);
    return buildQueueUserRow(user, easternNow, effectiveNow, systemPriority, queuePriority, isCoverageMember, regionId);
  }).sort(compareQueueRows);
}

function getGlobalRosterRows(easternNow, effectiveNow, excludedUserIds = [], regionId = selectedAssignmentRegionId) {
  const excludedIds = new Set(excludedUserIds);
  return getRankedUsersForRegionScope(regionId)
    .filter((user) => !excludedIds.has(user.id))
    .map((user) => (
      buildQueueUserRow(user, easternNow, effectiveNow, -1, Number.POSITIVE_INFINITY, true, regionId)
    ))
    .sort(compareOtherRosterRows);
}

function buildQueueUserRow(user, easternNow, effectiveNow, systemPriority, queuePriority, isCoverageMember, regionId = selectedAssignmentRegionId) {
  const status = getEffectiveQueueUserStatus(user, easternNow, effectiveNow, regionId);
  const waitMinutes = getAvailabilityWaitMinutes(easternNow, effectiveNow, status);
  const metrics = getAssignmentMetrics(user, systemPriority, queuePriority, effectiveNow, status, waitMinutes, regionId);
  return { user, isCoverageMember, effectiveDate: effectiveNow.date, effectiveDay: effectiveNow.day, ...status, ...metrics };
}

function getEffectiveQueueUserStatus(user, easternNow, effectiveNow, regionId = selectedAssignmentRegionId) {
  const status = getUserStatus(user, effectiveNow, regionId);
  if (status.status !== "available" || !isFutureQueueTime(easternNow, effectiveNow)) {
    return status;
  }

  return {
    ...status,
    status: "later",
    badge: "Later",
    message: "Scheduled for future availability. You can pick them anyway."
  };
}

function isFutureQueueTime(referenceNow, effectiveNow) {
  const dayOffset = getDateOffset(referenceNow.date, effectiveNow.date);
  return dayOffset > 0 || (dayOffset === 0 && effectiveNow.minutes > referenceNow.minutes);
}

function getOtherQueueRow(otherRows, effectiveNow, selectedOtherUserId = null) {
  const selectedRosterRow = otherRows.find((row) => row.user.id === selectedOtherUserId && row.selectable)
    || otherRows.find((row) => row.selectable)
    || null;
  return {
    isOther: true,
    user: { id: OTHER_QUEUE_USER_ID, name: OTHER_QUEUE_USER_NAME },
    isCoverageMember: true,
    effectiveDate: selectedRosterRow?.effectiveDate || effectiveNow.date,
    effectiveDay: selectedRosterRow?.effectiveDay || effectiveNow.day,
    status: selectedRosterRow?.status || "unavailable",
    badge: selectedRosterRow ? "Roster" : "No roster",
    selectable: Boolean(selectedRosterRow),
    availabilityStart: selectedRosterRow?.availabilityStart ?? Number.POSITIVE_INFINITY,
    message: selectedRosterRow
      ? `${selectedRosterRow.user.name} · ${formatOtherRosterAvailability(selectedRosterRow)}.`
      : "No one outside this queue.",
    waitMinutes: selectedRosterRow?.waitMinutes ?? Number.POSITIVE_INFINITY,
    dailyTickets: 0,
    consecutiveTickets: 0,
    lastTicketToday: Number.NEGATIVE_INFINITY,
    systemPriority: Number.POSITIVE_INFINITY,
    queuePriority: Number.POSITIVE_INFINITY,
    teamPriority: Number.POSITIVE_INFINITY,
    scheduleStart: selectedRosterRow?.scheduleStart ?? Number.POSITIVE_INFINITY
  };
}

function getAssignmentSystemById(systemId, regionId = selectedAssignmentRegionId) {
  if (systemId === SHIFT_QUEUE_SYSTEM_ID) {
    return { id: SHIFT_QUEUE_SYSTEM_ID, name: SHIFT_QUEUE_SYSTEM_NAME, primaryUserIds: [] };
  }

  return getScopedSystems(regionId).find((item) => item.id === systemId) || null;
}

function getRotatedQueuePriority(system, systemPriority, regionId = selectedAssignmentRegionId) {
  if (!system.primaryUserIds.length || systemPriority < 0) {
    return Number.POSITIVE_INFINITY;
  }

  const queueIndex = getQueueIndex(system, regionId);
  return (systemPriority - queueIndex + system.primaryUserIds.length) % system.primaryUserIds.length;
}

function getAssignmentMetrics(user, systemPriority, queuePriority, easternNow, status, waitMinutes, regionId = selectedAssignmentRegionId) {
  return {
    systemPriority: systemPriority >= 0 ? systemPriority : Number.POSITIVE_INFINITY,
    queuePriority,
    teamPriority: getTeamPriority(user.id, regionId),
    currentMinutes: easternNow.minutes,
    scheduleStart: status.availabilityStart,
    waitMinutes,
    dailyTickets: getDailyAssignmentCount(user, easternNow.date),
    consecutiveTickets: getConsecutiveAssignmentCount(user, easternNow.date),
    lastTicketToday: getLastAssignmentTimestampForUserOnDate(user, easternNow.date)
  };
}

function compareQueueRows(left, right) {
  const statusDifference = getQueueStatusRank(left) - getQueueStatusRank(right);
  if (statusDifference !== 0) {
    return statusDifference;
  }

  const preset = getAssignmentRulePreset(getScopedAssignmentRules(selectedAssignmentRegionId)?.preset);
  for (const rule of preset.rules) {
    const difference = compareQueueRowsByRule(left, right, rule);
    if (difference !== 0) {
      return difference;
    }
  }

  return left.user.name.localeCompare(right.user.name);
}

function compareOtherRosterRows(left, right) {
  const statusDifference = getQueueStatusRank(left) - getQueueStatusRank(right);
  if (statusDifference !== 0) {
    return statusDifference;
  }

  if (left.status === "available" && right.status === "available") {
    const teamDifference = compareFiniteNumbers(left.teamPriority, right.teamPriority);
    return teamDifference || left.user.name.localeCompare(right.user.name);
  }

  if (left.status === "later" && right.status === "later") {
    const scheduleDifference = compareFiniteNumbers(left.scheduleStart, right.scheduleStart);
    const teamDifference = compareFiniteNumbers(left.teamPriority, right.teamPriority);
    return scheduleDifference || teamDifference || left.user.name.localeCompare(right.user.name);
  }

  const teamDifference = compareFiniteNumbers(left.teamPriority, right.teamPriority);
  return teamDifference || left.user.name.localeCompare(right.user.name);
}

function compareQueueRowsByRule(left, right, rule) {
  if (rule === "schedule") {
    return compareFiniteNumbers(left.scheduleStart, right.scheduleStart);
  }

  if (rule === "queuePriority") {
    if (!shouldCompareCoverageQueue(left, right)) {
      return 0;
    }

    return compareFiniteNumbers(left.queuePriority, right.queuePriority);
  }

  if (rule === "dailyTickets") {
    return left.dailyTickets - right.dailyTickets;
  }

  if (rule === "consecutiveTickets") {
    return left.consecutiveTickets - right.consecutiveTickets;
  }

  if (rule === "lastTicketToday") {
    if (left.status !== "available" || right.status !== "available") {
      return 0;
    }

    return left.lastTicketToday - right.lastTicketToday;
  }

  if (rule === "teamPriority") {
    return compareFiniteNumbers(left.teamPriority, right.teamPriority);
  }

  return 0;
}

function shouldCompareCoverageQueue(left, right) {
  return left.status === "available"
    && right.status === "available"
    && (Number.isFinite(left.queuePriority) || Number.isFinite(right.queuePriority));
}

function getTeamPriority(userId, regionId = GLOBAL_REGION_SCOPE_ID) {
  const index = getRankedUsersForRegionScope(regionId).findIndex((user) => user.id === userId);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

function getQueueStatusRank(row) {
  if (row.status === "available") {
    return 0;
  }

  if (row.status === "later") {
    return 1;
  }

  return 2;
}

function getEffectiveQueueNow(easternNow, regionId = selectedAssignmentRegionId) {
  const users = getUsersForRegionScope(regionId);
  if (users.some((user) => getUserStatus(user, easternNow, regionId).selectable)) {
    return easternNow;
  }

  for (let offset = 1; offset <= 21; offset += 1) {
    const date = formatDate(addDays(parseDate(easternNow.date), offset));
    const nextStart = getEarliestQueueAvailabilityStart(date, regionId);
    if (nextStart !== null) {
      const candidateNow = buildEasternNow(date, minutesToTime(nextStart));
      if (users.some((user) => getUserStatus(user, candidateNow, regionId).selectable)) {
        return candidateNow;
      }
    }
  }

  return easternNow;
}

function getEarliestQueueAvailabilityStart(date, regionId = selectedAssignmentRegionId) {
  const day = getDayNameFromDate(date);
  const starts = getUsersForRegionScope(regionId).flatMap((user) => (
    getScheduleWindowsForDate(user, date, day)
      .map((window) => toMinutes(window.start))
      .filter((start) => Number.isFinite(start))
  ));

  return starts.length > 0 ? Math.min(...starts) : null;
}

function getAvailabilityWaitMinutes(referenceNow, effectiveNow, status) {
  if (!Number.isFinite(status.availabilityStart)) {
    return Number.POSITIVE_INFINITY;
  }

  const dayOffset = getDateOffset(referenceNow.date, effectiveNow.date);
  const minutesUntilAvailable = dayOffset * 24 * 60 + status.availabilityStart - referenceNow.minutes;
  return Math.max(0, minutesUntilAvailable);
}

function compareFiniteNumbers(left, right) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function getDailyTicketRankings(date) {
  return data.users
    .map((user) => {
      const assignments = getAssignmentsForUserOnDate(user, date)
        .sort((left, right) => getAssignmentTimestamp(left) - getAssignmentTimestamp(right));
      const reachedEntry = assignments.at(-1);
      const reachedAt = reachedEntry?.assignedAt || "";

      return {
        user,
        count: assignments.length,
        reachedAt,
        reachedTime: reachedEntry?.easternTime || "",
        reachedTimestamp: getAssignmentTimestamp(reachedEntry)
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.reachedTimestamp - right.reachedTimestamp || left.user.name.localeCompare(right.user.name));
}

function getAssignmentTimestamp(entry) {
  const instant = getAssignmentInstant(entry);
  return instant ? instant.getTime() : Number.POSITIVE_INFINITY;
}

function getRecentAssignments() {
  const cutoff = Date.now() - RECENT_ASSIGNMENTS_WINDOW_MS;
  return data.assignmentLog
    .filter((entry) => getAssignmentCreatedTimestamp(entry) >= cutoff)
    .sort((left, right) => getAssignmentCreatedTimestamp(left) - getAssignmentCreatedTimestamp(right));
}

function getAssignmentCreatedTimestamp(entry) {
  const instant = entry?.assignedAt ? new Date(entry.assignedAt) : getAssignmentInstant(entry);
  return instant && !Number.isNaN(instant.getTime()) ? instant.getTime() : Number.NEGATIVE_INFINITY;
}

function getAssignmentInstant(entry) {
  if (isValidDateInput(entry?.easternDate || "") && isValidTimeInput(entry?.easternTime || "")) {
    return zonedWallTimeToDate(entry.easternDate, entry.easternTime, EASTERN_TIME_ZONE);
  }

  if (!entry?.assignedAt) {
    return null;
  }

  const instant = new Date(entry.assignedAt);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

function getDailyAssignmentCount(userOrId, date) {
  const user = getUserFromReference(userOrId);
  return user ? getAssignmentsForUserOnDate(user, date).length : 0;
}

function getLastAssignmentTimestampForUserOnDate(user, date) {
  const assignments = getAssignmentsForUserOnDate(user, date);
  if (assignments.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return Math.max(...assignments.map(getAssignmentTimestamp));
}

function getDailyCoverageAssignmentCount(system, date, regionId = GLOBAL_REGION_SCOPE_ID) {
  return data.assignmentLog.filter((entry) => (
    getAssignmentEntryDate(entry) === date && isAssignmentForSystem(entry, system, regionId)
  )).length;
}

function getConsecutiveAssignmentCount(userOrId, date) {
  const user = getUserFromReference(userOrId);
  if (!user) {
    return 0;
  }

  let count = 0;
  for (const entry of data.assignmentLog.slice().reverse()) {
    if (getAssignmentEntryDate(entry) !== date) {
      continue;
    }

    if (!isAssignmentForUser(entry, user)) {
      break;
    }

    count += 1;
  }

  return count;
}

function getAssignmentsForUserOnDate(user, date) {
  return data.assignmentLog.filter((entry) => (
    getAssignmentEntryDate(entry) === date && isAssignmentForUser(entry, user)
  ));
}

function isAssignmentForSystem(entry, system, regionId = GLOBAL_REGION_SCOPE_ID) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  if ((entry.regionId || GLOBAL_REGION_SCOPE_ID) !== normalizedRegionId) {
    return false;
  }

  return entry.systemId === system.id || (!entry.systemId && entry.systemName === system.name);
}

function getAssignmentEntryDate(entry) {
  if (isValidDateInput(entry?.easternDate || "")) {
    return entry.easternDate;
  }

  if (!entry?.assignedAt) {
    return "";
  }

  const assignedAt = new Date(entry.assignedAt);
  if (Number.isNaN(assignedAt.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(assignedAt);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isAssignmentForUser(entry, user) {
  if (entry?.userId === user.id) {
    return true;
  }

  const entryUserStillExists = data.users.some((item) => item.id === entry?.userId);
  return !entryUserStillExists && normalizeComparableText(entry?.userName) === normalizeComparableText(user.name);
}

function getUserFromReference(userOrId) {
  if (typeof userOrId === "string") {
    return data.users.find((user) => user.id === userOrId) || null;
  }

  return userOrId || null;
}

function normalizeComparableText(value) {
  return String(value || "").trim().toLowerCase();
}

function getOrdinalLabel(number) {
  const remainder = number % 100;
  if (remainder >= 11 && remainder <= 13) {
    return `${number}th`;
  }

  const suffixes = { 1: "st", 2: "nd", 3: "rd" };
  return `${number}${suffixes[number % 10] || "th"}`;
}

function getUserStatus(user, easternNow, regionId = GLOBAL_REGION_SCOPE_ID) {
  const holidayMatches = getHolidaysForUser(user.id, easternNow.date, regionId);
  if (holidayMatches.length > 0) {
    return {
      status: "holiday",
      badge: "OOO",
      selectable: false,
      availabilityStart: Number.POSITIVE_INFINITY,
      message: `OOO today: ${holidayMatches.map((holiday) => holiday.name || "OOO").join(", ")}.`
    };
  }

  const windows = getScheduleWindowsForDate(user, easternNow.date, easternNow.day);
  const breaks = data.exceptions
    .filter((slot) => slot.userId === user.id && slot.date === easternNow.date && slot.type === "break")
    .concat(getTimedOooBlocksForUser(user.id, easternNow.date, regionId))
    .map((slot) => ({ ...slot, startMinutes: toMinutes(slot.start), endMinutes: toMinutes(slot.end) }))
    .sort((left, right) => left.startMinutes - right.startMinutes);

  const currentBreak = breaks.find((slot) => isWithinWindow(easternNow.minutes, slot.startMinutes, slot.endMinutes));
  if (currentBreak) {
    const nextStart = findNextAvailableStart(easternNow.minutes, windows, breaks);
    if (nextStart !== null) {
      const nextStartDisplay = formatEasternTimeForDisplay(easternNow.date, minutesToTime(nextStart));
      return {
        status: "later",
        badge: "OOO",
        selectable: true,
        availabilityStart: nextStart,
        message: `Currently OOO${currentBreak.name || currentBreak.reason ? ` (${currentBreak.name || currentBreak.reason})` : ""}. Back at ${nextStartDisplay}. You can pick them anyway.`
      };
    }
  }

  const currentWindow = windows.find((window) => isWithinWindow(easternNow.minutes, toMinutes(window.start), toMinutes(window.end)));
  if (currentWindow && !currentBreak) {
    const endDisplay = formatEasternTimeForDisplay(easternNow.date, currentWindow.end);
    return {
      status: "available",
      badge: currentWindow.source === "extra" ? "Extra slot" : "Available",
      selectable: true,
      availabilityStart: easternNow.minutes,
      message: currentWindow.source === "extra"
        ? `Available now via extra coverage slot until ${endDisplay}.`
        : `Available now until ${endDisplay}.`
    };
  }

  const nextStart = findNextAvailableStart(easternNow.minutes, windows, breaks);
  if (nextStart !== null) {
    const nextStartDisplay = formatEasternTimeForDisplay(easternNow.date, minutesToTime(nextStart));
    return {
      status: "later",
      badge: "Later today",
      selectable: true,
      availabilityStart: nextStart,
      message: `Not online yet. Scheduled to log in at ${nextStartDisplay}. You can pick them anyway.`
    };
  }

  if (windows.length > 0) {
    const latestEnd = Math.max(...windows.map((window) => toMinutes(window.end)));
    const latestEndDisplay = formatEasternTimeForDisplay(easternNow.date, minutesToTime(latestEnd));
    return {
      status: "unavailable",
      badge: "Done today",
      selectable: false,
      availabilityStart: Number.POSITIVE_INFINITY,
      message: `No remaining availability today. Last scheduled end was ${latestEndDisplay}.`
    };
  }

  return {
    status: "unavailable",
    badge: "Not scheduled",
    selectable: false,
    availabilityStart: Number.POSITIVE_INFINITY,
    message: "Not scheduled today."
  };
}

function getScheduleWindowsForDate(user, date, day) {
  const scheduleWindows = user.schedules
    .flatMap((schedule) => getScheduleWindowsForScheduleOnDate(schedule, user, date, day));

  const extraWindows = data.exceptions
    .filter((slot) => slot.userId === user.id && slot.date === date && slot.type === "extra")
    .map((slot) => ({ id: slot.id, source: "extra", start: slot.start, end: slot.end, priority: Number.MAX_SAFE_INTEGER }));

  return scheduleWindows
    .concat(extraWindows)
    .filter((window) => isValidTimeRange(window.start, window.end))
    .sort((left, right) => toMinutes(left.start) - toMinutes(right.start));
}

function getScheduleWindowsForScheduleOnDate(schedule, user, date, day = getDayNameFromDate(date)) {
  if (!isValidScheduleTimeRange(schedule.start, schedule.end)) {
    return [];
  }

  const startOffset = getScheduleStartDayOffset(schedule, user);
  const endOffset = getScheduleEndDayOffset(schedule, user);
  const candidateDates = Array.from(new Set([
    formatDate(addDays(parseDate(date), -startOffset)),
    formatDate(addDays(parseDate(date), -endOffset))
  ]));
  const windows = [];
  candidateDates.forEach((scheduleDate) => {
    if (!isScheduleActiveOnDate(schedule, scheduleDate, getDayNameFromDate(scheduleDate))) {
      return;
    }

    const startDate = getScheduleEndpointDate(scheduleDate, schedule, "start", user);
    const endDate = getScheduleEndpointDate(scheduleDate, schedule, "end", user);
    if (startDate === endDate && date === startDate) {
      windows.push({
        id: schedule.id,
        source: "schedule",
        start: schedule.start,
        end: schedule.end,
        removeDate: scheduleDate
      });
      return;
    }

    if (date === startDate) {
      windows.push({
        id: schedule.id,
        source: "schedule",
        start: schedule.start,
        end: END_OF_DAY_TIME,
        removeDate: scheduleDate
      });
    }

    if (date === endDate) {
      windows.push({
        id: schedule.id,
        source: "schedule",
        start: "00:00",
        end: schedule.end,
        removeDate: scheduleDate
      });
    }
  });

  return windows;
}

function getScheduleEndpointDate(date, schedule, endpoint, user = null) {
  const offset = endpoint === "start"
    ? getScheduleStartDayOffset(schedule, user)
    : getScheduleEndDayOffset(schedule, user);
  return formatDate(addDays(parseDate(date), offset));
}

function getScheduleStartDayOffset(schedule, user = null) {
  return getNormalizedScheduleDayOffset(schedule?.startDayOffset, getInferredScheduleStartDayOffset(schedule, user));
}

function getScheduleEndDayOffset(schedule, user = null) {
  const fallbackEndOffset = getScheduleStartDayOffset(schedule, user) + (toMinutes(schedule.end) <= toMinutes(schedule.start) ? 1 : 0);
  return getNormalizedScheduleDayOffset(schedule?.endDayOffset, fallbackEndOffset);
}

function getNormalizedScheduleDayOffset(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= -1 && number <= 1
    ? number
    : fallback;
}

function getInferredScheduleStartDayOffset(schedule, user = null) {
  return schedule
    && !Number.isInteger(Number(schedule.startDayOffset))
    && toMinutes(schedule.start) > toMinutes(schedule.end)
    && userBelongsToAsiaRegion(user)
    ? -1
    : 0;
}

function userBelongsToAsiaRegion(user) {
  return Array.isArray(user?.regionIds) && user.regionIds.some((regionId) => {
    const region = getRegionById(regionId);
    const label = `${region?.id || regionId} ${region?.name || ""}`.toLowerCase();
    return label.includes("apac") || label.includes("asia") || label.includes("pacific");
  });
}

function isScheduleActiveOnDate(schedule, date, day = getDayNameFromDate(date)) {
  return Array.isArray(schedule.days)
    && schedule.days.includes(day)
    && getScheduleStartDate(schedule) <= date
    && date <= getScheduleEndDate(schedule);
}

function findNextAvailableStart(currentMinutes, windows, breaks) {
  for (const window of windows) {
    const windowStart = toMinutes(window.start);
    const windowEnd = toMinutes(window.end);
    let candidate = Math.max(currentMinutes, windowStart);

    while (candidate < windowEnd) {
      const blockingBreak = breaks.find((slot) => isWithinWindow(candidate, slot.startMinutes, slot.endMinutes));
      if (!blockingBreak) {
        return candidate > currentMinutes ? candidate : null;
      }

      candidate = blockingBreak.endMinutes;
    }
  }

  return null;
}

function getHolidaysForUser(userId, date, regionId = GLOBAL_REGION_SCOPE_ID) {
  return getOooRecordsForUser(userId, date, regionId).filter(isAllDayOooRecord);
}

function getTimedOooBlocksForUser(userId, date, regionId = GLOBAL_REGION_SCOPE_ID) {
  return getOooRecordsForUser(userId, date, regionId)
    .filter(isTimedOooRecord)
    .filter((holiday) => isValidTimeInput(holiday.start || "") && isValidTimeRange(holiday.start, holiday.end));
}

function getOooRecordsForUser(userId, date, regionId = GLOBAL_REGION_SCOPE_ID) {
  const oooRecords = [];
  oooRecords.push(...getGlobalIndividualHolidays().filter((holiday) => (
    holiday.userId === userId && isOooRecordActiveOnDate(holiday, date)
  )));

  const normalizedRegionId = normalizeRegionScopeId(regionId);
  if (normalizedRegionId) {
    oooRecords.push(...getRegionHolidayMatchesForUser(userId, date, normalizedRegionId));
  } else if (areRegionsEnabled()) {
    const user = getUserFromReference(userId);
    (user?.regionIds || []).forEach((userRegionId) => {
      oooRecords.push(...getRegionHolidayMatchesForUser(userId, date, userRegionId));
    });
  } else {
    oooRecords.push(...data.holidays.filter((holiday) => (
      isOooRecordActiveOnDate(holiday, date)
        && holiday.userId === GLOBAL_HOLIDAY_USER_ID
    )));
  }

  return dedupeHolidays(oooRecords);
}

function getRegionHolidayMatchesForUser(userId, date, regionId) {
  return getScopedHolidays(regionId).filter((holiday) => (
    isOooRecordActiveOnDate(holiday, date)
      && (holiday.userId === userId || holiday.userId === GLOBAL_HOLIDAY_USER_ID)
  ));
}

function getGlobalIndividualHolidays() {
  return data.holidays.filter((holiday) => holiday.userId !== GLOBAL_HOLIDAY_USER_ID);
}

function getGlobalIndividualHolidaysForRegion(regionId) {
  const regionUserIds = new Set(getUsersForRegionScope(regionId).map((user) => user.id));
  return getGlobalIndividualHolidays().filter((holiday) => regionUserIds.has(holiday.userId));
}

function dedupeHolidays(holidays) {
  const seen = new Set();
  return holidays.filter((holiday) => {
    const key = `${holiday.userId}:${holiday.date}:${getOooEndDate(holiday)}:${getOooType(holiday)}:${holiday.start || ""}:${holiday.end || ""}:${holiday.name || "OOO"}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getOooRetentionDate(holiday) {
  return isAllDayOooRecord(holiday) ? getOooEndDate(holiday) : holiday.date;
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sme-scheduler-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  if (!isAdminTabUnlocked("data")) {
    event.target.value = "";
    return;
  }

  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result));
      validateData(imported);
      data = imported;
      clearSelectedAssignee();
      completeAdminSave("Backup imported.", "data");
    } catch (error) {
      showGenericAlert("Import failed", `Could not import JSON: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!isAdminTabUnlocked("data")) {
    return;
  }

  showGenericConfirm("Reset data", "Reset to sample data? This replaces local browser data.", () => {
    data = cloneData(defaultData);
    clearSelectedAssignee();
    completeAdminSave("Sample data restored.", "data");
  });
}

function migrateLegacyStorageKeys() {
  try {
    LEGACY_STORAGE_KEYS.forEach((legacyKey, currentKey) => {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue === null) {
        return;
      }

      if (localStorage.getItem(currentKey) === null) {
        localStorage.setItem(currentKey, legacyValue);
      }
      localStorage.removeItem(legacyKey);
    });
  } catch {}
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return cloneData(defaultData);
  }

  try {
    const parsed = JSON.parse(saved);
    validateData(parsed);
    return parsed;
  } catch {
    return cloneData(defaultData);
  }
}

async function initializeSharedState() {
  if (!canUseSharedState()) {
    normalizeData();
    lastPersistedData = cloneData(data);
    return;
  }

  try {
    const payload = await fetchSharedState();
    sharedStateAvailable = true;
    sharedStateRevision = payload.revision ?? null;
    if (payload.data) {
      applySharedStatePayload(payload);
      return;
    }
  } catch {
    sharedStateAvailable = false;
  }

  normalizeData();
  lastPersistedData = cloneData(data);
}

function canUseSharedState() {
  return window.location.protocol === "http:" || window.location.protocol === "https:";
}

async function fetchSharedState() {
  const response = await fetch(SHARED_STATE_ENDPOINT, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Shared config returned ${response.status}.`);
  }

  return response.json();
}

async function refreshSharedStateIfIdle() {
  if (!sharedStateAvailable || sharedStateSaveInProgress || hasLocalEditingInProgress()) {
    return;
  }

  try {
    const payload = await fetchSharedState();
    if ((payload.revision ?? null) === sharedStateRevision || !payload.data) {
      return;
    }

    applySharedStatePayload(payload);
    clearSelectedAssignee();
    editingAssignmentId = null;
    editingSchedule = null;
    timelineDrafts = [];
    render();
  } catch {
    // Keep the last loaded data visible. The next save will surface write failures.
  }
}

function hasLocalEditingInProgress() {
  if (unlockedAdminTabs.size > 0 || editingSchedule || editingAssignmentId || timelineDrafts.length > 0 || timelineDrag) {
    return true;
  }

  const activeElement = document.activeElement;
  return Boolean(activeElement?.closest?.("form"));
}

async function persistDataSnapshot(snapshot) {
  if (!sharedStateAvailable) {
    saveData(snapshot);
    return { status: "saved", data: snapshot, revision: sharedStateRevision };
  }

  sharedStateSaveInProgress = true;
  try {
    const response = await fetch(SHARED_STATE_ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: sharedStateRevision,
        data: snapshot
      })
    });

    if (response.status === 409) {
      await handleSharedStateConflict(await response.json());
      return { status: "conflict" };
    }

    if (!response.ok) {
      throw new Error(`Shared config returned ${response.status}.`);
    }

    const payload = await response.json();
    return {
      status: "saved",
      data: payload.data || snapshot,
      revision: payload.revision ?? null
    };
  } finally {
    sharedStateSaveInProgress = false;
  }
}

function applySharedStatePayload(payload) {
  if (payload.data) {
    validateData(payload.data);
    data = payload.data;
    normalizeData();
    saveData(data);
    lastPersistedData = cloneData(data);
  }

  sharedStateRevision = payload.revision ?? null;
}

function applyPersistedData(nextData, revision) {
  validateData(nextData);
  data = nextData;
  normalizeData();
  sharedStateRevision = revision ?? sharedStateRevision;
  saveData(data);
  lastPersistedData = cloneData(data);
}

async function handleSharedStateConflict(payload) {
  sharedStateGeneration += 1;
  if (payload?.data) {
    applySharedStatePayload(payload);
  } else {
    const latestPayload = await fetchSharedState();
    applySharedStatePayload(latestPayload);
  }

  clearSelectedAssignee();
  lastAssignmentId = null;
  editingAssignmentId = null;
  editingSchedule = null;
  timelineDrafts = [];
  render();
  showSyncStateModal(
    "Shared data changed",
    "Your change was not saved because someone else updated the shared config first. The latest version has been loaded. Please apply your change again."
  );
}

function handleSharedStateSaveError(error) {
  sharedStateGeneration += 1;
  data = cloneData(lastPersistedData);
  clearSelectedAssignee();
  editingAssignmentId = null;
  editingSchedule = null;
  timelineDrafts = [];
  render();
  showSyncStateModal(
    "Shared config unavailable",
    `Your change was not saved. Make sure the scheduler server is still running and try again. ${error.message}`
  );
}

function showSyncStateModal(title, message) {
  if (!elements.syncStateModal) {
    showGenericAlert(title, message);
    return;
  }

  if (elements.syncStateModalTitle) {
    elements.syncStateModalTitle.textContent = title;
  }
  if (elements.syncStateModalMessage) {
    elements.syncStateModalMessage.textContent = message;
  }

  elements.syncStateModal.classList.remove("hidden");
  elements.syncStateModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.closeSyncStateModalButton?.focus(), 0);
}

function closeSyncStateModal() {
  if (!elements.syncStateModal) {
    return;
  }

  elements.syncStateModal.classList.add("hidden");
  elements.syncStateModal.setAttribute("aria-hidden", "true");
}

let pendingConfirmCallback = null;

function showGenericAlert(title, message) {
  if (!elements.genericAlertModal) {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  if (elements.genericAlertModalTitle) {
    elements.genericAlertModalTitle.textContent = title;
  }
  if (elements.genericAlertModalMessage) {
    elements.genericAlertModalMessage.textContent = message;
  }

  elements.genericAlertModal.classList.remove("hidden");
  elements.genericAlertModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.closeGenericAlertButton?.focus(), 0);
}

function closeGenericAlert() {
  if (!elements.genericAlertModal) {
    return;
  }

  elements.genericAlertModal.classList.add("hidden");
  elements.genericAlertModal.setAttribute("aria-hidden", "true");
}

function showGenericConfirm(title, message, onConfirm, options = {}) {
  if (!elements.genericConfirmModal) {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  pendingConfirmCallback = onConfirm;
  if (elements.genericConfirmModalTitle) {
    elements.genericConfirmModalTitle.textContent = title;
  }
  if (elements.genericConfirmModalMessage) {
    elements.genericConfirmModalMessage.textContent = message;
  }
  if (elements.cancelGenericConfirmButton) {
    elements.cancelGenericConfirmButton.textContent = options.cancelLabel || "Cancel";
  }
  if (elements.confirmGenericConfirmButton) {
    elements.confirmGenericConfirmButton.textContent = options.confirmLabel || "Confirm";
    elements.confirmGenericConfirmButton.className = options.confirmClass || "danger-button";
  }

  elements.genericConfirmModal.classList.toggle("assignment-speed-bump", options.variant === "assignment-speed-bump");
  elements.genericConfirmModal.classList.remove("hidden");
  elements.genericConfirmModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.cancelGenericConfirmButton?.focus(), 0);
}

function closeGenericConfirm() {
  pendingConfirmCallback = null;
  if (!elements.genericConfirmModal) {
    return;
  }

  elements.genericConfirmModal.classList.add("hidden");
  elements.genericConfirmModal.setAttribute("aria-hidden", "true");
  elements.genericConfirmModal.classList.remove("assignment-speed-bump");
}

function confirmGenericConfirm() {
  const callback = pendingConfirmCallback;
  closeGenericConfirm();
  if (callback) {
    callback();
  }
}

function openContactDevModal() {
  if (!elements.contactDevModal) {
    return;
  }

  elements.contactDevModal.classList.remove("hidden");
  elements.contactDevModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.closeContactDevModalButton?.focus(), 0);
}

function closeContactDevModal() {
  if (!elements.contactDevModal) {
    return;
  }

  elements.contactDevModal.classList.add("hidden");
  elements.contactDevModal.setAttribute("aria-hidden", "true");
}

async function copyContactEmail() {
  const email = elements.contactEmailDisplay?.textContent?.trim() || "";
  const copied = await copyTextToClipboard(email);
  setContactCopyButtonState(copied ? "Copied!" : "Copy failed");
}

async function copyTextToClipboard(text) {
  if (!text) {
    return false;
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  return copyTextWithTemporaryField(text);
}

function copyTextWithTemporaryField(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.append(textArea);

  const selection = document.getSelection();
  const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {}

  textArea.remove();
  if (selection && selectedRange) {
    selection.removeAllRanges();
    selection.addRange(selectedRange);
  }

  return copied;
}

function setContactCopyButtonState(label) {
  if (!elements.copyContactEmailButton) {
    return;
  }

  elements.copyContactEmailButton.textContent = label;
  window.setTimeout(() => {
    if (elements.copyContactEmailButton) {
      elements.copyContactEmailButton.textContent = "Copy";
    }
  }, 2000);
}

function loadDebugTimeOverride() {
  try {
    const saved = localStorage.getItem(DEBUG_TIME_STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved);
    return isValidDateInput(parsed?.date) && isValidTimeInput(parsed?.time)
      ? { date: parsed.date, time: parsed.time }
      : null;
  } catch {
    return null;
  }
}

function detectDisplayTimezone() {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const map = {
      "America/New_York": "et", "America/Detroit": "et", "America/Toronto": "et",
      "America/Montreal": "et", "America/Iqaluit": "et", "America/Nassau": "et",
      "America/Thule": "et", "America/Grand_Turk": "et",
      "UTC": "utc", "Etc/UTC": "utc", "Etc/UCT": "utc", "Etc/Universal": "utc",
      "Europe/London": "london", "Europe/Belfast": "london", "Europe/Dublin": "london",
      "Europe/Guernsey": "london", "Europe/Isle_of_Man": "london", "Europe/Jersey": "london",
      "Atlantic/Canary": "london", "Atlantic/Faroe": "london", "Atlantic/Madeira": "london",
      "Asia/Kolkata": "ist", "Asia/Calcutta": "ist"
    };
    return map[detected] || null;
  } catch {
    return null;
  }
}

function loadDisplayTimezone() {
  try {
    const saved = localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY);
    if (saved) {
      return getDisplayTimezone(saved).id;
    }
    const detected = detectDisplayTimezone();
    if (detected) {
      localStorage.setItem(DISPLAY_TIMEZONE_STORAGE_KEY, detected);
      return detected;
    }
    return getDisplayTimezones()[0].id;
  } catch {
    return getDisplayTimezones()[0].id;
  }
}

function getDisplayTimezone(timezoneId) {
  return getDisplayTimezones().find((timezone) => timezone.id === timezoneId) || getDisplayTimezones()[0];
}

function getSelectedDisplayTimezone() {
  return getDisplayTimezone(selectedDisplayTimezoneId);
}

function saveDebugTimeOverride() {
  if (!debugTimeOverride) {
    return;
  }

  localStorage.setItem(DEBUG_TIME_STORAGE_KEY, JSON.stringify(debugTimeOverride));
}

function clearDebugTimeOverride() {
  localStorage.removeItem(DEBUG_TIME_STORAGE_KEY);
}

function isDevModeAssignmentActive() {
  return devModeUnlocked && Boolean(debugTimeOverride);
}

function saveData(snapshot = data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function validateData(candidate) {
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

function getRetentionPolicy() {
  return normalizeRetentionPolicy(data?.retentionPolicy);
}

function normalizeRetentionPolicy(policy) {
  const source = policy && typeof policy === "object" ? policy : {};
  return {
    assignmentLogDays: normalizeRetentionDayCount(
      source.assignmentLogDays ?? source.assignmentHistoryDays ?? source.ticketHistoryDays,
      DEFAULT_RETENTION_POLICY.assignmentLogDays
    ),
    oooDays: normalizeRetentionDayCount(
      source.oooDays ?? source.holidayDays ?? source.exceptionDays,
      DEFAULT_RETENTION_POLICY.oooDays
    ),
    delegationDays: normalizeRetentionDayCount(
      source.delegationDays ?? source.delegationHistoryDays,
      DEFAULT_RETENTION_POLICY.delegationDays
    ),
    backupSnapshotDays: normalizeRetentionDayCount(
      source.backupSnapshotDays ?? source.backupDays ?? source.snapshotDays,
      DEFAULT_RETENTION_POLICY.backupSnapshotDays
    )
  };
}

function normalizeRetentionDayCount(value, fallback) {
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, RETENTION_POLICY_LIMITS.min), RETENTION_POLICY_LIMITS.max);
}

function applyRetentionPolicy(referenceDate = getRetentionReferenceDate()) {
  const policy = getRetentionPolicy();
  const assignmentCutoffDate = getRetentionCutoffDate(policy.assignmentLogDays, referenceDate);
  const assignmentPartition = partitionRecordsByRetention(
    data.assignmentLog,
    assignmentCutoffDate,
    getAssignmentEntryDate
  );
  if (assignmentPartition.pruned.length > 0) {
    data.queueBaselines = buildQueuePositionsFromAssignmentLog(assignmentPartition.pruned, data.queueBaselines);
    data.assignmentLog = assignmentPartition.retained;
  }

  const oooCutoffDate = getRetentionCutoffDate(policy.oooDays, referenceDate);
  const exceptionPartition = partitionRecordsByRetention(data.exceptions, oooCutoffDate, (slot) => slot.date || slot.startDate);
  data.exceptions = exceptionPartition.retained;
  const globalOooPartition = partitionRecordsByRetention(data.holidays, oooCutoffDate, getOooRetentionDate);
  data.holidays = globalOooPartition.retained;
  Object.values(data.regionalSettings || {}).forEach((settings) => {
    if (!settings || typeof settings !== "object") {
      return;
    }

    const scopedOooPartition = partitionRecordsByRetention(settings.holidays, oooCutoffDate, getOooRetentionDate);
    settings.holidays = scopedOooPartition.retained;
  });

  const delegationCutoffDate = getRetentionCutoffDate(policy.delegationDays, referenceDate);
  const delegationPartition = partitionRecordsByRetention(data.delegations, delegationCutoffDate, (delegation) => delegation.date);
  data.delegations = delegationPartition.retained;

  return {
    assignmentLogPruned: assignmentPartition.pruned.length,
    exceptionsPruned: exceptionPartition.pruned.length,
    globalOooPruned: globalOooPartition.pruned.length,
    delegationsPruned: delegationPartition.pruned.length
  };
}

function getRetentionReferenceDate() {
  return getLiveEasternNow().date;
}

function getRetentionCutoffDate(days, referenceDate) {
  const normalizedReferenceDate = isValidDateInput(referenceDate || "")
    ? referenceDate
    : getLiveEasternNow().date;
  return formatDate(addDays(parseDate(normalizedReferenceDate), -normalizeRetentionDayCount(days, DEFAULT_RETENTION_POLICY.assignmentLogDays)));
}

function partitionRecordsByRetention(records, cutoffDate, getRecordDate) {
  const retained = [];
  const pruned = [];
  (Array.isArray(records) ? records : []).forEach((record) => {
    const recordDate = getRecordDate(record);
    if (shouldKeepRecordForRetention(recordDate, cutoffDate)) {
      retained.push(record);
    } else {
      pruned.push(record);
    }
  });

  return { retained, pruned };
}

function shouldKeepRecordForRetention(recordDate, cutoffDate) {
  return !isValidDateInput(recordDate || "") || recordDate >= cutoffDate;
}

function normalizeAssignmentRulesConfig(config) {
  const source = config && typeof config === "object" ? config : DEFAULT_ASSIGNMENT_RULES;
  return {
    preset: getAssignmentRulePreset(source.preset).id
  };
}

function normalizeShiftTemplateRecords(templates, fallbackTemplates = DEFAULT_SHIFT_TEMPLATES) {
  const normalizedTemplates = Array.isArray(templates) && templates.length > 0
    ? templates
    : cloneData(fallbackTemplates);

  return normalizedTemplates.map((template) => {
    const normalized = {
      id: template.id || makeId(template.name || "shift", []),
      name: template.name || template.label || "Shift",
      start: template.start || "09:00",
      end: template.end || "17:00"
    };
    normalizeScheduleTimeFields(normalized, "09:00", "17:00");
    return normalized;
  });
}

function normalizeHolidayRecords(holidays) {
  const normalizedHolidays = Array.isArray(holidays) ? holidays : [];
  normalizedHolidays.forEach((holiday) => {
    holiday.id ||= makeRecordId("holiday");
    holiday.userId ||= GLOBAL_HOLIDAY_USER_ID;
    holiday.name ||= "OOO";
    holiday.type = isTimedOooRecord(holiday) ? OOO_TYPE_TIME : OOO_TYPE_ALL_DAY;
    if (holiday.type === OOO_TYPE_TIME) {
      normalizeForwardTimeFields(holiday, "12:00", "12:30");
      delete holiday.endDate;
    } else {
      delete holiday.start;
      delete holiday.end;
      if (!isValidDateInput(holiday.endDate || "") || holiday.endDate <= holiday.date) {
        delete holiday.endDate;
      }
    }
    delete holiday.allDay;
  });
  return normalizedHolidays.sort(compareOooRecords);
}

function migrateGlobalAllUserHolidaysToRegions() {
  if (!areRegionsEnabled() || data.regions.length === 0) {
    return;
  }

  const globalAllUserHolidays = data.holidays.filter((holiday) => holiday.userId === GLOBAL_HOLIDAY_USER_ID);
  if (globalAllUserHolidays.length === 0) {
    return;
  }

  data.regions.forEach((region) => {
    const regionHolidays = getScopedHolidays(region.id);
    globalAllUserHolidays.forEach((holiday) => {
      const alreadyExists = regionHolidays.some((existing) => (
        existing.userId === GLOBAL_HOLIDAY_USER_ID
          && existing.date === holiday.date
          && getOooEndDate(existing) === getOooEndDate(holiday)
          && getOooType(existing) === getOooType(holiday)
          && (existing.start || "") === (holiday.start || "")
          && (existing.end || "") === (holiday.end || "")
          && (existing.name || "OOO") === (holiday.name || "OOO")
      ));
      if (!alreadyExists) {
        regionHolidays.push({
          ...holiday,
          id: makeRecordId("holiday")
        });
      }
    });
  });

  data.holidays = data.holidays.filter((holiday) => holiday.userId !== GLOBAL_HOLIDAY_USER_ID);
}

function normalizeSystemRecords(systems, queues, allowedUserIds = null, fallbackRegionId = GLOBAL_REGION_SCOPE_ID) {
  const normalizedSystems = Array.isArray(systems) ? systems : [];
  normalizedSystems.forEach((system) => {
    system.regionIds = normalizeSystemRegionIds(system, fallbackRegionId);
    delete system.regionId;
    const allowedIds = allowedUserIds || new Set(data.users
      .filter((user) => userBelongsToAnyRegion(user, system.regionIds))
      .map((user) => user.id));
    system.serviceNowConfigItem = String(system.serviceNowConfigItem || system.configItem || system.configurationItem || "").trim();
    system.primaryUserIds = Array.isArray(system.primaryUserIds)
      ? system.primaryUserIds.filter((userId) => allowedIds.has(userId))
      : [];
    if (!(system.id in queues)) {
      queues[system.id] = 0;
    }
    const queueMax = Math.max(system.primaryUserIds.length - 1, 0);
    queues[system.id] = Math.min(Math.max(Number(queues[system.id] || 0), 0), queueMax);
  });
  Object.keys(queues).forEach((systemId) => {
    if (!normalizedSystems.some((system) => system.id === systemId)) {
      delete queues[systemId];
    }
  });
  return normalizedSystems;
}

function normalizeSystemRegionIds(system, fallbackRegionId = GLOBAL_REGION_SCOPE_ID) {
  if (!areRegionsEnabled() || data.regions.length === 0) {
    return [];
  }

  const validRegionIds = new Set(data.regions.map((region) => region.id));
  const sourceIds = Array.isArray(system?.regionIds)
    ? system.regionIds
    : system?.regionId
      ? [system.regionId]
      : [];
  const normalizedIds = Array.from(new Set(sourceIds.map(String).filter((regionId) => validRegionIds.has(regionId))));
  if (normalizedIds.length > 0) {
    return normalizedIds;
  }

  const fallbackId = normalizeRegionScopeId(fallbackRegionId);
  return fallbackId ? [fallbackId] : data.regions.map((region) => region.id);
}

function mergeLegacyRegionalSystems() {
  if (!data.regionalSettings || typeof data.regionalSettings !== "object") {
    return;
  }

  data.regions.forEach((region) => {
    const regionalSystems = Array.isArray(data.regionalSettings?.[region.id]?.systems)
      ? data.regionalSettings[region.id].systems
      : [];
    regionalSystems.forEach((regionalSystem) => {
      if (!regionalSystem?.id || !regionalSystem?.name) {
        return;
      }

      let system = data.systems.find((item) => item.id === regionalSystem.id)
        || data.systems.find((item) => item.name === regionalSystem.name);
      if (!system) {
        system = {
          id: regionalSystem.id,
          name: regionalSystem.name,
          regionIds: [],
          primaryUserIds: [],
          serviceNowConfigItem: ""
        };
        data.systems.push(system);
      }

      system.regionIds = Array.from(new Set((system.regionIds || []).concat(region.id)));
      system.primaryUserIds = Array.from(new Set((system.primaryUserIds || []).concat(regionalSystem.primaryUserIds || [])));
      system.serviceNowConfigItem ||= String(regionalSystem.serviceNowConfigItem || "").trim();
    });
  });
}

function normalizeRegionSettings(regionId) {
  data.regionalSettings ||= {};
  const source = data.regionalSettings[regionId] && typeof data.regionalSettings[regionId] === "object"
    ? data.regionalSettings[regionId]
    : createDefaultRegionSettings(regionId);
  source.assignmentRules = normalizeAssignmentRulesConfig(source.assignmentRules);
  source.shiftTemplates = normalizeShiftTemplateRecords(source.shiftTemplates, createDefaultRegionShiftTemplates(regionId));
  syncRegionCoverageShift(regionId, source.shiftTemplates);
  source.teamOrderIds = normalizeTeamOrderIds(source.teamOrderIds, regionId);
  source.queues = source.queues && typeof source.queues === "object" ? source.queues : {};
  normalizeScopedQueues(source.queues, getScopedSystems(regionId));
  source.holidays = normalizeHolidayRecords(source.holidays);
  delete source.systems;
  delete source.systemsSeeded;
  data.regionalSettings[regionId] = source;
}

function normalizeScopedQueues(queues, systems) {
  systems.forEach((system) => {
    if (!(system.id in queues)) {
      queues[system.id] = 0;
    }
    const queueMax = Math.max(system.primaryUserIds.length - 1, 0);
    queues[system.id] = Math.min(Math.max(Number(queues[system.id] || 0), 0), queueMax);
  });
  Object.keys(queues).forEach((systemId) => {
    if (!systems.some((system) => system.id === systemId)) {
      delete queues[systemId];
    }
  });
}

function normalizeQueueBaselines(source) {
  const baseline = source && typeof source === "object" ? source : {};
  const normalized = {
    global: baseline.global && typeof baseline.global === "object" ? cloneData(baseline.global) : {},
    regional: {}
  };
  normalizeScopedQueues(normalized.global, data.systems);

  const regionalSource = baseline.regional && typeof baseline.regional === "object" ? baseline.regional : {};
  if (hasRegionalScopes()) {
    data.regions.forEach((region) => {
      normalized.regional[region.id] = regionalSource[region.id] && typeof regionalSource[region.id] === "object"
        ? cloneData(regionalSource[region.id])
        : {};
      normalizeScopedQueues(normalized.regional[region.id], getScopedSystems(region.id));
    });
  }

  return normalized;
}

function buildQueuePositionsFromAssignmentLog(assignments = data.assignmentLog, queueBaselines = data.queueBaselines) {
  const normalizedBaselines = normalizeQueueBaselines(queueBaselines);
  const rebuiltQueues = cloneData(normalizedBaselines.global);
  const rebuiltRegionalQueues = cloneData(normalizedBaselines.regional);
  const activeRegions = hasRegionalScopes() ? data.regions : [];

  normalizeScopedQueues(rebuiltQueues, data.systems);
  activeRegions.forEach((region) => {
    rebuiltRegionalQueues[region.id] ||= {};
    normalizeScopedQueues(rebuiltRegionalQueues[region.id], getScopedSystems(region.id));
  });

  (Array.isArray(assignments) ? assignments : [])
    .slice()
    .sort((left, right) => getAssignmentTimestamp(left) - getAssignmentTimestamp(right))
    .forEach((entry) => {
      const regionId = normalizeRegionScopeId(entry.regionId);
      const systems = getScopedSystems(regionId);
      const queues = regionId ? rebuiltRegionalQueues[regionId] : rebuiltQueues;
      const system = systems.find((item) => isAssignmentForSystem(entry, item, regionId));
      if (!system || system.primaryUserIds.length === 0) {
        return;
      }

      const userIndex = system.primaryUserIds.indexOf(entry.userId);
      if (userIndex >= 0) {
        queues[system.id] = (userIndex + 1) % system.primaryUserIds.length;
      }
    });

  return {
    global: rebuiltQueues,
    regional: rebuiltRegionalQueues
  };
}

function getIncidentConfig() {
  return normalizeIncidentConfig(data?.incidentConfig);
}

function normalizeIncidentConfig(config) {
  const source = config && typeof config === "object" ? config : {};
  const redirect = source.redirect && typeof source.redirect === "object" ? source.redirect : {};
  const serviceNow = source.serviceNow && typeof source.serviceNow === "object" ? source.serviceNow : {};
  const teams = source.teams && typeof source.teams === "object" ? source.teams : {};
  const mode = INCIDENT_CREATION_MODES.includes(source.mode) ? source.mode : DEFAULT_INCIDENT_CONFIG.mode;
  const teamsMessageFormat = TEAMS_MESSAGE_FORMATS.includes(teams.messageFormat)
    ? teams.messageFormat
    : DEFAULT_INCIDENT_CONFIG.teams.messageFormat;
  const messageTemplate = String(teams.messageTemplate || DEFAULT_INCIDENT_CONFIG.teams.messageTemplate).trim();

  return {
    enabled: source.enabled !== false,
    mode,
    redirect: {
      url: String(redirect.url || DEFAULT_INCIDENT_CONFIG.redirect.url).trim()
    },
    serviceNow: {
      instanceUrl: String(serviceNow.instanceUrl || "").trim(),
      apiPath: String(serviceNow.apiPath || DEFAULT_INCIDENT_CONFIG.serviceNow.apiPath).trim(),
      shortDescriptionTemplate: String(serviceNow.shortDescriptionTemplate || DEFAULT_INCIDENT_CONFIG.serviceNow.shortDescriptionTemplate).trim(),
      hiddenFields: normalizeServiceNowHiddenFields(serviceNow.hiddenFields || serviceNow.defaultFields || serviceNow.staticFields)
    },
    teams: {
      enabled: teams.enabled === true,
      webhookUrl: String(teams.webhookUrl || "").trim(),
      messageFormat: teamsMessageFormat,
      messageTemplate: messageTemplate === LEGACY_TEAMS_MESSAGE_TEMPLATE
        ? DEFAULT_INCIDENT_CONFIG.teams.messageTemplate
        : messageTemplate
    }
  };
}

function normalizeServiceNowHiddenFields(fields) {
  const seenNames = new Set();
  return (Array.isArray(fields) ? fields : [])
    .map((field) => ({
      id: String(field?.id || makeRecordId("servicenow-field")),
      name: String(field?.name || field?.field || field?.key || "").trim(),
      value: String(field?.value ?? "").trim()
    }))
    .filter((field) => {
      if (!field.name || !field.value || !SERVICENOW_FIELD_NAME_PATTERN.test(field.name)) {
        return false;
      }
      if (SERVICENOW_FORM_CONTROLLED_FIELDS.includes(field.name) || seenNames.has(field.name)) {
        return false;
      }

      seenNames.add(field.name);
      return true;
    });
}

function getServiceNowHiddenPayloadFields(fields = getIncidentConfig().serviceNow.hiddenFields) {
  return normalizeServiceNowHiddenFields(fields).reduce((payloadFields, field) => {
    payloadFields[field.name] = field.value;
    return payloadFields;
  }, {});
}

function normalizeAssignmentIncident(entry) {
  if (!entry?.serviceNowIncident || typeof entry.serviceNowIncident !== "object") {
    return;
  }

  const source = entry.serviceNowIncident;
  const payload = source.payload && typeof source.payload === "object" ? source.payload : {};
  const description = String(source.description
    || source.serviceNowIncidentDescription
    || payload.description
    || payload.short_description
    || "").trim();
  const configItem = String(source.configItem
    || source.configurationItem
    || payload.cmdb_ci
    || "").trim();
  const priority = normalizeServiceNowPriority(source.priority || payload.priority);
  const hiddenFieldSource = source.hiddenFields && typeof source.hiddenFields === "object"
    ? source.hiddenFields
    : getServiceNowHiddenPayloadFields();
  const hiddenFields = normalizeServiceNowHiddenPayloadFields(hiddenFieldSource);

  if (!description && !configItem) {
    delete entry.serviceNowIncident;
    return;
  }

  entry.serviceNowIncident = {
    mode: "servicenow",
    status: source.status || "ready",
    preparedAt: source.preparedAt || source.createdAt || source.updatedAt || entry.assignedAt || "",
    description,
    serviceNowIncidentDescription: description,
    configItem,
    priority,
    severity: priority,
    hiddenFields,
    payload: buildServiceNowIncidentPayload({ description, configItem, priority }, hiddenFields)
  };
}

function normalizeData() {
  data.assignmentLog = Array.isArray(data.assignmentLog) ? data.assignmentLog : [];
  data.assignmentLog.forEach(normalizeAssignmentIncident);
  data.assignmentRules = normalizeAssignmentRulesConfig(data.assignmentRules);
  data.incidentConfig = normalizeIncidentConfig(data.incidentConfig);
  data.retentionPolicy = normalizeRetentionPolicy(data.retentionPolicy);
  data.exceptions = Array.isArray(data.exceptions) ? data.exceptions : [];
  data.holidays = Array.isArray(data.holidays) ? data.holidays : [];
  data.regionsEnabled = data.regionsEnabled !== false;
  data.regions = Array.isArray(data.regions) ? data.regions : cloneData(DEFAULT_REGIONS);
  const normalizedRegions = [];
  data.regions.forEach((region) => {
    const name = String(region?.name || region?.label || "").trim();
    if (!name) {
      return;
    }
    const id = makeId(region.id || name, normalizedRegions.map((item) => item.id));
    const fallbackCoverage = getDefaultRegionCoverageWindow(id, name);
    const coverageStart = isValidTimeInput(region.coverageStart || region.start || "")
      ? region.coverageStart || region.start
      : fallbackCoverage.coverageStart;
    const coverageEnd = isValidTimeInput(region.coverageEnd || region.end || "")
      ? region.coverageEnd || region.end
      : fallbackCoverage.coverageEnd;
    normalizedRegions.push({
      id,
      name,
      coverageStart: isValidRegionCoverageTimeRange(coverageStart, coverageEnd) ? coverageStart : fallbackCoverage.coverageStart,
      coverageEnd: isValidRegionCoverageTimeRange(coverageStart, coverageEnd) ? coverageEnd : fallbackCoverage.coverageEnd
    });
  });
  data.regions = normalizedRegions;

  data.shiftTemplates = normalizeShiftTemplateRecords(data.shiftTemplates);
  data.displayTimezones = Array.isArray(data.displayTimezones) && data.displayTimezones.length > 0
    ? data.displayTimezones.map((tz) => {
        if (!tz.label) {
          const match = AVAILABLE_TIMEZONES.find((a) => a.id === tz.id);
          return { ...tz, label: match?.label || tz.id };
        }
        return tz;
      })
    : cloneData(DEFAULT_DISPLAY_TIMEZONES);
  data.queues = data.queues && typeof data.queues === "object" ? data.queues : {};
  const validRegionIds = new Set(data.regions.map((region) => region.id));

  data.users.forEach((user) => {
    user.regionIds = Array.from(new Set(Array.isArray(user.regionIds) ? user.regionIds : []))
      .filter((regionId) => validRegionIds.has(regionId));
    user.schedules = Array.isArray(user.schedules) ? user.schedules : [];
    user.schedules.forEach((schedule) => {
      schedule.id ||= makeRecordId("schedule");
      schedule.shiftType ||= inferShiftType(schedule.start, schedule.end);
      schedule.days = Array.isArray(schedule.days) ? schedule.days : [];
      normalizeScheduleTimeFields(schedule, "09:00", "17:00");
      normalizeScheduleDayOffsetFields(schedule);
      if (schedule.startDate && !isValidDateInput(schedule.startDate)) {
        delete schedule.startDate;
      }
      if (schedule.endDate && !isValidDateInput(schedule.endDate)) {
        delete schedule.endDate;
      }
      if (schedule.startDate && schedule.endDate && schedule.startDate > schedule.endDate) {
        [schedule.startDate, schedule.endDate] = [schedule.endDate, schedule.startDate];
      }
      delete schedule.priority;
    });
  });

  data.exceptions.forEach((slot) => {
    slot.id ||= makeRecordId("slot");
    slot.type = slot.type === "extra" ? "extra" : "break";
    slot.reason ||= "";
    normalizeForwardTimeFields(slot, "12:00", "12:30");
  });
  data.exceptions.sort(compareDateTimeRecords);

  data.holidays = normalizeHolidayRecords(data.holidays);
  data.regionalSettings = data.regionalSettings && typeof data.regionalSettings === "object" ? data.regionalSettings : {};
  mergeLegacyRegionalSystems();
  data.systems = normalizeSystemRecords(data.systems, data.queues);
  Object.keys(data.regionalSettings).forEach((regionId) => {
    if (!validRegionIds.has(regionId)) {
      delete data.regionalSettings[regionId];
    }
  });
  if (hasRegionalScopes()) {
    data.regions.forEach((region) => normalizeRegionSettings(region.id));
    migrateGlobalAllUserHolidaysToRegions();
  }
  data.queueBaselines = normalizeQueueBaselines(data.queueBaselines);

  const normalizedDelegationSlots = [];
  (Array.isArray(data.delegationSlots) ? data.delegationSlots : []).forEach((slot) => {
    const normalized = normalizeDelegationSlotRecord(slot, normalizedDelegationSlots.map((item) => item.id));
    if (normalized) {
      normalizedDelegationSlots.push(normalized);
    }
  });
  data.delegationSlots = normalizedDelegationSlots.sort(compareDelegationSlots);

  data.delegations = Array.isArray(data.delegations) ? data.delegations : [];
  data.delegations = data.delegations
    .map(normalizeDelegationRecord)
    .filter(Boolean);
  data.delegations.sort(compareDelegationsByStart);
  data.assignmentLog.sort((left, right) => getAssignmentTimestamp(left) - getAssignmentTimestamp(right));
  applyRetentionPolicy();
  data.queueBaselines = normalizeQueueBaselines(data.queueBaselines);

  rebuildQueuesFromAssignmentLog();
}

function normalizeDelegationSlotRecord(slot, existingIds = []) {
  slot = slot && typeof slot === "object" ? slot : {};
  const start = isValidTimeInput(slot.start || "") ? slot.start : "09:00";
  const end = isValidTimeInput(slot.end || "") ? slot.end : "09:30";

  const normalized = {
    id: makeId(slot.id || `delegation-${start}-${end}`, existingIds),
    name: "",
    start,
    end
  };

  if (!isForwardTimeRange(normalized.start, normalized.end)) {
    normalized.start = "09:00";
    normalized.end = "09:30";
  }
  normalized.name = formatDelegationSlotTimeRange(normalized);

  return normalized;
}

function normalizeDelegationRecord(delegation) {
  delegation = delegation && typeof delegation === "object" ? delegation : {};
  const slot = getDelegationSlotById(delegation.slotId);
  const fallbackTimezone = {
    id: "et",
    timeZone: EASTERN_TIME_ZONE,
    label: "Eastern (New York)"
  };
  const timezone = getDisplayTimezones().find((item) => item.id === (delegation.timezoneId || delegation.timeZoneId))
    || AVAILABLE_TIMEZONES.find((item) => item.id === (delegation.timezoneId || delegation.timeZoneId))
    || getDisplayTimezones().find((item) => item.timeZone === delegation.timeZone)
    || AVAILABLE_TIMEZONES.find((item) => item.timeZone === delegation.timeZone)
    || fallbackTimezone;
  const fallbackDate = getEasternNow().date;
  const date = isValidDateInput(delegation.date || "")
    ? delegation.date
    : isValidDateInput(delegation.startDate || "")
      ? delegation.startDate
      : fallbackDate;
  const normalized = {
    id: delegation.id || makeRecordId("delegation"),
    delegatorUserId: data.users.some((user) => user.id === delegation.delegatorUserId) ? delegation.delegatorUserId : "",
    systemId: "",
    slotId: slot?.id || "",
    slotName: "",
    date,
    start: isValidTimeInput(delegation.start || "") ? delegation.start : slot?.start || "09:00",
    end: isValidTimeInput(delegation.end || "") ? delegation.end : slot?.end || "09:30",
    timezoneId: timezone.id,
    timeZone: timezone.timeZone,
    timezoneLabel: timezone.label,
    note: delegation.note || ""
  };

  if (!isForwardTimeRange(normalized.start, normalized.end)) {
    normalized.start = "09:00";
    normalized.end = "09:30";
  }
  normalized.slotName = formatDelegationSlotTimeRange(normalized);

  return isValidDateInput(normalized.date) ? normalized : null;
}

function normalizeForwardTimeFields(record, fallbackStart, fallbackEnd) {
  if (!isValidTimeInput(record.start || "")) {
    record.start = fallbackStart;
  }
  if (!isValidTimeInput(record.end || "")) {
    record.end = fallbackEnd;
  }
  if (toMinutes(record.start) > toMinutes(record.end)) {
    [record.start, record.end] = [record.end, record.start];
  }
  if (!isForwardTimeRange(record.start, record.end)) {
    record.start = fallbackStart;
    record.end = fallbackEnd;
  }
}

function normalizeScheduleTimeFields(record, fallbackStart, fallbackEnd) {
  if (!isValidTimeInput(record.start || "")) {
    record.start = fallbackStart;
  }
  if (!isValidTimeInput(record.end || "")) {
    record.end = fallbackEnd;
  }
  if (!isValidScheduleTimeRange(record.start, record.end)) {
    record.start = fallbackStart;
    record.end = fallbackEnd;
  }
}

function normalizeScheduleDayOffsetFields(record) {
  ["startDayOffset", "endDayOffset"].forEach((field) => {
    if (record[field] === undefined || record[field] === null || record[field] === "") {
      delete record[field];
      return;
    }

    const offset = Number(record[field]);
    if (Number.isInteger(offset) && offset >= -1 && offset <= 1) {
      record[field] = offset;
      return;
    }

    delete record[field];
  });
}

function rebuildQueuesFromAssignmentLog() {
  const rebuiltQueuePositions = buildQueuePositionsFromAssignmentLog(data.assignmentLog, data.queueBaselines);
  const activeRegions = hasRegionalScopes() ? data.regions : [];

  data.queues = rebuiltQueuePositions.global;
  activeRegions.forEach((region) => {
    getRegionSettings(region.id).queues = rebuiltQueuePositions.regional[region.id] || {};
  });
}

function setDefaultDates() {
  const today = getEasternNow().date;
  if (elements.timelineDateInput) {
    elements.timelineDateInput.value ||= today;
  }

  syncScheduleDateRangeToGraphWeek(false);

  if (elements.holidayDateInput) {
    elements.holidayDateInput.value ||= today;
  }
  if (elements.holidayEndDateInput) {
    elements.holidayEndDateInput.value ||= elements.holidayDateInput?.value || today;
  }
  updateHolidayDateRangeConstraints();

  if (elements.delegationGraphDateInput) {
    elements.delegationGraphDateInput.value ||= today;
  }
}

function syncScheduleDateRangeToGraphWeek(force = true) {
  if (!elements.scheduleStartDateInput || !elements.scheduleEndDateInput || editingSchedule) {
    return;
  }

  if (!force && elements.scheduleStartDateInput.value && elements.scheduleEndDateInput.value) {
    return;
  }

  const weekDates = getWeekDates(elements.timelineDateInput?.value || getEasternNow().date);
  elements.scheduleStartDateInput.value = weekDates[0];
  elements.scheduleEndDateInput.value = weekDates[4];
  updateScheduleRangeConstraints();
}

function normalizeScheduleDateRangeInputs(changedField = "start") {
  if (!elements.scheduleStartDateInput || !elements.scheduleEndDateInput) {
    return;
  }

  const fallbackDate = elements.timelineDateInput?.value || getEasternNow().date;
  const startDateValue = isValidDateInput(elements.scheduleStartDateInput.value)
    ? elements.scheduleStartDateInput.value
    : fallbackDate;
  const endDateValue = isValidDateInput(elements.scheduleEndDateInput.value)
    ? elements.scheduleEndDateInput.value
    : startDateValue;
  const startWeek = getBusinessWeekRange(startDateValue);
  let endWeek = getBusinessWeekRange(endDateValue);

  if (endWeek.endDate < startWeek.startDate) {
    endWeek = changedField === "end" ? startWeek : getBusinessWeekRange(startWeek.startDate);
  }

  elements.scheduleStartDateInput.value = startWeek.startDate;
  elements.scheduleEndDateInput.value = endWeek.endDate;
  updateScheduleRangeConstraints();
}

function updateScheduleRangeConstraints() {
  if (!elements.scheduleStartDateInput || !elements.scheduleEndDateInput) {
    return;
  }

  elements.scheduleEndDateInput.min = elements.scheduleStartDateInput.value || "";
}

function normalizeHolidayDateRangeInputs(changedField = "start") {
  if (!elements.holidayDateInput || !elements.holidayEndDateInput) {
    return;
  }

  const startDate = isValidDateInput(elements.holidayDateInput.value)
    ? elements.holidayDateInput.value
    : getEasternNow().date;
  let endDate = isValidDateInput(elements.holidayEndDateInput.value)
    ? elements.holidayEndDateInput.value
    : startDate;

  if (endDate < startDate) {
    endDate = changedField === "end" ? startDate : elements.holidayDateInput.value;
  }

  elements.holidayDateInput.value = startDate;
  elements.holidayEndDateInput.value = endDate;
  updateHolidayDateRangeConstraints();
}

function updateHolidayDateRangeConstraints() {
  if (!elements.holidayDateInput || !elements.holidayEndDateInput) {
    return;
  }

  elements.holidayEndDateInput.min = elements.holidayDateInput.value || "";
}

function updateForwardTimeInputConstraints() {
  [
    [elements.holidayStartInput, elements.holidayEndInput],
    [elements.delegationStartInput, elements.delegationEndInput]
  ].forEach(([startInput, endInput]) => {
    if (startInput && endInput) {
      endInput.min = startInput.value || "";
    }
  });
  [elements.scheduleEndInput, elements.shiftEndInput].forEach((endInput) => {
    if (endInput) {
      endInput.min = "";
    }
  });
}

function graphBlock(block, options = {}) {
  if (!isGraphBlockVisible(block)) {
    return "";
  }

  const label = formatGraphBlockLabel(block);
  const edgeLabels = graphEdgeLabels(block);
  const interiorLabel = formatGraphBlockInteriorText(block.type, block.label);
  return `
    ${edgeLabels}
    <span class="graph-block ${block.type}" style="${timeRangeStyle(block)}" title="${escapeHtml(label)}">
      ${options.hideLabel || !interiorLabel ? "" : `<span>${escapeHtml(interiorLabel)}</span>`}
      ${graphRemoveButton(block)}
    </span>
  `;
}

function graphDraftBlock(userId, date) {
  const draft = getTimelineDraft(userId, date);
  if (!draft) {
    return "";
  }

  const draftBlock = {
    type: "draft",
    label: "Draft",
    date,
    sourceDate: draft.sourceDate || date,
    start: draft.start,
    end: draft.end
  };
  if (!isGraphBlockVisible(draftBlock)) {
    return "";
  }

  return `
    ${graphEdgeLabels(draftBlock)}
    <span class="graph-block draft" style="${timeRangeStyle(draftBlock)}" title="Drag to move before saving">
      <span>New schedule</span>
    </span>
  `;
}

function weekGraphPill(block) {
  const label = formatGraphBlockLabel(block);
  const compactLabel = formatGraphBlockLabel(block, { includeTimezone: false });
  const title = block.type === "schedule"
    ? `Click to update schedule: ${label}`
    : label;
  const editAttributes = block.type === "schedule"
    ? `
      data-action="edit-schedule"
      data-user-id="${escapeHtml(block.userId)}"
      data-schedule-id="${escapeHtml(block.id)}"
      data-date="${escapeHtml(block.removeDate || block.date)}"
    `
    : "";
  return `
    <span class="week-pill ${block.type}" title="${escapeHtml(title)}"${editAttributes}>
      <span>${escapeHtml(compactLabel)}</span>
      ${graphRemoveButton(block)}
    </span>
  `;
}

function graphEdgeLabels(block) {
  if (block.type === "holiday" || block.type === "break") {
    return "";
  }

  const start = getGraphEndpointDisplayParts(block, "start");
  const end = getGraphEndpointDisplayParts(block, "end");
  const showDayOffsets = shouldShowGraphDayOffsets(start, end);
  const anchorDayOffset = getGraphDayOffsetAnchor(start, end, showDayOffsets);
  return `
    <span class="graph-edge-label ${escapeHtml(block.type)} start" style="${timeStartStyle(block)}">${escapeHtml(formatGraphEndpointPartLabel(start, showDayOffsets, anchorDayOffset))}</span>
    <span class="graph-edge-label ${escapeHtml(block.type)} end" style="${timeEndStyle(block)}">${escapeHtml(formatGraphEndpointPartLabel(end, showDayOffsets, anchorDayOffset))}</span>
  `;
}

function formatGraphBlockInteriorText(type, label) {
  if (type === "schedule" || type === "break") {
    return "";
  }

  if (type === "holiday") {
    return label;
  }

  return label || "";
}

function graphRemoveButton(block) {
  const label = formatGraphBlockLabel(block);
  if (block.type === "schedule") {
    return `
      <button
        class="graph-remove"
        type="button"
        data-action="remove-schedule"
        data-user-id="${escapeHtml(block.userId)}"
        data-schedule-id="${escapeHtml(block.id)}"
        data-date="${escapeHtml(block.removeDate || block.date)}"
        aria-label="Remove schedule ${escapeHtml(label)}"
      >×</button>
    `;
  }

  if ((block.type === "break" && block.source !== "ooo") || block.type === "extra") {
    return `
      <button
        class="graph-remove"
        type="button"
        data-action="remove-slot"
        data-slot-id="${escapeHtml(block.id)}"
        aria-label="Remove ${block.type === "break" ? "break" : "extra slot"} ${escapeHtml(label)}"
      >×</button>
    `;
  }

  return "";
}

function formatGraphBlockLabel(block, options = {}) {
  if (block.type === "holiday") {
    return block.label;
  }

  const range = formatGraphTimeRangeForDisplay(block, options);
  if (block.type === "schedule") {
    return range;
  }

  return `${block.label} · ${range}`;
}

function formatGraphTimeRangeForDisplay(block, { includeTimezone = true } = {}) {
  const start = getGraphEndpointDisplayParts(block, "start");
  const end = getGraphEndpointDisplayParts(block, "end");
  const showDayOffsets = shouldShowGraphDayOffsets(start, end);
  const anchorDayOffset = getGraphDayOffsetAnchor(start, end, showDayOffsets);
  const timezoneLabel = start.abbreviation === end.abbreviation
    ? start.abbreviation
    : `${start.abbreviation}/${end.abbreviation}`;
  const range = `${formatGraphEndpointPartLabel(start, showDayOffsets, anchorDayOffset)}–${formatGraphEndpointPartLabel(end, showDayOffsets, anchorDayOffset)}`;
  return includeTimezone ? `${range} ${timezoneLabel}` : range;
}

function formatGraphEndpointPartLabel(parts, showDayOffset = true, anchorDayOffset = 0) {
  return `${parts.time}${showDayOffset ? formatGraphDayOffsetLabel(parts.dayOffset - anchorDayOffset) : ""}`;
}

function shouldShowGraphDayOffsets(startParts, endParts) {
  return startParts.dayOffset !== endParts.dayOffset;
}

function getGraphDayOffsetAnchor(startParts, endParts, showDayOffsets) {
  return 0;
}

function getGraphEndpointDisplayParts(block, endpoint) {
  const sourceDate = block.sourceDate || block.removeDate || block.date || getScheduleReferenceDate();
  const graphDate = block.date || sourceDate;
  const endpointDate = endpoint === "end" && toMinutes(block.end) <= toMinutes(block.start)
    ? formatDate(addDays(parseDate(sourceDate), 1))
    : sourceDate;
  const endpointTime = endpoint === "start" ? block.start : block.end;
  const instant = zonedWallTimeToDate(endpointDate, endpointTime, EASTERN_TIME_ZONE);
  const timezone = getSelectedDisplayTimezone();
  const displayParts = getZonedDateTimeParts(instant, timezone.timeZone);
  const dayOffset = getDateOffset(graphDate, displayParts.date);
  return {
    time: displayParts.time,
    dayOffset,
    abbreviation: getTimezoneAbbreviation(instant, timezone)
  };
}

function formatGraphDayOffsetLabel(offset) {
  if (offset === 0) {
    return "";
  }

  const marker = offset > 0 ? `+${offset}` : `‑${Math.abs(offset)}`;
  return ` (T${marker})`;
}

function timeRangeStyle(block) {
  const graphRange = getScheduleGraphTimeRange();
  const blockRange = getGraphBlockRange(block, graphRange);
  if (!blockRange) {
    return "display:none;";
  }

  const startMinutes = Math.max(blockRange.start, graphRange.start);
  const endMinutes = Math.min(blockRange.end, graphRange.end);
  const left = ((startMinutes - graphRange.start) / graphRange.duration) * 100;
  const width = Math.max(((endMinutes - startMinutes) / graphRange.duration) * 100, 1);
  return `left:${left}%;width:${width}%;`;
}

function timeStartStyle(block) {
  const graphRange = getScheduleGraphTimeRange();
  const blockRange = getGraphBlockAbsoluteRange(block);
  const startMinutes = Math.min(Math.max(blockRange?.start ?? graphRange.start, graphRange.start), graphRange.end);
  const left = Math.min(((startMinutes - graphRange.start) / graphRange.duration) * 100, 92);
  return `left:${left}%;`;
}

function timeEndStyle(block) {
  const graphRange = getScheduleGraphTimeRange();
  const blockRange = getGraphBlockAbsoluteRange(block);
  const endMinutes = Math.min(Math.max(blockRange?.end ?? graphRange.end, graphRange.start), graphRange.end);
  const left = Math.max(((endMinutes - graphRange.start) / graphRange.duration) * 100, 0);
  return `left:${left}%;`;
}

function isGraphBlockVisible(block, graphRange = getScheduleGraphTimeRange()) {
  return Boolean(getGraphBlockRange(block, graphRange));
}

function getGraphBlockRange(block, graphRange = getScheduleGraphTimeRange()) {
  const blockRange = getGraphBlockAbsoluteRange(block);
  if (!blockRange) {
    return null;
  }

  const visibleStart = Math.max(blockRange.start, graphRange.start);
  const visibleEnd = Math.min(blockRange.end, graphRange.end);
  return visibleEnd > visibleStart
    ? blockRange
    : null;
}

function getGraphBlockAbsoluteRange(block) {
  if (Number.isFinite(block?.graphStartMinutes) && Number.isFinite(block?.graphEndMinutes)) {
    return { start: block.graphStartMinutes, end: block.graphEndMinutes };
  }
  if (!block || !isValidTimeInput(block.start || "") || !isValidTimeInput(block.end || "")) {
    return null;
  }

  const graphDate = block.date || getScheduleReferenceDate();
  const sourceDate = block.sourceDate || block.removeDate || graphDate;
  const startMinutes = getDateOffset(graphDate, sourceDate) * 24 * 60 + toMinutes(block.start);
  const endSourceDate = toMinutes(block.end) <= toMinutes(block.start)
    ? formatDate(addDays(parseDate(sourceDate), 1))
    : sourceDate;
  let endMinutes = getDateOffset(graphDate, endSourceDate) * 24 * 60 + toMinutes(block.end);
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return { start: startMinutes, end: endMinutes };
}

function toGraphMinutes(time, graphRange = getScheduleGraphTimeRange()) {
  const minutes = toMinutes(time);
  return graphRange.end > 24 * 60 && minutes < graphRange.start
    ? minutes + 24 * 60
    : minutes;
}

function getEasternNow() {
  if (devModeUnlocked && debugTimeOverride) {
    return buildEasternNow(debugTimeOverride.date, debugTimeOverride.time);
  }

  return getLiveEasternNow();
}

function getLiveEasternNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const time = `${values.hour}:${values.minute}`;
  const date = `${values.year}-${values.month}-${values.day}`;

  return buildEasternNow(date, time);
}

function buildEasternNow(date, time) {
  return {
    day: getDayNameFromDate(date),
    date,
    displayDate: formatDisplayDate(date),
    time,
    minutes: toMinutes(time)
  };
}

function getScheduleReferenceDate() {
  return elements.timelineDateInput?.value || getEasternNow().date;
}

function getDelegationReferenceDate() {
  return elements.delegationGraphDateInput?.value
    || getEasternNow().date;
}

function getHolidayReferenceDate() {
  return elements.holidayDateInput?.value || getScheduleReferenceDate();
}

function getSelectedTimezoneAbbreviationForDate(date) {
  const referenceDate = zonedWallTimeToDate(date, "12:00", EASTERN_TIME_ZONE);
  return getTimezoneAbbreviation(referenceDate, getSelectedDisplayTimezone());
}

function getSelectedTimezoneAbbreviationForEasternTime(date, time) {
  const referenceDate = zonedWallTimeToDate(date, time, EASTERN_TIME_ZONE);
  return getTimezoneAbbreviation(referenceDate, getSelectedDisplayTimezone());
}

function getSelectedTimezoneAbbreviationForDelegation(delegation) {
  const referenceDate = zonedWallTimeToDate(delegation.date, delegation.start, getDelegationTimezone(delegation).timeZone);
  return getTimezoneAbbreviation(referenceDate, getSelectedDisplayTimezone());
}

function formatEasternTimeInputForDisplay(date, time) {
  return formatTimeInputForDisplay(date, time, EASTERN_TIME_ZONE);
}

function formatTimeInputForDisplay(date, time, sourceTimeZone = EASTERN_TIME_ZONE) {
  if (!isValidDateInput(date) || !isValidTimeInput(time)) {
    return time || "";
  }

  const instant = zonedWallTimeToDate(date, time, sourceTimeZone);
  return getZonedDateTimeParts(instant, getSelectedDisplayTimezone().timeZone).time;
}

function convertDisplayDateTimeToEastern(date, time, timezone = getSelectedDisplayTimezone()) {
  if (!isValidDateInput(date) || !isValidTimeInput(time)) {
    return { date, time };
  }

  const instant = zonedWallTimeToDate(date, time, timezone.timeZone);
  return getZonedDateTimeParts(instant, EASTERN_TIME_ZONE);
}

function formatDisplayClock(easternNow, timezone) {
  const referenceDate = devModeUnlocked && debugTimeOverride
    ? zonedWallTimeToDate(easternNow.date, easternNow.time, EASTERN_TIME_ZONE)
    : new Date();
  return formatInstantDateTimeForDisplay(referenceDate, timezone);
}

function formatEasternDateTimeForDisplay(date, time) {
  return formatInstantDateTimeForDisplay(zonedWallTimeToDate(date, time, EASTERN_TIME_ZONE));
}

function formatEasternTimeForDisplay(date, time) {
  return formatInstantTimeForDisplay(zonedWallTimeToDate(date, time, EASTERN_TIME_ZONE));
}

function formatInstantDateTimeForDisplay(date, timezone = getSelectedDisplayTimezone()) {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone.timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const abbreviation = getTimezoneAbbreviation(date, timezone);
  return `${values.month} ${Number(values.day)}, ${values.year} · ${values.hour}:${values.minute} ${abbreviation}`;
}

function formatInstantTimeForDisplay(date, timezone = getSelectedDisplayTimezone()) {
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const abbreviation = getTimezoneAbbreviation(date, timezone);
  return `${values.hour}:${values.minute} ${abbreviation}`;
}

function getQueueIndex(system, regionId = selectedAssignmentRegionId) {
  const queues = getScopedQueues(regionId);
  return Math.min(Math.max(Number(queues[system.id] || 0), 0), Math.max(system.primaryUserIds.length - 1, 0));
}

function clampQueue(systemId, regionId = selectedAdminRegionId) {
  const normalizedRegionId = normalizeRegionScopeId(regionId);
  const queues = getScopedQueues(normalizedRegionId);
  const system = getScopedSystems(normalizedRegionId).find((item) => item.id === systemId);
  if (!system || system.primaryUserIds.length === 0) {
    queues[systemId] = 0;
    return;
  }

  queues[systemId] = getQueueIndex(system, normalizedRegionId);
}

function inferShiftType(start, end) {
  return data.shiftTemplates.find((template) => template.start === start && template.end === end)?.id || "custom";
}

function getShiftTemplate(shiftType, regionId = selectedAdminRegionId) {
  const parsedValue = parseShiftTemplateSelectValue(shiftType, regionId);
  return getScopedShiftTemplates(parsedValue.regionId).find((template) => template.id === parsedValue.templateId);
}

function makeId(name, existingIds) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";
  let id = base;
  let index = 2;

  while (existingIds.includes(id)) {
    id = `${base}-${index}`;
    index += 1;
  }

  return id;
}

function makeRecordId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneData(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) {
    return globalThis.CSS.escape(value);
  }

  return String(value).replaceAll('"', '\\"').replaceAll("\\", "\\\\");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
