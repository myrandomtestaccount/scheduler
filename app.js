const STORAGE_KEY = "smeScheduler.data.v1";
const DEBUG_TIME_STORAGE_KEY = "smeScheduler.debugTime.v1";
const THEME_STORAGE_KEY = "smeScheduler.theme.v1";
const DISPLAY_TIMEZONE_STORAGE_KEY = "smeScheduler.displayTimezone.v1";
const SHARED_STATE_ENDPOINT = "/api/state";
const SHARED_STATE_REFRESH_MS = 10000;
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const EASTERN_TIME_ZONE = "America/New_York";
const GLOBAL_HOLIDAY_USER_ID = "__all__";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SCHEDULE_DAYS = DAYS.slice(0, 5);
const TIMELINE_START_MINUTES = 6 * 60;
const TIMELINE_END_MINUTES = 22 * 60;
const SLOT_MINUTES = 30;
const RECENT_ASSIGNMENTS_WINDOW_MS = 24 * 60 * 60 * 1000;
const SHIFT_ORDER_PRESET_ID = "schedule-first";
const SHIFT_QUEUE_SYSTEM_ID = "__shift_queue__";
const SHIFT_QUEUE_SYSTEM_NAME = "Shift queue";
const INCIDENT_CREATE_URL = "https://www.google.com/";
const DEV_MODE_TIME_OPTION_ID = "__dev_mode__";
const DISPLAY_TIMEZONES = [
  { id: "et", timeZone: EASTERN_TIME_ZONE },
  { id: "utc", timeZone: "UTC" },
  { id: "london", timeZone: "Europe/London" },
  { id: "ist", timeZone: "Asia/Kolkata" }
];

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
    rules: ["schedule", "queuePriority", "teamPriority"]
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
      schedules: [
        { id: "alice-regular", shiftType: "regular", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "09:00", end: "17:00" }
      ]
    },
    {
      id: "ben",
      name: "Ben",
      schedules: [
        { id: "ben-early", shiftType: "early", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "07:00", end: "15:00" }
      ]
    },
    {
      id: "casey",
      name: "Casey",
      schedules: [
        { id: "casey-late", shiftType: "late", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "11:00", end: "19:00" }
      ]
    }
  ],
  systems: [
    { id: "external-system", name: "External System", primaryUserIds: ["alice", "ben", "casey"] },
    { id: "internal-api", name: "Internal API", primaryUserIds: ["casey", "alice"] }
  ],
  queues: {
    "external-system": 0,
    "internal-api": 0
  },
  shiftTemplates: DEFAULT_SHIFT_TEMPLATES,
  assignmentRules: DEFAULT_ASSIGNMENT_RULES,
  exceptions: [],
  holidays: [],
  assignmentLog: []
};

let data = loadData();
let lastPersistedData = cloneData(data);
let sharedStateAvailable = false;
let sharedStateRevision = null;
let sharedStateSaveQueue = Promise.resolve();
let sharedStateSaveInProgress = false;
let sharedStateGeneration = 0;
let selectedAssigneeId = null;
let initialDevModeRequested = isDevModeRequested();
let debugTimeOverride = initialDevModeRequested ? loadDebugTimeOverride() : null;
if (!initialDevModeRequested) {
  clearDebugTimeOverride();
}
let showRecentAssignments = false;
let showQueueDashboard = false;
let lastAssignmentId = null;
let editingAssignmentId = null;
let editingSchedule = null;
let selectedAssignmentPolicyId = null;
let pendingRemoveUserId = null;
let pendingRemoveShiftId = null;
let pendingRemoveSchedule = null;
let pendingRemoveHolidayId = null;
let shiftAddFormOpen = false;
let selectedDisplayTimezoneId = loadDisplayTimezone();
let devModeUnlocked = initialDevModeRequested && Boolean(debugTimeOverride);
let adminTimeInputsInitialized = false;
let timelineDrafts = [];
let timelineDrag = null;
const OTHER_ADMIN_TABS = ["rules", "users", "shifts", "systems", "data"];
const unlockedAdminTabs = new Set();
let saveToastTimer = null;

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
  adminToggleButton: document.querySelector("#adminToggleButton"),
  adminPanel: document.querySelector("#adminPanel"),
  closeAdminButton: document.querySelector("#closeAdminButton"),
  assignmentSystemSelect: document.querySelector("#assignmentSystemSelect"),
  markAssignedButton: document.querySelector("#markAssignedButton"),
  assignmentConfirmation: document.querySelector("#assignmentConfirmation"),
  queueSection: document.querySelector("#queueSection"),
  queueList: document.querySelector("#queueList"),
  dailyRankingsList: document.querySelector("#dailyRankingsList"),
  recentAssignmentsPanel: document.querySelector("#recentAssignmentsPanel"),
  activityPanelSection: document.querySelector("#activityPanelSection"),
  toggleQueueDashboardButton: document.querySelector("#toggleQueueDashboardButton"),
  queueDashboardPanel: document.querySelector("#queueDashboardPanel"),
  queueDashboardList: document.querySelector("#queueDashboardList"),
  toggleRecentAssignmentsButton: document.querySelector("#toggleRecentAssignmentsButton"),
  assignmentLog: document.querySelector("#assignmentLog"),
  addUserForm: document.querySelector("#addUserForm"),
  userNameInput: document.querySelector("#userNameInput"),
  usersList: document.querySelector("#usersList"),
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
  assignmentRulesForm: document.querySelector("#assignmentRulesForm"),
  assignmentPolicyDescriptions: document.querySelector("#assignmentPolicyDescriptions"),
  scheduleViewSelect: document.querySelector("#scheduleViewSelect"),
  graphDateLabel: document.querySelector("#graphDateLabel"),
  scheduleDaysLegend: document.querySelector("#scheduleDaysLegend"),
  scheduleStartLabel: document.querySelector("#scheduleStartLabel"),
  scheduleEndLabel: document.querySelector("#scheduleEndLabel"),
  scheduleGraphTitle: document.querySelector("#scheduleGraphTitle"),
  slotStartLabel: document.querySelector("#slotStartLabel"),
  slotEndLabel: document.querySelector("#slotEndLabel"),
  shiftStartLabel: document.querySelector("#shiftStartLabel"),
  shiftEndLabel: document.querySelector("#shiftEndLabel"),
  timelineUserSelect: document.querySelector("#timelineUserSelect"),
  timelineDateInput: document.querySelector("#timelineDateInput"),
  timelineCanvas: document.querySelector("#timelineCanvas"),
  timelineDraftActions: document.querySelector("#timelineDraftActions"),
  timelineDraftTitle: document.querySelector("#timelineDraftTitle"),
  timelineDraftMeta: document.querySelector("#timelineDraftMeta"),
  saveTimelineDraftButton: document.querySelector("#saveTimelineDraftButton"),
  clearTimelineDraftButton: document.querySelector("#clearTimelineDraftButton"),
  addSlotForm: document.querySelector("#addSlotForm"),
  slotDateInput: document.querySelector("#slotDateInput"),
  slotStartInput: document.querySelector("#slotStartInput"),
  slotEndInput: document.querySelector("#slotEndInput"),
  slotReasonInput: document.querySelector("#slotReasonInput"),
  slotsList: document.querySelector("#slotsList"),
  addSystemForm: document.querySelector("#addSystemForm"),
  systemNameInput: document.querySelector("#systemNameInput"),
  systemsList: document.querySelector("#systemsList"),
  addHolidayForm: document.querySelector("#addHolidayForm"),
  holidayUserSelect: document.querySelector("#holidayUserSelect"),
  holidayDateInput: document.querySelector("#holidayDateInput"),
  holidayNameInput: document.querySelector("#holidayNameInput"),
  holidaysList: document.querySelector("#holidaysList"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  resetButton: document.querySelector("#resetButton"),
  dataPreview: document.querySelector("#dataPreview")
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

  on(elements.assignmentSystemSelect, "change", () => {
    selectedAssigneeId = null;
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
  on(elements.applyDebugTimeButton, "click", applyDebugTimeOverride);
  on(elements.resetDebugTimeButton, "click", resetDebugTimeOverride);
  on(elements.toggleQueueDashboardButton, "click", toggleQueueDashboard);
  on(elements.toggleRecentAssignmentsButton, "click", toggleRecentAssignments);
  on(elements.addUserForm, "submit", addUser);
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
  on(elements.scheduleStartInput, "input", () => elements.shiftTemplateSelect.value = "custom");
  on(elements.scheduleEndInput, "input", () => elements.shiftTemplateSelect.value = "custom");
  on(elements.scheduleViewSelect, "change", renderTimezoneSensitiveAdminViews);
  on(elements.timelineUserSelect, "change", renderTimelineTools);
  on(elements.timelineDateInput, "change", () => {
    syncScheduleDateRangeToGraphWeek();
    renderTimezoneSensitiveAdminViews();
  });
  on(elements.slotDateInput, "change", renderAdminTimezoneLabels);
  on(elements.timelineCanvas, "pointerdown", startTimelineDraft);
  on(elements.timelineCanvas, "pointermove", moveTimelineDraft);
  on(elements.timelineCanvas, "click", prefillSlotFromTimeline);
  on(elements.saveTimelineDraftButton, "click", saveTimelineDraftSchedule);
  on(elements.clearTimelineDraftButton, "click", clearTimelineDraft);
  on(elements.addSlotForm, "submit", addTimelineSlot);
  on(elements.addSystemForm, "submit", addSystem);
  on(elements.addHolidayForm, "submit", addHoliday);
  on(elements.exportButton, "click", exportData);
  on(elements.importInput, "change", importData);
  on(elements.resetButton, "click", resetData);
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
  if (savedTheme === "bright") {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    return "light";
  }

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

  renderAdminLocks();
}

function render() {
  normalizeData();
  setDefaultDates();
  initializeAdminTimeInputs();
  renderSystemSelect();
  renderUserSelectors();
  renderShiftTemplateSelect();
  renderAssignmentRules();
  renderScheduleFormMode();
  renderAdminTimezoneLabels();
  renderShifts();
  renderShiftAddForm();
  renderUsers();
  renderSystems();
  renderHolidays();
  renderTimelineTools();
  renderDataPreview();
  renderDisplayTimezoneSelect();
  renderClockAndAssignment();
  renderAdminLocks();
}

function renderClockAndAssignment() {
  const easternNow = getEasternNow();
  const activityNow = getEffectiveQueueNow(easternNow);
  renderDebugTimeControls(easternNow);
  renderDisplayTimezoneSelect(easternNow);

  if (!elements.assignmentSystemSelect) {
    return;
  }

  const shiftOrderMode = isShiftOrderPolicy();
  const hasQueueContext = shiftOrderMode || Boolean(elements.assignmentSystemSelect.value);
  setAssignmentPickerVisible(!shiftOrderMode);
  setAssignmentSectionsVisible(hasQueueContext);
  if (elements.assignmentQueueTitle) {
    elements.assignmentQueueTitle.textContent = shiftOrderMode ? "Shift queue" : "Coverage queue";
  }

  if (!hasQueueContext) {
    selectedAssigneeId = null;
    renderAssignmentConfirmation(false);
    renderSuggestion({ system: null, rows: [], recommendedRow: null });
    renderQueue({ system: null, rows: [], recommendedRow: null });
    renderDailyRankings(activityNow.date);
    renderQueueDashboard(easternNow);
    renderAssignmentLog();
    return;
  }

  const queueState = getQueueState(getAssignmentQueueSystemId(), easternNow);
  if (!queueState.rows.some((row) => row.user.id === selectedAssigneeId && row.selectable)) {
    selectedAssigneeId = queueState.recommendedRow?.user.id ?? null;
  }

  renderSuggestion(queueState);
  renderQueue(queueState);
  renderAssignmentConfirmation(true);
  renderDailyRankings(queueState.effectiveNow.date);
  renderQueueDashboard(easternNow);
  renderAssignmentLog();
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
  const timezoneOptions = DISPLAY_TIMEZONES.map((timezone) => (
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
  const slotFormTimes = captureSlotFormTimes(previousTimezone);
  const shiftAddFormTimes = captureShiftAddFormTimes(previousTimezone);
  selectedDisplayTimezoneId = getDisplayTimezone(elements.displayTimezoneSelect.value).id;
  localStorage.setItem(DISPLAY_TIMEZONE_STORAGE_KEY, selectedDisplayTimezoneId);
  if (elements.debugTimeCard && (devModeUnlocked || debugTimeOverride)) {
    clearDevModeState();
  }
  restoreScheduleFormTimes(scheduleFormTimes);
  restoreSlotFormTimes(slotFormTimes);
  restoreShiftAddFormTimes(shiftAddFormTimes);
  renderTimezoneSensitiveAdminViews();
  renderClockAndAssignment();
}

function renderTimezoneSensitiveAdminViews() {
  renderAdminTimezoneLabels();
  renderShiftTemplateSelect();
  renderShifts();
  renderTimelineTools();
}

function renderAdminTimezoneLabels() {
  const abbreviation = getSelectedTimezoneAbbreviationForDate(getScheduleReferenceDate());
  const labelMap = [
    [elements.scheduleDaysLegend, `Schedule days (${abbreviation})`],
    [elements.scheduleStartLabel, `Start ${abbreviation}`],
    [elements.scheduleEndLabel, `End ${abbreviation}`],
    [elements.scheduleGraphTitle, `Schedule graph (${abbreviation})`],
    [elements.slotStartLabel, `Start ${abbreviation}`],
    [elements.slotEndLabel, `End ${abbreviation}`],
    [elements.shiftStartLabel, `Start ${abbreviation}`],
    [elements.shiftEndLabel, `End ${abbreviation}`]
  ];

  labelMap.forEach(([element, text]) => {
    if (element) {
      element.textContent = text;
    }
  });
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
  if (elements.slotStartInput) {
    elements.slotStartInput.value = formatEasternTimeInputForDisplay(date, elements.slotStartInput.value || "12:00");
  }
  if (elements.slotEndInput) {
    elements.slotEndInput.value = formatEasternTimeInputForDisplay(date, elements.slotEndInput.value || "12:30");
  }
  if (elements.shiftStartInput) {
    elements.shiftStartInput.value = formatEasternTimeInputForDisplay(date, elements.shiftStartInput.value || "09:00");
  }
  if (elements.shiftEndInput) {
    elements.shiftEndInput.value = formatEasternTimeInputForDisplay(date, elements.shiftEndInput.value || "17:00");
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

function captureSlotFormTimes(timezone) {
  if (!elements.slotStartInput || !elements.slotEndInput) {
    return null;
  }

  const date = elements.slotDateInput?.value || getScheduleReferenceDate();
  return {
    start: convertDisplayDateTimeToEastern(date, elements.slotStartInput.value, timezone).time,
    end: convertDisplayDateTimeToEastern(date, elements.slotEndInput.value, timezone).time
  };
}

function restoreSlotFormTimes(times) {
  if (!times) {
    return;
  }

  const date = elements.slotDateInput?.value || getScheduleReferenceDate();
  if (elements.slotStartInput) {
    elements.slotStartInput.value = formatEasternTimeInputForDisplay(date, times.start);
  }
  if (elements.slotEndInput) {
    elements.slotEndInput.value = formatEasternTimeInputForDisplay(date, times.end);
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
    window.alert("Pick a valid test date and ET time.");
    return;
  }

  debugTimeOverride = { date, time };
  devModeUnlocked = true;
  saveDebugTimeOverride();
  selectedAssigneeId = null;
  refreshAfterEffectiveTimeChange();
}

function resetDebugTimeOverride() {
  clearDevModeState();
  selectedAssigneeId = null;
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
  elements.assignmentSystemSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select coverage";
  elements.assignmentSystemSelect.append(placeholder);

  data.systems.forEach((system) => {
    const option = document.createElement("option");
    option.value = system.id;
    option.textContent = system.name;
    elements.assignmentSystemSelect.append(option);
  });

  if (data.systems.some((system) => system.id === selectedValue)) {
    elements.assignmentSystemSelect.value = selectedValue;
  } else {
    elements.assignmentSystemSelect.value = "";
  }
}

function renderUserSelectors() {
  fillUserSelect(elements.scheduleUserSelect);
  fillUserSelect(elements.timelineUserSelect);
  fillUserSelect(elements.holidayUserSelect, true);
}

function fillUserSelect(select, includeAllUsers = false) {
  if (!select) {
    return;
  }

  const selectedValue = select.value;
  select.innerHTML = "";

  if (includeAllUsers) {
    const allOption = document.createElement("option");
    allOption.value = GLOBAL_HOLIDAY_USER_ID;
    allOption.textContent = "All users";
    select.append(allOption);
  }

  data.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.name;
    select.append(option);
  });

  if ([...select.options].some((option) => option.value === selectedValue)) {
    select.value = selectedValue;
  }
}

function renderShiftTemplateSelect() {
  if (!elements.shiftTemplateSelect) {
    return;
  }

  const selectedValue = elements.shiftTemplateSelect.value || "regular";
  const date = getScheduleReferenceDate();
  const abbreviation = getSelectedTimezoneAbbreviationForDate(date);
  elements.shiftTemplateSelect.innerHTML = "";

  data.shiftTemplates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = `${template.name} · ${formatEasternTimeInputForDisplay(date, template.start)}–${formatEasternTimeInputForDisplay(date, template.end)} ${abbreviation}`;
    elements.shiftTemplateSelect.append(option);
  });

  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "Custom time";
  elements.shiftTemplateSelect.append(customOption);

  elements.shiftTemplateSelect.value = data.shiftTemplates.some((template) => template.id === selectedValue)
    ? selectedValue
    : "custom";
}

function renderShifts() {
  if (!elements.shiftsList) {
    return;
  }

  const date = getScheduleReferenceDate();
  const abbreviation = getSelectedTimezoneAbbreviationForDate(date);
  const rows = data.shiftTemplates.map((template) => `
    <div class="shift-row" data-shift-id="${escapeHtml(template.id)}">
      <div class="shift-row-fields">
        <label class="field shift-name-control">
          <span>Name</span>
          <input class="shift-name-field" type="text" value="${escapeHtml(template.name)}">
        </label>
        <label class="field shift-time-control">
          <span>Start ${escapeHtml(abbreviation)}</span>
          <input class="shift-start-field" type="time" value="${escapeHtml(formatEasternTimeInputForDisplay(date, template.start))}">
        </label>
        <label class="field shift-time-control">
          <span>End ${escapeHtml(abbreviation)}</span>
          <input class="shift-end-field" type="time" value="${escapeHtml(formatEasternTimeInputForDisplay(date, template.end))}">
        </label>
      </div>
      <div class="item-actions shift-row-actions">
        <button class="small-button" type="button" data-action="update-shift" data-shift-id="${escapeHtml(template.id)}">Update</button>
        <button class="remove-button" type="button" data-action="remove-shift" data-shift-id="${escapeHtml(template.id)}">Remove</button>
      </div>
    </div>
  `).join("");

  elements.shiftsList.innerHTML = rows || emptyState("No shifts yet.");
  elements.shiftsList.querySelectorAll("[data-action='update-shift']").forEach((button) => {
    button.addEventListener("click", () => updateShiftTemplate(button.dataset.shiftId));
  });
  elements.shiftsList.querySelectorAll("[data-action='remove-shift']").forEach((button) => {
    button.addEventListener("click", () => removeShiftTemplate(button.dataset.shiftId));
  });
}

function renderShiftAddForm() {
  if (!elements.addShiftForm || !elements.showAddShiftButton) {
    return;
  }

  elements.addShiftForm.classList.toggle("hidden", !shiftAddFormOpen);
  elements.showAddShiftButton.textContent = shiftAddFormOpen ? "Close" : "Add shift";
  elements.showAddShiftButton.setAttribute("aria-expanded", String(shiftAddFormOpen));
}

function toggleShiftAddForm() {
  if (!isAdminTabUnlocked("shifts")) {
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
}

function renderAssignmentRules() {
  if (!elements.assignmentPolicyDescriptions) {
    return;
  }

  selectedAssignmentPolicyId = getAssignmentRulePreset(selectedAssignmentPolicyId || data.assignmentRules?.preset).id;
  renderAssignmentPolicyDescriptions();
}

function renderAssignmentPolicyDescriptions() {
  if (!elements.assignmentPolicyDescriptions) {
    return;
  }

  const selectedPreset = getAssignmentRulePreset(selectedAssignmentPolicyId || data.assignmentRules?.preset);
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
      <button class="${unlocked ? "secondary-button" : "primary-button"}" type="button" data-lock-action="${unlocked ? "lock" : "unlock"}" data-tab="${escapeHtml(tabName)}">
        ${unlocked ? "Lock" : "Unlock changes"}
      </button>
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
  if (tabName) {
    unlockedAdminTabs.delete(tabName);
  }

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
        return;
      }

      applyPersistedData(result.data, result.revision);
      render();
      if (options.showToast !== false) {
        showSaveToast(message);
      }
    })
    .catch((error) => {
      handleSharedStateSaveError(error);
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

function isShiftOrderPolicy() {
  return getAssignmentRulePreset(data.assignmentRules?.preset).id === SHIFT_ORDER_PRESET_ID;
}

function getAssignmentQueueSystemId() {
  return isShiftOrderPolicy()
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

  elements.markAssignedButton.disabled = !selectedRow.selectable;
}

function renderQueue(queueState) {
  if (!elements.queueList) {
    return;
  }

  if (!queueState.system) {
    elements.queueList.innerHTML = "";
    return;
  }

  const rows = queueState.rows.map((row, index) => {
    const selectedClass = row.user.id === selectedAssigneeId ? " selected" : "";
    const disabled = row.selectable ? "" : "disabled";
    const metricText = `${row.dailyTickets} today · ${row.consecutiveTickets} in a row`;
    const fallbackDisclaimer = row.user.id === selectedAssigneeId && !row.isCoverageMember
      ? "<span class=\"queue-disclaimer\">Fallback pick — not an SME for this coverage.</span>"
      : "";
    return `
      <div class="queue-step queue-rank-${index % 5} ${row.status}${selectedClass}">
        <div class="queue-stop" aria-hidden="true">
          <span>${index + 1}</span>
        </div>
        <button class="queue-card ${row.status}${selectedClass}" type="button" data-user-id="${escapeHtml(row.user.id)}" ${disabled}>
          <span class="queue-card-header">
            <span class="queue-position">${getOrdinalLabel(index + 1)} in queue</span>
            ${renderQueueStatusBadge(row, { showWaitTime: true })}
          </span>
          <span class="queue-name">${escapeHtml(row.user.name)}</span>
          <span class="meta">${escapeHtml(getQueueCardMessage(row))}</span>
          <span class="queue-metrics">${escapeHtml(metricText)}</span>
          ${fallbackDisclaimer}
        </button>
      </div>
    `;
  }).join("");

  elements.queueList.innerHTML = rows || emptyState("No SMEs are assigned to this system/app yet.");
  elements.queueList.querySelectorAll(".queue-card").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAssigneeId = button.dataset.userId;
      renderClockAndAssignment();
    });
  });
}

function renderQueueDashboard(easternNow) {
  if (!elements.queueDashboardPanel || !elements.queueDashboardList) {
    return;
  }

  const shiftOrderMode = isShiftOrderPolicy();
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

  const cards = data.systems.map((system) => {
    const queueState = getQueueState(system.id, easternNow);
    const coverageTicketCount = getDailyCoverageAssignmentCount(system, queueState.effectiveNow.date);
    const rows = queueState.rows.map((row, index) => {
      const nextClass = index === 0 ? " next" : "";
      const metricText = `${row.dailyTickets} today · ${row.consecutiveTickets} in a row`;
      return `
        <li class="dashboard-queue-row ${row.status}${nextClass}">
          <span class="dashboard-queue-number">${index + 1}</span>
          <span class="dashboard-queue-person">
            <strong>${escapeHtml(row.user.name)}</strong>
            <small>${escapeHtml(metricText)}</small>
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
}

function buildIncidentHandoffUrl(entry) {
  const url = new URL(INCIDENT_CREATE_URL);
  url.searchParams.set("assignee", entry.userName || "");
  url.searchParams.set("coverage", entry.systemName || "");
  return url.toString();
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
}

function renderAssignmentConfirmationItem(entry) {
  return `
    <div class="list-item assignment-log-item assignment-confirmation-item">
      <div>
        <div class="item-title">${escapeHtml(entry.userName || "Removed user")}</div>
        <div class="meta">${escapeHtml(entry.systemName || "Removed system")}</div>
      </div>
      <div class="assignment-confirmation-actions">
        <span class="assignment-done-badge">Assigned</span>
        <a class="primary-button incident-action-link" href="${escapeHtml(buildIncidentHandoffUrl(entry))}">Create incident</a>
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
  const doneBadge = options.showDoneBadge
    ? "<span class=\"assignment-done-badge\">Assigned</span>"
    : "";
  const actions = options.allowActions
    ? `
      <div class="item-actions">
        <button class="small-button" type="button" data-action="edit-assignment" data-assignment-id="${escapeHtml(entry.id)}">Edit</button>
        <button class="remove-button" type="button" data-action="delete-assignment" data-assignment-id="${escapeHtml(entry.id)}">Delete</button>
      </div>
    `
    : "";
  return `
    <div class="list-item assignment-log-item">
      <div>
        <div class="item-title">${escapeHtml(entry.userName || "Removed user")}</div>
        <div class="meta">${escapeHtml(entry.systemName || "Removed system")} · ${escapeHtml(assignedAt)}${escapeHtml(amendedText)}</div>
      </div>
      ${doneBadge}
      ${actions}
    </div>
  `;
}

function renderAssignmentEditor(entry) {
  const shiftQueueOption = (isShiftOrderPolicy() || entry.systemId === SHIFT_QUEUE_SYSTEM_ID)
    ? `<option value="${SHIFT_QUEUE_SYSTEM_ID}" ${entry.systemId === SHIFT_QUEUE_SYSTEM_ID ? "selected" : ""}>${SHIFT_QUEUE_SYSTEM_NAME}</option>`
    : "";
  const systemOptions = shiftQueueOption + data.systems.map((system) => `
    <option value="${escapeHtml(system.id)}" ${system.id === entry.systemId ? "selected" : ""}>${escapeHtml(system.name)}</option>
  `).join("");
  const userOptions = data.users.map((user) => `
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
      <div class="assignment-edit-meta">Original time: ${escapeHtml(formatAssignmentTimestamp(entry))}</div>
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

  const system = getAssignmentSystemById(getAssignmentEditValue(form, "systemId"));
  const user = data.users.find((item) => item.id === getAssignmentEditValue(form, "userId"));
  if (!system || !user) {
    window.alert("Choose a valid queue and user.");
    return;
  }

  entry.systemId = system.id;
  entry.systemName = system.name;
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
  if (!entry || !window.confirm("Delete this ticket assignment?")) {
    return;
  }

  data.assignmentLog = data.assignmentLog.filter((assignment) => assignment.id !== assignmentId);
  if (lastAssignmentId === assignmentId) {
    lastAssignmentId = null;
  }
  editingAssignmentId = null;
  completeDataSave("Assignment deleted.", { showToast: true });
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
  selectedAssigneeId = null;
  lastAssignmentId = null;
  renderClockAndAssignment();
  elements.queueSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderUsers() {
  if (!elements.usersList) {
    return;
  }

  const rows = data.users.map((user, index) => {
    const moveUpDisabled = index === 0 ? "disabled" : "";
    const moveDownDisabled = index === data.users.length - 1 ? "disabled" : "";
    return `
      <div class="list-item team-member-row">
        <div class="team-rank">#${index + 1}</div>
        <div class="team-member-main">
          <div class="item-title">${escapeHtml(user.name)}</div>
        </div>
        <div class="item-actions team-member-actions">
          <button class="small-button hierarchy-button" type="button" data-action="move-team-user" data-user-id="${escapeHtml(user.id)}" data-direction="-1" aria-label="Move ${escapeHtml(user.name)} up" ${moveUpDisabled}>↑</button>
          <button class="small-button hierarchy-button" type="button" data-action="move-team-user" data-user-id="${escapeHtml(user.id)}" data-direction="1" aria-label="Move ${escapeHtml(user.name)} down" ${moveDownDisabled}>↓</button>
          <button class="remove-button team-remove-button" type="button" data-action="remove-user" data-user-id="${escapeHtml(user.id)}">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  elements.usersList.innerHTML = rows || emptyState("Add your first user.");
  elements.usersList.querySelectorAll("[data-action='move-team-user']").forEach((button) => {
    button.addEventListener("click", () => moveTeamUser(button.dataset.userId, Number(button.dataset.direction)));
  });
  elements.usersList.querySelectorAll("[data-action='remove-user']").forEach((button) => {
    button.addEventListener("click", () => removeUser(button.dataset.userId));
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
  if (!elements.timelineCanvas && !elements.slotsList) {
    return;
  }

  updateGraphDateCopy();
  renderTimeline();
  renderTimelineDraftActions();
  renderSlots();
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
  elements.timelineCanvas.innerHTML = `
    ${renderGraphTimeAxis(date)}
    ${rows || emptyState("Add users before viewing schedules.")}
  `;
}

function renderGraphTimeAxis(date) {
  const axisLabels = Array.from({ length: 9 }, (_, index) => {
    const easternTime = minutesToTime(TIMELINE_START_MINUTES + index * 120);
    return `<span>${escapeHtml(formatEasternTimeInputForDisplay(date, easternTime))}</span>`;
  }).join("");

  return `<div class="graph-time-axis">${axisLabels}</div>`;
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
        .filter((block) => block.type !== "break")
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
  elements.timelineCanvas.innerHTML = `
    <div class="week-row week-header">
      <div class="graph-user">User</div>
      ${header}
    </div>
    ${rows || emptyState("Add users before viewing schedules.")}
  `;
}

function getGraphBlocksForUser(user, date, day) {
  const holidays = getHolidaysForUser(user.id, date);
  if (holidays.length > 0) {
    return [{ type: "holiday", start: "06:00", end: "22:00", label: holidays.map((holiday) => holiday.name || "Holiday").join(", ") }];
  }

  const scheduleBlocks = getScheduleWindowsForDate(user, date, day)
    .map((window) => ({
      type: window.source === "extra" ? "extra" : "schedule",
      id: window.id,
      userId: user.id,
      date,
      start: window.start,
      end: window.end,
      priority: window.priority,
      label: window.source === "extra" ? "Extra" : "Schedule"
    }));

  const breakBlocks = data.exceptions
    .filter((slot) => slot.userId === user.id && slot.date === date && slot.type === "break")
    .map((slot) => ({
      type: "break",
      id: slot.id,
      userId: user.id,
      date,
      start: slot.start,
      end: slot.end,
      label: slot.reason || "Break"
    }));

  return scheduleBlocks.concat(breakBlocks).sort((left, right) => toMinutes(left.start) - toMinutes(right.start));
}

function getSortedGraphUserRowsForDate(date) {
  const day = getDayNameFromDate(date);
  return data.users
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
  return data.users
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
      start: toMinutes(block.start),
      priority: Number(block.priority || Number.MAX_SAFE_INTEGER)
    }))
    .sort(compareGraphSortKeys)[0];
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

function graphBlocksOverlap(leftBlock, rightBlock) {
  return toMinutes(leftBlock.start) < toMinutes(rightBlock.end) && toMinutes(rightBlock.start) < toMinutes(leftBlock.end);
}

function renderSlots() {
  if (!elements.slotsList) {
    return;
  }

  const today = getEasternNow().date;
  const rows = data.exceptions
    .slice()
    .filter((slot) => isValidDateInput(slot.date || "") && slot.date >= today)
    .sort((left, right) => `${left.date} ${left.start}`.localeCompare(`${right.date} ${right.start}`))
    .map((slot) => {
      const user = data.users.find((item) => item.id === slot.userId);
      const abbreviation = getSelectedTimezoneAbbreviationForDate(slot.date);
      const start = formatEasternTimeInputForDisplay(slot.date, slot.start);
      const end = formatEasternTimeInputForDisplay(slot.date, slot.end);
      return `
        <div class="list-item">
          <div>
            <div class="item-title">${escapeHtml(slot.reason || "No comment")}</div>
            <div class="meta">${escapeHtml(user?.name || "Removed user")} · ${formatDisplayDate(slot.date)} · ${start}–${end} ${escapeHtml(abbreviation)}</div>
          </div>
          <button class="remove-button" type="button" data-action="remove-slot" data-slot-id="${escapeHtml(slot.id)}">Remove</button>
        </div>
      `;
    }).join("");

  elements.slotsList.innerHTML = rows || emptyState("No current or upcoming breaks or extra slots.");
  elements.slotsList.querySelectorAll("[data-action='remove-slot']").forEach((button) => {
    button.addEventListener("click", () => removeTimelineSlot(button.dataset.slotId));
  });
}

function renderSystems() {
  if (!elements.systemsList) {
    return;
  }

  const rows = data.systems.map((system) => {
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
          </div>
        </div>
      `;
    }).join("");

    const coverageRows = data.users.map((user) => `
      <label class="coverage-chip">
        <input type="checkbox" data-action="toggle-coverage" data-system-id="${escapeHtml(system.id)}" data-user-id="${escapeHtml(user.id)}" ${system.primaryUserIds.includes(user.id) ? "checked" : ""}>
        <span>${escapeHtml(user.name)}</span>
      </label>
    `).join("");

    return `
      <article class="system-card">
        <div class="system-card-header">
          <div>
            <h3>${escapeHtml(system.name)}</h3>
          </div>
          <button class="remove-button subtle-danger" type="button" data-action="remove-system" data-system-id="${escapeHtml(system.id)}">Remove</button>
        </div>
        <div class="coverage-section">
          <div class="coverage-section-label">Team</div>
          <div class="coverage-grid">${coverageRows || emptyState("Add users first.")}</div>
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
  elements.systemsList.querySelectorAll("[data-action='move-user']").forEach((button) => {
    button.addEventListener("click", () => moveCoveredUser(button.dataset.systemId, button.dataset.userId, Number(button.dataset.direction)));
  });
  elements.systemsList.querySelectorAll("[data-action='remove-system']").forEach((button) => {
    button.addEventListener("click", () => removeSystem(button.dataset.systemId));
  });
}

function renderHolidays() {
  if (!elements.holidaysList) {
    return;
  }

  const rows = data.holidays
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((holiday) => {
      const userName = getHolidayUserName(holiday);
      return `
        <div class="list-item">
          <div>
            <div class="item-title">${escapeHtml(userName)}</div>
            <div class="meta">${escapeHtml(formatHolidayDate(holiday.date))} · ${escapeHtml(holiday.name || "Holiday")}</div>
          </div>
          <button class="remove-button" type="button" data-action="remove-holiday" data-holiday-id="${escapeHtml(holiday.id)}">Remove</button>
        </div>
      `;
    }).join("");

  elements.holidaysList.innerHTML = rows || emptyState("No holidays yet.");
  elements.holidaysList.querySelectorAll("[data-action='remove-holiday']").forEach((button) => {
    button.addEventListener("click", () => removeHoliday(button.dataset.holidayId));
  });
}

function renderDataPreview() {
  if (!elements.dataPreview) {
    return;
  }

  elements.dataPreview.value = JSON.stringify(data, null, 2);
}

function saveAssignmentRules(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("rules")) {
    return;
  }

  data.assignmentRules = {
    preset: getAssignmentRulePreset(selectedAssignmentPolicyId || data.assignmentRules?.preset).id
  };
  completeAdminSave("Assignment rules saved.", "rules");
}

function addShiftTemplate(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("shifts")) {
    return;
  }

  const name = elements.shiftNameInput.value.trim();
  const displayStart = elements.shiftStartInput.value;
  const displayEnd = elements.shiftEndInput.value;

  if (!name || !isValidTimeRange(displayStart, displayEnd)) {
    window.alert("Add a shift name and valid start/end times.");
    return;
  }

  const date = getScheduleReferenceDate();
  const start = convertDisplayDateTimeToEastern(date, displayStart).time;
  const end = convertDisplayDateTimeToEastern(date, displayEnd).time;

  data.shiftTemplates.push({
    id: makeId(name, data.shiftTemplates.map((template) => template.id)),
    name,
    start,
    end
  });

  shiftAddFormOpen = false;
  resetShiftAddForm();
  completeAdminSave("Shift saved.", "shifts");
}

function updateShiftTemplate(shiftId) {
  if (!isAdminTabUnlocked("shifts")) {
    return;
  }

  const row = elements.shiftsList.querySelector(`[data-shift-id="${cssEscape(shiftId)}"]`);
  const template = data.shiftTemplates.find((item) => item.id === shiftId);
  if (!row || !template) {
    return;
  }

  const name = row.querySelector(".shift-name-field").value.trim();
  const displayStart = row.querySelector(".shift-start-field").value;
  const displayEnd = row.querySelector(".shift-end-field").value;

  if (!name || !isValidTimeRange(displayStart, displayEnd)) {
    window.alert("Shifts need a name and valid start/end times.");
    return;
  }

  const date = getScheduleReferenceDate();
  template.name = name;
  template.start = convertDisplayDateTimeToEastern(date, displayStart).time;
  template.end = convertDisplayDateTimeToEastern(date, displayEnd).time;
  completeAdminSave("Shift saved.", "shifts");
}

function removeShiftTemplate(shiftId) {
  if (!isAdminTabUnlocked("shifts")) {
    return;
  }

  const template = data.shiftTemplates.find((item) => item.id === shiftId);
  if (!template) {
    return;
  }

  openRemoveShiftModal(template);
}

function openRemoveShiftModal(template) {
  if (!elements.removeShiftModal) {
    performRemoveShiftTemplate(template.id);
    return;
  }

  pendingRemoveShiftId = template.id;
  if (elements.removeShiftModalName) {
    const date = getScheduleReferenceDate();
    const abbreviation = getSelectedTimezoneAbbreviationForDate(date);
    elements.removeShiftModalName.textContent = `${template.name} · ${formatEasternTimeInputForDisplay(date, template.start)}–${formatEasternTimeInputForDisplay(date, template.end)} ${abbreviation}`;
  }
  if (elements.removeShiftModalImpact) {
    elements.removeShiftModalImpact.textContent = getRemoveShiftImpactText(template);
  }

  elements.removeShiftModal.classList.remove("hidden");
  elements.removeShiftModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.cancelRemoveShiftButton?.focus(), 0);
}

function closeRemoveShiftModal() {
  pendingRemoveShiftId = null;
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
  closeRemoveShiftModal();
  performRemoveShiftTemplate(shiftId);
}

function performRemoveShiftTemplate(shiftId) {
  data.shiftTemplates = data.shiftTemplates.filter((item) => item.id !== shiftId);
  data.users.forEach((user) => {
    user.schedules.forEach((schedule) => {
      if (schedule.shiftType === shiftId) {
        schedule.shiftType = "custom";
      }
    });
  });
  completeAdminSave("Shift removed.", "shifts");
}

function getRemoveShiftImpactText(template) {
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

  data.users.push({
    id: makeId(name, data.users.map((user) => user.id)),
    name,
    schedules: []
  });

  elements.addUserForm.reset();
  completeAdminSave("User saved.", "users");
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
  data.exceptions = data.exceptions.filter((slot) => slot.userId !== userId);
  data.holidays = data.holidays.filter((holiday) => holiday.userId !== userId);
  data.systems.forEach((system) => {
    system.primaryUserIds = system.primaryUserIds.filter((id) => id !== userId);
    clampQueue(system.id);
  });
  selectedAssigneeId = null;
  completeAdminSave("User removed.", "users");
}

function getRemoveUserImpactText(user) {
  const scheduleCount = user.schedules.length;
  const slotCount = data.exceptions.filter((slot) => slot.userId === user.id).length;
  const holidayCount = data.holidays.filter((holiday) => holiday.userId === user.id).length;
  const coverageCount = data.systems.filter((system) => system.primaryUserIds.includes(user.id)).length;
  const impact = [
    `${scheduleCount} schedule${scheduleCount === 1 ? "" : "s"}`,
    `${slotCount} break/extra slot${slotCount === 1 ? "" : "s"}`,
    `${holidayCount} holiday${holidayCount === 1 ? "" : "s"}`,
    `${coverageCount} coverage mapping${coverageCount === 1 ? "" : "s"}`
  ].join(", ");

  return `This will remove ${impact}. Existing ticket history remains visible.`;
}

function moveTeamUser(userId, direction) {
  if (!isAdminTabUnlocked("users")) {
    return;
  }

  const currentIndex = data.users.findIndex((user) => user.id === userId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= data.users.length) {
    return;
  }

  const [user] = data.users.splice(currentIndex, 1);
  data.users.splice(nextIndex, 0, user);
  completeAdminSave("Team hierarchy updated.", "users");
}

function applyShiftTemplate() {
  const template = getShiftTemplate(elements.shiftTemplateSelect.value);
  if (!template || elements.shiftTemplateSelect.value === "custom") {
    return;
  }

  const date = getScheduleReferenceDate();
  elements.scheduleStartInput.value = formatEasternTimeInputForDisplay(date, template.start);
  elements.scheduleEndInput.value = formatEasternTimeInputForDisplay(date, template.end);
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
    window.alert("Add a user before adding a schedule.");
    return;
  }

  const days = [...elements.dayCheckboxes.querySelectorAll("input:checked")].map((input) => input.value);
  if (days.length === 0) {
    window.alert("Choose at least one day.");
    return;
  }

  const displayStart = elements.scheduleStartInput.value;
  const displayEnd = elements.scheduleEndInput.value;
  if (!isValidTimeRange(displayStart, displayEnd)) {
    window.alert("Schedule start and end cannot be the same.");
    return;
  }

  const date = getScheduleReferenceDate();
  const start = convertDisplayDateTimeToEastern(date, displayStart).time;
  const end = convertDisplayDateTimeToEastern(date, displayEnd).time;
  const dateRange = getScheduleDateRangeFromForm();
  if (!dateRange) {
    return;
  }

  if (editingSchedule) {
    updateSchedule(user, days, start, end, dateRange);
    return;
  }

  const conflictDays = getScheduleDayConflicts(user, days, dateRange);
  if (conflictDays.length > 0) {
    window.alert(formatScheduleConflictMessage(user, conflictDays));
    return;
  }

  user.schedules.push({
    id: makeRecordId("schedule"),
    shiftType: elements.shiftTemplateSelect.value,
    days,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    start,
    end
  });

  completeAdminSave("Schedule saved.");
}

function updateSchedule(user, days, start, end, dateRange) {
  const originalUser = data.users.find((item) => item.id === editingSchedule.userId);
  const schedule = originalUser?.schedules.find((item) => item.id === editingSchedule.scheduleId);
  if (!schedule) {
    editingSchedule = null;
    renderScheduleFormMode();
    window.alert("This schedule no longer exists.");
    return;
  }

  const ignoredScheduleId = user.id === originalUser.id ? schedule.id : null;
  const conflictDays = getScheduleDayConflicts(user, days, dateRange, ignoredScheduleId);
  if (conflictDays.length > 0) {
    window.alert(formatScheduleConflictMessage(user, conflictDays));
    return;
  }

  const updatedSchedule = {
    ...schedule,
    shiftType: elements.shiftTemplateSelect.value,
    days,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    start,
    end
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
    window.alert("Choose valid schedule dates.");
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
  const start = formatEasternTimeInputForDisplay(date, schedule.start);
  const end = formatEasternTimeInputForDisplay(date, schedule.end);
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

function addTimelineSlot(event) {
  event.preventDefault();
  const user = data.users.find((item) => item.id === elements.timelineUserSelect.value);
  if (!user) {
    window.alert("Add a user before adding a timeline slot.");
    return;
  }

  const displayStart = elements.slotStartInput.value;
  const displayEnd = elements.slotEndInput.value;
  if (!isValidTimeRange(displayStart, displayEnd)) {
    window.alert("Slot start and end cannot be the same.");
    return;
  }

  if (!elements.slotDateInput.value) {
    window.alert("Choose a break or extra slot date.");
    return;
  }

  const reason = elements.slotReasonInput.value.trim();
  if (!reason) {
    window.alert("Add a comment.");
    return;
  }

  const start = convertDisplayDateTimeToEastern(elements.slotDateInput.value, displayStart);
  const end = convertDisplayDateTimeToEastern(elements.slotDateInput.value, displayEnd);
  data.exceptions.push({
    id: makeRecordId("slot"),
    userId: user.id,
    date: start.date,
    type: inferTimelineSlotType(user, start.date, start.time, end.time),
    start: start.time,
    end: end.time,
    reason
  });

  elements.slotReasonInput.value = "";
  completeAdminSave("Timeline slot saved.");
}

function inferTimelineSlotType(user, date, start, end) {
  const day = getDayNameFromDate(date);
  const overlapsSchedule = user.schedules.some((schedule) => (
    isScheduleActiveOnDate(schedule, date, day)
      && isValidTimeRange(schedule.start, schedule.end)
      && graphBlocksOverlap({ start, end }, schedule)
  ));

  return overlapsSchedule ? "break" : "extra";
}

function removeTimelineSlot(slotId) {
  data.exceptions = data.exceptions.filter((slot) => slot.id !== slotId);
  completeAdminSave("Timeline slot removed.");
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
    const draftStart = toMinutes(existingDraft.start);
    const draftEnd = toMinutes(existingDraft.end);
    timelineDrag = {
      mode: "move",
      draftId: existingDraft.id,
      pointerId: event.pointerId,
      lane,
      userId: lane.dataset.userId,
      date: lane.dataset.date,
      durationMinutes: Math.max(draftEnd - draftStart, SLOT_MINUTES),
      pointerOffsetMinutes: pointerMinutes - draftStart
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
  upsertTimelineDraft({
    id: timelineDrag.draftId,
    userId: timelineDrag.userId,
    date: timelineDrag.date,
    start: minutesToTime(range.start),
    end: minutesToTime(range.end)
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

function clearLiveDraftOverlays() {
  elements.timelineCanvas?.querySelectorAll(".graph-lane").forEach((lane) => {
    lane.querySelectorAll("[data-live-draft], .graph-edge-label.draft, .graph-block.draft").forEach((element) => element.remove());
    lane.classList.remove("has-draft", "moving-draft");
  });
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
  const first = Math.min(anchorMinutes, currentMinutes);
  const last = Math.max(anchorMinutes, currentMinutes);
  const start = Math.min(Math.max(first, TIMELINE_START_MINUTES), TIMELINE_END_MINUTES - SLOT_MINUTES);
  const end = Math.min(Math.max(last, start + SLOT_MINUTES), TIMELINE_END_MINUTES);
  return { start, end };
}

function normalizeMovedTimelineDraftRange(currentMinutes, pointerOffsetMinutes, durationMinutes) {
  const duration = Math.max(durationMinutes, SLOT_MINUTES);
  const maxStart = TIMELINE_END_MINUTES - duration;
  const rawStart = currentMinutes - pointerOffsetMinutes;
  const start = Math.min(Math.max(roundToNearestSlot(rawStart), TIMELINE_START_MINUTES), maxStart);
  return { start, end: start + duration };
}

function getTimelineMinutesFromPointer(lane, clientX) {
  const rect = lane.getBoundingClientRect();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  const rawMinutes = TIMELINE_START_MINUTES + ratio * (TIMELINE_END_MINUTES - TIMELINE_START_MINUTES);
  return Math.min(Math.max(roundToNearestSlot(rawMinutes), TIMELINE_START_MINUTES), TIMELINE_END_MINUTES);
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
    window.alert(formatScheduleConflictMessage(conflict.user, conflict.conflictDays));
    return;
  }

  let savedCount = 0;
  timelineDrafts.forEach((draft) => {
    const user = data.users.find((item) => item.id === draft.userId);
    if (!user) {
      return;
    }

    user.schedules.push({
      id: makeRecordId("schedule"),
      shiftType: "custom",
      days: [getDayNameFromDate(draft.date)],
      startDate: draft.date,
      endDate: draft.date,
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
  const abbreviation = getSelectedTimezoneAbbreviationForDate(draft.date);
  const start = formatEasternTimeInputForDisplay(draft.date, draft.start);
  const end = formatEasternTimeInputForDisplay(draft.date, draft.end);
  return `${user?.name || "Removed user"} · ${getDayNameFromDate(draft.date).slice(0, 3)} · ${start}–${end} ${abbreviation}`;
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

    const day = getDayNameFromDate(draft.date);
    const draftDateRange = { startDate: draft.date, endDate: draft.date };
    const existingConflicts = getScheduleDayConflicts(user, [day], draftDateRange);
    if (existingConflicts.length > 0) {
      return { user, conflictDays: existingConflicts };
    }

    if (!SCHEDULE_DAYS.includes(day)) {
      continue;
    }

    const proposedDays = proposedDaysByUser.get(user.id) || new Set();
    const proposedKey = `${draft.date}:${day}`;
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

    const template = getShiftTemplate(elements.shiftTemplateSelect?.value) || getShiftTemplate("regular") || data.shiftTemplates[0];
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
    days: schedule.days,
    shiftType: schedule.shiftType,
    startDate: isValidDateInput(schedule.startDate || "") ? schedule.startDate : getWeekDates(date)[0],
    endDate: isValidDateInput(schedule.endDate || "") ? schedule.endDate : getWeekDates(date)[4]
  });
}

function prefillScheduleForm(userId, date, start, end, forceCustom, options = {}) {
  const displayStart = formatEasternTimeInputForDisplay(date, start);
  const displayEnd = formatEasternTimeInputForDisplay(date, end);
  editingSchedule = options.scheduleId ? { userId, scheduleId: options.scheduleId } : null;
  const weekDates = getWeekDates(date);
  const startDate = options.startDate ? getBusinessWeekRange(options.startDate).startDate : weekDates[0];
  const endDate = options.endDate ? getBusinessWeekRange(options.endDate).endDate : weekDates[4];

  if (elements.scheduleUserSelect) {
    elements.scheduleUserSelect.value = userId;
  }

  if (elements.timelineUserSelect) {
    elements.timelineUserSelect.value = userId;
  }

  if (elements.shiftTemplateSelect) {
    const optionValues = [...elements.shiftTemplateSelect.options].map((option) => option.value);
    if (options.shiftType && optionValues.includes(options.shiftType)) {
      elements.shiftTemplateSelect.value = options.shiftType;
    } else if (forceCustom) {
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

  if (elements.slotStartInput) {
    elements.slotStartInput.value = displayStart;
  }

  if (elements.slotEndInput) {
    elements.slotEndInput.value = displayEnd;
  }

  selectScheduleDays(options.days || [getDayNameFromDate(date)]);
  updateScheduleRangeConstraints();
  renderScheduleFormMode();
}

function selectOnlyScheduleDay(day) {
  selectScheduleDays([day]);
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
  data.systems.push({ id, name, primaryUserIds: [] });
  data.queues[id] = 0;
  elements.addSystemForm.reset();
  completeAdminSave("System saved.", "systems");
}

function removeSystem(systemId) {
  if (!isAdminTabUnlocked("systems")) {
    return;
  }

  const system = data.systems.find((item) => item.id === systemId);
  if (!system || !window.confirm(`Remove ${system.name}?`)) {
    return;
  }

  data.systems = data.systems.filter((item) => item.id !== systemId);
  delete data.queues[systemId];
  selectedAssigneeId = null;
  completeAdminSave("System removed.", "systems");
}

function toggleCoverage(systemId, userId, checked) {
  if (!isAdminTabUnlocked("systems")) {
    return;
  }

  const system = data.systems.find((item) => item.id === systemId);
  if (!system) {
    return;
  }

  if (checked && !system.primaryUserIds.includes(userId)) {
    system.primaryUserIds.push(userId);
  }

  if (!checked) {
    system.primaryUserIds = system.primaryUserIds.filter((id) => id !== userId);
  }

  clampQueue(systemId);
  selectedAssigneeId = null;
  completeAdminSave("Coverage mapping saved.", "systems");
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
  clampQueue(systemId);
  selectedAssigneeId = null;
  completeAdminSave("System priority saved.", "systems");
}

function addHoliday(event) {
  event.preventDefault();
  if (!isAdminTabUnlocked("holidays")) {
    return;
  }

  if (!elements.holidayDateInput.value) {
    window.alert("Choose a holiday date.");
    return;
  }

  data.holidays.push({
    id: makeRecordId("holiday"),
    userId: elements.holidayUserSelect.value,
    date: elements.holidayDateInput.value,
    name: elements.holidayNameInput.value.trim() || "Holiday"
  });

  elements.holidayNameInput.value = "";
  completeAdminSave("Holiday saved.", "holidays");
}

function removeHoliday(holidayId) {
  if (!isAdminTabUnlocked("holidays")) {
    return;
  }

  const holiday = data.holidays.find((item) => item.id === holidayId);
  if (!holiday) {
    return;
  }

  openRemoveHolidayModal(holiday);
}

function openRemoveHolidayModal(holiday) {
  if (!elements.removeHolidayModal) {
    performRemoveHoliday(holiday.id);
    return;
  }

  pendingRemoveHolidayId = holiday.id;
  if (elements.removeHolidayModalName) {
    elements.removeHolidayModalName.textContent = `${holiday.name || "Holiday"} · ${formatHolidayDate(holiday.date)}`;
  }
  if (elements.removeHolidayModalImpact) {
    const userName = getHolidayUserName(holiday);
    const scopeText = holiday.userId === GLOBAL_HOLIDAY_USER_ID
      ? "all users"
      : userName;
    elements.removeHolidayModalImpact.textContent = `This removes the holiday for ${scopeText}. Queue availability will update immediately.`;
  }

  elements.removeHolidayModal.classList.remove("hidden");
  elements.removeHolidayModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => elements.cancelRemoveHolidayButton?.focus(), 0);
}

function closeRemoveHolidayModal() {
  pendingRemoveHolidayId = null;
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
  closeRemoveHolidayModal();
  performRemoveHoliday(holidayId);
}

function performRemoveHoliday(holidayId) {
  data.holidays = data.holidays.filter((holiday) => holiday.id !== holidayId);
  completeAdminSave("Holiday removed.", "holidays");
}

function getHolidayUserName(holiday) {
  return holiday.userId === GLOBAL_HOLIDAY_USER_ID
    ? "All users"
    : data.users.find((user) => user.id === holiday.userId)?.name || "Removed user";
}

function formatHolidayDate(date) {
  return isValidDateInput(date || "") ? formatDisplayDate(date) : date || "No date";
}

function markSelectedAssigned() {
  const easternNow = getEasternNow();
  const queueState = getQueueState(getAssignmentQueueSystemId(), easternNow);
  const selectedRow = queueState.rows.find((row) => row.user.id === selectedAssigneeId);
  if (!queueState.system || !selectedRow || !selectedRow.selectable) {
    return;
  }

  const assignmentRecord = {
    id: makeRecordId("assignment"),
    assignedAt: new Date().toISOString(),
    easternDate: queueState.effectiveNow.date,
    easternTime: queueState.effectiveNow.date === easternNow.date
      ? easternNow.time
      : minutesToTime(selectedRow.availabilityStart),
    systemId: queueState.system.id,
    systemName: queueState.system.name,
    userId: selectedRow.user.id,
    userName: selectedRow.user.name
  };
  data.assignmentLog.push(assignmentRecord);
  lastAssignmentId = assignmentRecord.id;

  const originalIndex = queueState.system.primaryUserIds.indexOf(selectedRow.user.id);
  if (originalIndex >= 0) {
    data.queues[queueState.system.id] = (originalIndex + 1) % queueState.system.primaryUserIds.length;
  }

  selectedAssigneeId = null;
  completeDataSave("Ticket assigned.", { showToast: false });
}

function getQueueState(systemId, easternNow) {
  const system = getAssignmentSystemById(systemId);
  if (!system) {
    return { system: null, rows: [], recommendedRow: null, effectiveNow: easternNow };
  }

  const effectiveNow = getEffectiveQueueNow(easternNow);
  const isShiftQueue = system.id === SHIFT_QUEUE_SYSTEM_ID;
  const rows = data.users.map((user) => {
    const systemPriority = isShiftQueue ? -1 : system.primaryUserIds.indexOf(user.id);
    const isCoverageMember = isShiftQueue || systemPriority >= 0;
    const queuePriority = isShiftQueue ? Number.POSITIVE_INFINITY : getRotatedQueuePriority(system, systemPriority);
    const status = getUserStatus(user, effectiveNow);
    const waitMinutes = getAvailabilityWaitMinutes(easternNow, effectiveNow, status);
    const metrics = getAssignmentMetrics(user, systemPriority, queuePriority, effectiveNow, status, waitMinutes);
    return { user, isCoverageMember, effectiveDate: effectiveNow.date, effectiveDay: effectiveNow.day, ...status, ...metrics };
  }).sort(compareQueueRows);

  const recommendedRow = rows.find((row) => row.selectable) || null;

  return { system, rows, recommendedRow, effectiveNow };
}

function getAssignmentSystemById(systemId) {
  if (systemId === SHIFT_QUEUE_SYSTEM_ID) {
    return { id: SHIFT_QUEUE_SYSTEM_ID, name: SHIFT_QUEUE_SYSTEM_NAME, primaryUserIds: [] };
  }

  return data.systems.find((item) => item.id === systemId) || null;
}

function getRotatedQueuePriority(system, systemPriority) {
  if (!system.primaryUserIds.length || systemPriority < 0) {
    return Number.POSITIVE_INFINITY;
  }

  const queueIndex = getQueueIndex(system);
  return (systemPriority - queueIndex + system.primaryUserIds.length) % system.primaryUserIds.length;
}

function getAssignmentMetrics(user, systemPriority, queuePriority, easternNow, status, waitMinutes) {
  return {
    systemPriority: systemPriority >= 0 ? systemPriority : Number.POSITIVE_INFINITY,
    queuePriority,
    teamPriority: getTeamPriority(user.id),
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

  const preset = getAssignmentRulePreset(data.assignmentRules?.preset);
  for (const rule of preset.rules) {
    const difference = compareQueueRowsByRule(left, right, rule);
    if (difference !== 0) {
      return difference;
    }
  }

  return left.user.name.localeCompare(right.user.name);
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
  return (left.status === "available" && right.status === "available")
    || left.availabilityStart === right.availabilityStart;
}

function getTeamPriority(userId) {
  const index = data.users.findIndex((user) => user.id === userId);
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

function getEffectiveQueueNow(easternNow) {
  if (data.users.some((user) => getUserStatus(user, easternNow).selectable)) {
    return easternNow;
  }

  for (let offset = 1; offset <= 21; offset += 1) {
    const date = formatDate(addDays(parseDate(easternNow.date), offset));
    if (!isBusinessDay(date)) {
      continue;
    }

    const candidateNow = buildEasternNow(date, "00:00");
    if (data.users.some((user) => getUserStatus(user, candidateNow).selectable)) {
      return candidateNow;
    }
  }

  return easternNow;
}

function getAvailabilityWaitMinutes(referenceNow, effectiveNow, status) {
  if (status.status === "available") {
    return 0;
  }

  if (!Number.isFinite(status.availabilityStart)) {
    return Number.POSITIVE_INFINITY;
  }

  const dayOffset = getDateOffset(referenceNow.date, effectiveNow.date);
  return Math.max(0, dayOffset * 24 * 60 + status.availabilityStart - referenceNow.minutes);
}

function getDateOffset(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / millisecondsPerDay);
}

function isBusinessDay(date) {
  const day = getDayNameFromDate(date);
  return day !== "Saturday" && day !== "Sunday";
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
    .sort((left, right) => getAssignmentCreatedTimestamp(right) - getAssignmentCreatedTimestamp(left));
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

function getDailyCoverageAssignmentCount(system, date) {
  return data.assignmentLog.filter((entry) => (
    getAssignmentEntryDate(entry) === date && isAssignmentForSystem(entry, system)
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

function isAssignmentForSystem(entry, system) {
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

function getUserStatus(user, easternNow) {
  const holidayMatches = getHolidaysForUser(user.id, easternNow.date);
  if (holidayMatches.length > 0) {
    return {
      status: "holiday",
      badge: "Holiday",
      selectable: false,
      availabilityStart: Number.POSITIVE_INFINITY,
      message: `Holiday today: ${holidayMatches.map((holiday) => holiday.name || "Holiday").join(", ")}.`
    };
  }

  const windows = getScheduleWindowsForDate(user, easternNow.date, easternNow.day);
  const breaks = data.exceptions
    .filter((slot) => slot.userId === user.id && slot.date === easternNow.date && slot.type === "break")
    .map((slot) => ({ ...slot, startMinutes: toMinutes(slot.start), endMinutes: toMinutes(slot.end) }))
    .sort((left, right) => left.startMinutes - right.startMinutes);

  const currentBreak = breaks.find((slot) => isWithinWindow(easternNow.minutes, slot.startMinutes, slot.endMinutes));
  if (currentBreak) {
    const nextStart = findNextAvailableStart(easternNow.minutes, windows, breaks);
    if (nextStart !== null) {
      const nextStartDisplay = formatEasternTimeForDisplay(easternNow.date, minutesToTime(nextStart));
      return {
        status: "later",
        badge: "On break",
        selectable: true,
        availabilityStart: nextStart,
        message: `Currently on break${currentBreak.reason ? ` (${currentBreak.reason})` : ""}. Back at ${nextStartDisplay}. You can pick them anyway.`
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
    .filter((schedule) => isScheduleActiveOnDate(schedule, date, day))
    .map((schedule) => ({ id: schedule.id, source: "schedule", start: schedule.start, end: schedule.end }));

  const extraWindows = data.exceptions
    .filter((slot) => slot.userId === user.id && slot.date === date && slot.type === "extra")
    .map((slot) => ({ id: slot.id, source: "extra", start: slot.start, end: slot.end, priority: Number.MAX_SAFE_INTEGER }));

  return scheduleWindows
    .concat(extraWindows)
    .filter((window) => isValidTimeRange(window.start, window.end))
    .sort((left, right) => toMinutes(left.start) - toMinutes(right.start));
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

function getHolidaysForUser(userId, date) {
  return data.holidays.filter((holiday) => holiday.date === date && (holiday.userId === userId || holiday.userId === GLOBAL_HOLIDAY_USER_ID));
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
      selectedAssigneeId = null;
      completeAdminSave("Backup imported.", "data");
    } catch (error) {
      window.alert(`Could not import JSON: ${error.message}`);
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

  if (!window.confirm("Reset to sample data? This replaces local browser data.")) {
    return;
  }

  data = cloneData(defaultData);
  selectedAssigneeId = null;
  completeAdminSave("Sample data restored.", "data");
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
    selectedAssigneeId = null;
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

  selectedAssigneeId = null;
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
  selectedAssigneeId = null;
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
    window.alert(`${title}\n\n${message}`);
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

function loadDisplayTimezone() {
  try {
    return getDisplayTimezone(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).id;
  } catch {
    return DISPLAY_TIMEZONES[0].id;
  }
}

function getDisplayTimezone(timezoneId) {
  return DISPLAY_TIMEZONES.find((timezone) => timezone.id === timezoneId) || DISPLAY_TIMEZONES[0];
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

function normalizeData() {
  data.assignmentLog = Array.isArray(data.assignmentLog) ? data.assignmentLog : [];
  data.assignmentRules = data.assignmentRules && typeof data.assignmentRules === "object"
    ? data.assignmentRules
    : { ...DEFAULT_ASSIGNMENT_RULES };
  data.assignmentRules.preset = getAssignmentRulePreset(data.assignmentRules.preset).id;
  data.exceptions = Array.isArray(data.exceptions) ? data.exceptions : [];
  data.holidays = Array.isArray(data.holidays) ? data.holidays : [];
  data.shiftTemplates = Array.isArray(data.shiftTemplates) && data.shiftTemplates.length > 0
    ? data.shiftTemplates
    : cloneData(DEFAULT_SHIFT_TEMPLATES);
  data.shiftTemplates = data.shiftTemplates.map((template) => ({
    id: template.id || makeId(template.name || "shift", []),
    name: template.name || template.label || "Shift",
    start: template.start || "09:00",
    end: template.end || "17:00"
  }));
  data.queues = data.queues && typeof data.queues === "object" ? data.queues : {};

  data.users.forEach((user) => {
    user.schedules = Array.isArray(user.schedules) ? user.schedules : [];
    user.schedules.forEach((schedule) => {
      schedule.id ||= makeRecordId("schedule");
      schedule.shiftType ||= inferShiftType(schedule.start, schedule.end);
      schedule.days = Array.isArray(schedule.days) ? schedule.days : [];
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
  });

  data.holidays.forEach((holiday) => {
    holiday.id ||= makeRecordId("holiday");
    holiday.userId ||= GLOBAL_HOLIDAY_USER_ID;
    holiday.name ||= "Holiday";
  });

  data.systems.forEach((system) => {
    system.primaryUserIds = system.primaryUserIds.filter((userId) => data.users.some((user) => user.id === userId));
    if (!(system.id in data.queues)) {
      data.queues[system.id] = 0;
    }
    clampQueue(system.id);
  });

  rebuildQueuesFromAssignmentLog();
}

function rebuildQueuesFromAssignmentLog() {
  const rebuiltQueues = {};
  data.systems.forEach((system) => {
    rebuiltQueues[system.id] = 0;
  });

  data.assignmentLog
    .slice()
    .sort((left, right) => getAssignmentTimestamp(left) - getAssignmentTimestamp(right))
    .forEach((entry) => {
      const system = data.systems.find((item) => isAssignmentForSystem(entry, item));
      if (!system || system.primaryUserIds.length === 0) {
        return;
      }

      const userIndex = system.primaryUserIds.indexOf(entry.userId);
      if (userIndex >= 0) {
        rebuiltQueues[system.id] = (userIndex + 1) % system.primaryUserIds.length;
      }
    });

  data.queues = rebuiltQueues;
}

function setDefaultDates() {
  const today = getEasternNow().date;
  if (elements.timelineDateInput) {
    elements.timelineDateInput.value ||= today;
  }

  syncScheduleDateRangeToGraphWeek(false);

  if (elements.slotDateInput) {
    elements.slotDateInput.value ||= today;
  }

  if (elements.holidayDateInput) {
    elements.holidayDateInput.value ||= today;
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

function getBusinessWeekRange(date) {
  const weekDates = getWeekDates(date);
  return {
    startDate: weekDates[0],
    endDate: weekDates[4]
  };
}

function graphBlock(block, options = {}) {
  const label = formatGraphBlockText(block.start, block.end, block.type, block.label, block.date);
  const edgeLabels = graphEdgeLabels(block);
  const interiorLabel = formatGraphBlockInteriorText(block.type, block.label);
  return `
    ${edgeLabels}
    <span class="graph-block ${block.type}" style="${timeRangeStyle(block.start, block.end)}" title="${escapeHtml(label)}">
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
    start: draft.start,
    end: draft.end
  };

  return `
    ${graphEdgeLabels(draftBlock)}
    <span class="graph-block draft" style="${timeRangeStyle(draft.start, draft.end)}" title="Drag to move before saving">
      <span>New schedule</span>
    </span>
  `;
}

function weekGraphPill(block) {
  const label = formatGraphBlockText(block.start, block.end, block.type, block.label, block.date);
  const editAttributes = block.type === "schedule"
    ? `
      data-action="edit-schedule"
      data-user-id="${escapeHtml(block.userId)}"
      data-schedule-id="${escapeHtml(block.id)}"
      data-date="${escapeHtml(block.date)}"
      title="Click to update schedule"
    `
    : "";
  return `
    <span class="week-pill ${block.type}"${editAttributes}>
      <span>${escapeHtml(label)}</span>
      ${graphRemoveButton(block)}
    </span>
  `;
}

function graphEdgeLabels(block) {
  if (block.type === "holiday") {
    return "";
  }

  const start = formatEasternTimeInputForDisplay(block.date || getScheduleReferenceDate(), block.start);
  const end = formatEasternTimeInputForDisplay(block.date || getScheduleReferenceDate(), block.end);
  return `
    <span class="graph-edge-label ${escapeHtml(block.type)} start" style="${timeStartStyle(block.start)}">${escapeHtml(start)}</span>
    <span class="graph-edge-label ${escapeHtml(block.type)} end" style="${timeEndStyle(block.end)}">${escapeHtml(end)}</span>
  `;
}

function formatGraphBlockInteriorText(type, label) {
  if (type === "schedule") {
    return "";
  }

  if (type === "holiday") {
    return label;
  }

  return label || "";
}

function graphRemoveButton(block) {
  const label = formatGraphBlockText(block.start, block.end, block.type, block.label, block.date);
  if (block.type === "schedule") {
    return `
      <button
        class="graph-remove"
        type="button"
        data-action="remove-schedule"
        data-user-id="${escapeHtml(block.userId)}"
        data-schedule-id="${escapeHtml(block.id)}"
        data-date="${escapeHtml(block.date)}"
        aria-label="Remove schedule ${escapeHtml(label)}"
      >×</button>
    `;
  }

  if (block.type === "break" || block.type === "extra") {
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

function formatGraphBlockText(start, end, type, label, date = getScheduleReferenceDate()) {
  if (type === "schedule") {
    return `${formatEasternTimeInputForDisplay(date, start)}–${formatEasternTimeInputForDisplay(date, end)}`;
  }

  if (type === "holiday") {
    return label;
  }

  return `${label} · ${formatEasternTimeInputForDisplay(date, start)}–${formatEasternTimeInputForDisplay(date, end)}`;
}

function timeRangeStyle(start, end) {
  const startMinutes = Math.max(toMinutes(start), TIMELINE_START_MINUTES);
  const endMinutes = Math.min(toMinutes(end), TIMELINE_END_MINUTES);
  const total = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES;
  const left = ((startMinutes - TIMELINE_START_MINUTES) / total) * 100;
  const width = Math.max(((endMinutes - startMinutes) / total) * 100, 1);
  return `left:${left}%;width:${width}%;`;
}

function timeStartStyle(start) {
  const startMinutes = Math.max(toMinutes(start), TIMELINE_START_MINUTES);
  const total = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES;
  const left = Math.min(((startMinutes - TIMELINE_START_MINUTES) / total) * 100, 92);
  return `left:${left}%;`;
}

function timeEndStyle(end) {
  const endMinutes = Math.min(toMinutes(end), TIMELINE_END_MINUTES);
  const total = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES;
  const left = Math.max(((endMinutes - TIMELINE_START_MINUTES) / total) * 100, 0);
  return `left:${left}%;`;
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

function getSelectedTimezoneAbbreviationForDate(date) {
  const referenceDate = zonedWallTimeToDate(date, "12:00", EASTERN_TIME_ZONE);
  return getTimezoneAbbreviation(referenceDate, getSelectedDisplayTimezone());
}

function formatEasternTimeInputForDisplay(date, time) {
  if (!isValidDateInput(date) || !isValidTimeInput(time)) {
    return time || "";
  }

  const instant = zonedWallTimeToDate(date, time, EASTERN_TIME_ZONE);
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

function getZonedDateTimeParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`
  };
}

function getTimezoneAbbreviation(date, timezone) {
  if (timezone.id === "utc") {
    return "UTC";
  }
  if (timezone.id === "ist") {
    return "IST";
  }

  const offsetMinutes = getTimeZoneOffsetMinutes(date, timezone.timeZone);
  if (timezone.id === "et") {
    return offsetMinutes === -300 ? "EST" : "EDT";
  }
  if (timezone.id === "london") {
    return offsetMinutes === 60 ? "BST" : "GMT";
  }

  return timezone.id.toUpperCase();
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return Math.round((localAsUtc - date.getTime()) / 60000);
}

function zonedWallTimeToDate(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = targetUtc;

  for (let index = 0; index < 3; index += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const formattedUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute)
    );
    timestamp += targetUtc - formattedUtc;
  }

  return new Date(timestamp);
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(parseDate(date));
}

function isValidDateInput(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && formatDate(parseDate(date)) === date;
}

function isValidTimeInput(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function getWeekDates(date) {
  const base = parseDate(date);
  const day = base.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(base, mondayOffset);

  return Array.from({ length: 7 }, (_, index) => formatDate(addDays(monday, index)));
}

function parseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayNameFromDate(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(parseDate(date));
}

function isWithinWindow(currentMinutes, startMinutes, endMinutes) {
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const normalized = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatWaitDuration(totalMinutes) {
  const minutesUntilAvailable = Math.max(0, Math.round(totalMinutes));
  if (minutesUntilAvailable === 0) {
    return "now";
  }

  if (minutesUntilAvailable < 60) {
    return `${minutesUntilAvailable} min${minutesUntilAvailable === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutesUntilAvailable / 60);
  const minutes = minutesUntilAvailable % 60;
  return minutes === 0
    ? `${hours}hr${hours === 1 ? "" : "s"}`
    : `${hours}hr${hours === 1 ? "" : "s"} ${String(minutes).padStart(2, "0")} mins`;
}

function roundToNearestSlot(minutes) {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function isValidTimeRange(start, end) {
  return Boolean(start && end && start !== end);
}

function getQueueIndex(system) {
  return Math.min(Math.max(Number(data.queues[system.id] || 0), 0), Math.max(system.primaryUserIds.length - 1, 0));
}

function clampQueue(systemId) {
  const system = data.systems.find((item) => item.id === systemId);
  if (!system || system.primaryUserIds.length === 0) {
    data.queues[systemId] = 0;
    return;
  }

  data.queues[systemId] = getQueueIndex(system);
}

function inferShiftType(start, end) {
  return data.shiftTemplates.find((template) => template.start === start && template.end === end)?.id || "custom";
}

function getShiftTemplate(shiftType) {
  return data.shiftTemplates.find((template) => template.id === shiftType);
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
