const STORAGE_KEY = "smeScheduler.data.v1";
const EASTERN_TIME_ZONE = "America/New_York";
const GLOBAL_HOLIDAY_USER_ID = "__all__";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMELINE_START_MINUTES = 6 * 60;
const TIMELINE_END_MINUTES = 22 * 60;
const SLOT_MINUTES = 30;

const DEFAULT_SHIFT_TEMPLATES = [
  { id: "early", name: "Early shift", start: "07:00", end: "15:00" },
  { id: "regular", name: "Regular shift", start: "09:00", end: "17:00" },
  { id: "late", name: "Late shift", start: "11:00", end: "19:00" }
];

const defaultData = {
  users: [
    {
      id: "alice",
      name: "Alice",
      schedules: [
        { id: "alice-regular", shiftType: "regular", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "09:00", end: "17:00", priority: 1 }
      ]
    },
    {
      id: "ben",
      name: "Ben",
      schedules: [
        { id: "ben-early", shiftType: "early", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "07:00", end: "15:00", priority: 2 }
      ]
    },
    {
      id: "casey",
      name: "Casey",
      schedules: [
        { id: "casey-late", shiftType: "late", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "11:00", end: "19:00", priority: 3 }
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
  exceptions: [],
  holidays: [],
  assignmentLog: []
};

let data = loadData();
let selectedAssigneeId = null;
const OTHER_ADMIN_TABS = ["users", "shifts", "systems", "data"];

const elements = {
  currentEtTime: document.querySelector("#currentEtTime"),
  otherAdminSelect: document.querySelector("#otherAdminSelect"),
  adminToggleButton: document.querySelector("#adminToggleButton"),
  adminPanel: document.querySelector("#adminPanel"),
  closeAdminButton: document.querySelector("#closeAdminButton"),
  assignmentSystemSelect: document.querySelector("#assignmentSystemSelect"),
  suggestionCard: document.querySelector("#suggestionCard"),
  markAssignedButton: document.querySelector("#markAssignedButton"),
  selectedAssigneeText: document.querySelector("#selectedAssigneeText"),
  queueList: document.querySelector("#queueList"),
  assignmentLog: document.querySelector("#assignmentLog"),
  addUserForm: document.querySelector("#addUserForm"),
  userNameInput: document.querySelector("#userNameInput"),
  usersList: document.querySelector("#usersList"),
  addScheduleForm: document.querySelector("#addScheduleForm"),
  scheduleUserSelect: document.querySelector("#scheduleUserSelect"),
  shiftTemplateSelect: document.querySelector("#shiftTemplateSelect"),
  dayCheckboxes: document.querySelector("#dayCheckboxes"),
  scheduleStartInput: document.querySelector("#scheduleStartInput"),
  scheduleEndInput: document.querySelector("#scheduleEndInput"),
  schedulePriorityInput: document.querySelector("#schedulePriorityInput"),
  addShiftForm: document.querySelector("#addShiftForm"),
  shiftNameInput: document.querySelector("#shiftNameInput"),
  shiftStartInput: document.querySelector("#shiftStartInput"),
  shiftEndInput: document.querySelector("#shiftEndInput"),
  shiftsList: document.querySelector("#shiftsList"),
  scheduleViewSelect: document.querySelector("#scheduleViewSelect"),
  graphDateLabel: document.querySelector("#graphDateLabel"),
  graphDateHelp: document.querySelector("#graphDateHelp"),
  timelineUserSelect: document.querySelector("#timelineUserSelect"),
  timelineDateInput: document.querySelector("#timelineDateInput"),
  timelineCanvas: document.querySelector("#timelineCanvas"),
  addSlotForm: document.querySelector("#addSlotForm"),
  slotTypeSelect: document.querySelector("#slotTypeSelect"),
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

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  renderDayCheckboxes();
  render();
  window.setInterval(renderClockAndAssignment, 30000);
});

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  on(elements.otherAdminSelect, "change", () => {
    if (elements.otherAdminSelect.value) {
      activateTab(elements.otherAdminSelect.value);
    }
  });

  on(elements.assignmentSystemSelect, "change", () => {
    selectedAssigneeId = null;
    renderClockAndAssignment();
  });
  on(elements.markAssignedButton, "click", markSelectedAssigned);
  on(elements.addUserForm, "submit", addUser);
  on(elements.addScheduleForm, "submit", addSchedule);
  on(elements.addShiftForm, "submit", addShiftTemplate);
  on(elements.shiftTemplateSelect, "change", applyShiftTemplate);
  on(elements.scheduleStartInput, "input", () => elements.shiftTemplateSelect.value = "custom");
  on(elements.scheduleEndInput, "input", () => elements.shiftTemplateSelect.value = "custom");
  on(elements.scheduleViewSelect, "change", renderTimelineTools);
  on(elements.timelineUserSelect, "change", renderTimelineTools);
  on(elements.timelineDateInput, "change", renderTimelineTools);
  on(elements.timelineCanvas, "click", prefillSlotFromTimeline);
  on(elements.addSlotForm, "submit", addTimelineSlot);
  on(elements.addSystemForm, "submit", addSystem);
  on(elements.addHolidayForm, "submit", addHoliday);
  on(elements.exportButton, "click", exportData);
  on(elements.importInput, "change", importData);
  on(elements.resetButton, "click", resetData);
}

function on(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
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
}

function render() {
  normalizeData();
  setDefaultDates();
  saveData();
  renderSystemSelect();
  renderUserSelectors();
  renderShiftTemplateSelect();
  renderShifts();
  renderUsers();
  renderSystems();
  renderHolidays();
  renderTimelineTools();
  renderDataPreview();
  renderClockAndAssignment();
}

function renderClockAndAssignment() {
  const easternNow = getEasternNow();
  if (elements.currentEtTime) {
    elements.currentEtTime.textContent = `${easternNow.day} ${easternNow.date} · ${easternNow.time}`;
  }

  if (!elements.assignmentSystemSelect) {
    return;
  }

  const queueState = getQueueState(elements.assignmentSystemSelect.value, easternNow);
  if (!queueState.rows.some((row) => row.user.id === selectedAssigneeId && row.selectable)) {
    selectedAssigneeId = queueState.recommendedRow?.user.id ?? null;
  }

  renderSuggestion(queueState);
  renderQueue(queueState);
  renderAssignmentLog();
}

function renderSystemSelect() {
  if (!elements.assignmentSystemSelect) {
    return;
  }

  const selectedValue = elements.assignmentSystemSelect.value;
  elements.assignmentSystemSelect.innerHTML = "";

  data.systems.forEach((system) => {
    const option = document.createElement("option");
    option.value = system.id;
    option.textContent = system.name;
    elements.assignmentSystemSelect.append(option);
  });

  if (data.systems.some((system) => system.id === selectedValue)) {
    elements.assignmentSystemSelect.value = selectedValue;
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
  elements.shiftTemplateSelect.innerHTML = "";

  data.shiftTemplates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = `${template.name} · ${template.start}–${template.end}`;
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

  const rows = data.shiftTemplates.map((template) => `
    <div class="shift-row" data-shift-id="${escapeHtml(template.id)}">
      <label class="field">
        <span>Name</span>
        <input class="shift-name-field" type="text" value="${escapeHtml(template.name)}">
      </label>
      <label class="field">
        <span>Start</span>
        <input class="shift-start-field" type="time" value="${escapeHtml(template.start)}">
      </label>
      <label class="field">
        <span>End</span>
        <input class="shift-end-field" type="time" value="${escapeHtml(template.end)}">
      </label>
      <div class="item-actions">
        <button class="small-button" type="button" data-action="update-shift" data-shift-id="${escapeHtml(template.id)}">Update</button>
        <button class="remove-button" type="button" data-action="remove-shift" data-shift-id="${escapeHtml(template.id)}">Remove</button>
      </div>
    </div>
  `).join("");

  elements.shiftsList.innerHTML = rows || emptyState("No shift presets yet.");
  elements.shiftsList.querySelectorAll("[data-action='update-shift']").forEach((button) => {
    button.addEventListener("click", () => updateShiftTemplate(button.dataset.shiftId));
  });
  elements.shiftsList.querySelectorAll("[data-action='remove-shift']").forEach((button) => {
    button.addEventListener("click", () => removeShiftTemplate(button.dataset.shiftId));
  });
}

function renderSuggestion(queueState) {
  if (!elements.suggestionCard || !elements.markAssignedButton || !elements.selectedAssigneeText) {
    return;
  }

  if (!queueState.system) {
    elements.suggestionCard.innerHTML = `<span class="suggestion-name">No system selected</span><span class="suggestion-meta">Add a system/app from Admin tools.</span>`;
    elements.markAssignedButton.disabled = true;
    elements.selectedAssigneeText.textContent = "Select a user from the queue.";
    return;
  }

  const selectedRow = queueState.rows.find((row) => row.user.id === selectedAssigneeId);
  if (!selectedRow) {
    elements.suggestionCard.innerHTML = `<span class="suggestion-name">No selectable SME</span><span class="suggestion-meta">No one in this queue is available now or later today.</span>`;
    elements.markAssignedButton.disabled = true;
    elements.selectedAssigneeText.textContent = "No selectable user.";
    return;
  }

  elements.suggestionCard.innerHTML = `
    <span class="suggestion-name">${escapeHtml(selectedRow.user.name)}</span>
    <span class="suggestion-meta">${escapeHtml(selectedRow.message)}</span>
  `;
  elements.markAssignedButton.disabled = !selectedRow.selectable;
  elements.selectedAssigneeText.textContent = selectedRow.selectable
    ? `Selected: ${selectedRow.user.name}`
    : `${selectedRow.user.name} cannot be selected for today.`;
}

function renderQueue(queueState) {
  if (!elements.queueList) {
    return;
  }

  const rows = queueState.rows.map((row, index) => {
    const selectedClass = row.user.id === selectedAssigneeId ? " selected" : "";
    const disabled = row.selectable ? "" : "disabled";
    return `
      <button class="queue-card ${row.status}${selectedClass}" type="button" data-user-id="${escapeHtml(row.user.id)}" ${disabled}>
        <span class="queue-card-header">
          <span class="queue-position">${index === 0 ? "Next in queue" : `Queue #${index + 1}`}</span>
          <span class="status-pill ${row.status}">${escapeHtml(row.badge)}</span>
        </span>
        <span class="queue-name">${escapeHtml(row.user.name)}</span>
        <span class="meta">${escapeHtml(row.message)}</span>
      </button>
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

function renderAssignmentLog() {
  if (!elements.assignmentLog) {
    return;
  }

  const rows = data.assignmentLog.slice(-8).reverse().map((entry) => {
    const assignedAt = new Date(entry.assignedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
    return `
      <div class="list-item">
        <div>
          <div class="item-title">${escapeHtml(entry.userName || "Removed user")}</div>
          <div class="meta">${escapeHtml(entry.systemName || "Removed system")} · ${assignedAt}</div>
        </div>
        <span class="status-pill ${entry.status || "available"}">${escapeHtml(entry.statusLabel || "Assigned")}</span>
      </div>
    `;
  }).join("");

  elements.assignmentLog.innerHTML = rows || emptyState("No assignments yet.");
}

function renderUsers() {
  if (!elements.usersList) {
    return;
  }

  const rows = data.users.map((user) => {
    const scheduleCount = user.schedules.length;
    const coverageCount = data.systems.filter((system) => system.primaryUserIds.includes(user.id)).length;
    const holidayCount = data.holidays.filter((holiday) => holiday.userId === user.id).length;
    return `
      <div class="list-item">
        <div>
          <div class="item-title">${escapeHtml(user.name)}</div>
          <div class="meta">${scheduleCount} schedule block${scheduleCount === 1 ? "" : "s"} · ${coverageCount} system/app${coverageCount === 1 ? "" : "s"} · ${holidayCount} holiday${holidayCount === 1 ? "" : "s"}</div>
        </div>
        <div class="item-actions">
          <button class="remove-button" type="button" data-action="remove-user" data-user-id="${escapeHtml(user.id)}">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  elements.usersList.innerHTML = rows || emptyState("Add your first user.");
  elements.usersList.querySelectorAll("[data-action='remove-user']").forEach((button) => {
    button.addEventListener("click", () => removeUser(button.dataset.userId));
  });
}

function renderDayCheckboxes() {
  if (!elements.dayCheckboxes) {
    return;
  }

  elements.dayCheckboxes.innerHTML = DAYS.map((day) => `
    <label class="check-row">
      <input type="checkbox" value="${day}" ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(day) ? "checked" : ""}>
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
  renderSlots();
}

function updateGraphDateCopy() {
  const isWeekView = elements.scheduleViewSelect?.value === "week";

  if (elements.graphDateLabel) {
    elements.graphDateLabel.textContent = isWeekView ? "Week containing date" : "Schedule date";
  }

  if (elements.graphDateHelp) {
    elements.graphDateHelp.textContent = isWeekView
      ? "Week view shows the Monday–Sunday week containing this date. Click a day cell to prefill that user/day."
      : "Day view shows this exact date. Click a user row to prefill a 30-minute schedule.";
  }
}

function renderTimeline() {
  if (!elements.timelineCanvas || !elements.timelineDateInput) {
    return;
  }

  const date = elements.timelineDateInput.value || getEasternNow().date;
  const view = elements.scheduleViewSelect?.value || "day";

  if (view === "week") {
    renderWeekScheduleGraph(date);
    return;
  }

  renderDayScheduleGraph(date);
}

function renderDayScheduleGraph(date) {
  const day = getDayNameFromDate(date);
  const rows = data.users.map((user) => {
    const graphBlocks = getGraphBlocksForUser(user, date, day);
    const coveredScheduleIds = new Set(
      graphBlocks
        .filter((block) => isScheduleCovered(block, graphBlocks))
        .map((block) => block.id)
    );
    const labels = graphBlocks
      .filter((block) => coveredScheduleIds.has(block.id))
      .map((block) => graphFloatingLabel(block))
      .join("");
    const blocks = graphBlocks
      .map((block) => graphBlock(block, { hideLabel: coveredScheduleIds.has(block.id) }))
      .join("");
    const laneClass = coveredScheduleIds.size > 0 ? "graph-lane has-floating-labels" : "graph-lane";

    return `
      <div class="graph-row">
        <div class="graph-user">${escapeHtml(user.name)}</div>
        <div class="${laneClass}" data-user-id="${escapeHtml(user.id)}" data-date="${escapeHtml(date)}">
          ${labels}${blocks || "<span class=\"graph-empty\">Click to add</span>"}
        </div>
      </div>
    `;
  }).join("");

  elements.timelineCanvas.className = "schedule-graph day-graph";
  elements.timelineCanvas.innerHTML = `
    <div class="graph-time-axis">
      <span>06:00</span><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span><span>22:00</span>
    </div>
    ${rows || emptyState("Add users before viewing schedules.")}
  `;
}

function renderWeekScheduleGraph(date) {
  const weekDates = getWeekDates(date);
  const header = weekDates.map((weekDate) => `
    <div class="week-header-cell">
      <strong>${getDayNameFromDate(weekDate).slice(0, 3)}</strong>
      <span>${weekDate.slice(5)}</span>
    </div>
  `).join("");

  const rows = data.users.map((user) => {
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
      start: window.start,
      end: window.end,
      label: window.source === "extra" ? "Extra" : "Schedule"
    }));

  const breakBlocks = data.exceptions
    .filter((slot) => slot.userId === user.id && slot.date === date && slot.type === "break")
    .map((slot) => ({
      type: "break",
      id: slot.id,
      userId: user.id,
      start: slot.start,
      end: slot.end,
      label: slot.reason || "Break"
    }));

  return scheduleBlocks.concat(breakBlocks).sort((left, right) => toMinutes(left.start) - toMinutes(right.start));
}

function isScheduleCovered(block, blocks) {
  return block.type === "schedule" && blocks.some((otherBlock) => (
    ["break", "extra"].includes(otherBlock.type) && graphBlocksOverlap(block, otherBlock)
  ));
}

function graphBlocksOverlap(leftBlock, rightBlock) {
  return toMinutes(leftBlock.start) < toMinutes(rightBlock.end) && toMinutes(rightBlock.start) < toMinutes(leftBlock.end);
}

function renderSlots() {
  if (!elements.slotsList) {
    return;
  }

  const rows = data.exceptions
    .slice()
    .sort((left, right) => `${left.date} ${left.start}`.localeCompare(`${right.date} ${right.start}`))
    .map((slot) => {
      const user = data.users.find((item) => item.id === slot.userId);
      return `
        <div class="list-item">
          <div>
            <div class="item-title">${escapeHtml(user?.name || "Removed user")} · ${slot.type === "break" ? "Break" : "Extra coverage"}</div>
            <div class="meta">${slot.date} · ${slot.start}–${slot.end} ET${slot.reason ? ` · ${escapeHtml(slot.reason)}` : ""}</div>
          </div>
          <button class="remove-button" type="button" data-action="remove-slot" data-slot-id="${escapeHtml(slot.id)}">Remove</button>
        </div>
      `;
    }).join("");

  elements.slotsList.innerHTML = rows || emptyState("No breaks or extra slots.");
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
        <div class="list-item">
          <div>
            <div class="item-title">#${index + 1} ${escapeHtml(user.name)}</div>
          </div>
          <div class="item-actions">
            <button class="small-button" type="button" data-action="move-user" data-system-id="${escapeHtml(system.id)}" data-user-id="${escapeHtml(user.id)}" data-direction="-1">Up</button>
            <button class="small-button" type="button" data-action="move-user" data-system-id="${escapeHtml(system.id)}" data-user-id="${escapeHtml(user.id)}" data-direction="1">Down</button>
          </div>
        </div>
      `;
    }).join("");

    const coverageRows = data.users.map((user) => `
      <label class="check-row">
        <input type="checkbox" data-action="toggle-coverage" data-system-id="${escapeHtml(system.id)}" data-user-id="${escapeHtml(user.id)}" ${system.primaryUserIds.includes(user.id) ? "checked" : ""}>
        <span>${escapeHtml(user.name)}</span>
      </label>
    `).join("");

    return `
      <article class="system-card">
        <div class="section-heading">
          <div>
            <h3>${escapeHtml(system.name)}</h3>
            <p class="help-text">${system.primaryUserIds.length} primary SME${system.primaryUserIds.length === 1 ? "" : "s"} assigned</p>
          </div>
          <button class="remove-button" type="button" data-action="remove-system" data-system-id="${escapeHtml(system.id)}">Remove system</button>
        </div>
        <div class="coverage-grid">${coverageRows || emptyState("Add users first.")}</div>
        <div class="stack-list compact">${assignedRows || emptyState("No primary SMEs assigned.")}</div>
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
      const userName = holiday.userId === GLOBAL_HOLIDAY_USER_ID
        ? "All users"
        : data.users.find((user) => user.id === holiday.userId)?.name || "Removed user";
      return `
        <div class="list-item">
          <div>
            <div class="item-title">${escapeHtml(userName)}</div>
            <div class="meta">${holiday.date} · ${escapeHtml(holiday.name || "Holiday")}</div>
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

function addShiftTemplate(event) {
  event.preventDefault();
  const name = elements.shiftNameInput.value.trim();
  const start = elements.shiftStartInput.value;
  const end = elements.shiftEndInput.value;

  if (!name || !isValidTimeRange(start, end)) {
    window.alert("Add a shift name and valid start/end times.");
    return;
  }

  data.shiftTemplates.push({
    id: makeId(name, data.shiftTemplates.map((template) => template.id)),
    name,
    start,
    end
  });

  elements.addShiftForm.reset();
  elements.shiftStartInput.value = "09:00";
  elements.shiftEndInput.value = "17:00";
  render();
}

function updateShiftTemplate(shiftId) {
  const row = elements.shiftsList.querySelector(`[data-shift-id="${cssEscape(shiftId)}"]`);
  const template = data.shiftTemplates.find((item) => item.id === shiftId);
  if (!row || !template) {
    return;
  }

  const name = row.querySelector(".shift-name-field").value.trim();
  const start = row.querySelector(".shift-start-field").value;
  const end = row.querySelector(".shift-end-field").value;

  if (!name || !isValidTimeRange(start, end)) {
    window.alert("Shift presets need a name and valid start/end times.");
    return;
  }

  template.name = name;
  template.start = start;
  template.end = end;
  render();
}

function removeShiftTemplate(shiftId) {
  const template = data.shiftTemplates.find((item) => item.id === shiftId);
  if (!template || !window.confirm(`Remove ${template.name}? Existing schedules using it will become custom schedules.`)) {
    return;
  }

  data.shiftTemplates = data.shiftTemplates.filter((item) => item.id !== shiftId);
  data.users.forEach((user) => {
    user.schedules.forEach((schedule) => {
      if (schedule.shiftType === shiftId) {
        schedule.shiftType = "custom";
      }
    });
  });
  render();
}

function addUser(event) {
  event.preventDefault();
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
  render();
}

function removeUser(userId) {
  const user = data.users.find((item) => item.id === userId);
  if (!user || !window.confirm(`Remove ${user.name}? This also removes their schedules, breaks, holidays, and coverage.`)) {
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
  render();
}

function applyShiftTemplate() {
  const template = getShiftTemplate(elements.shiftTemplateSelect.value);
  if (!template || elements.shiftTemplateSelect.value === "custom") {
    return;
  }

  elements.scheduleStartInput.value = template.start;
  elements.scheduleEndInput.value = template.end;
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

  if (!isValidTimeRange(elements.scheduleStartInput.value, elements.scheduleEndInput.value)) {
    window.alert("Schedule start and end cannot be the same.");
    return;
  }

  user.schedules.push({
    id: makeRecordId("schedule"),
    shiftType: elements.shiftTemplateSelect.value,
    days,
    start: elements.scheduleStartInput.value,
    end: elements.scheduleEndInput.value,
    priority: Number(elements.schedulePriorityInput.value)
  });

  render();
}

function removeSchedule(userId, scheduleId) {
  const user = data.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  user.schedules = user.schedules.filter((schedule) => schedule.id !== scheduleId);
  render();
}

function addTimelineSlot(event) {
  event.preventDefault();
  const user = data.users.find((item) => item.id === elements.timelineUserSelect.value);
  if (!user) {
    window.alert("Add a user before adding a timeline slot.");
    return;
  }

  if (!isValidTimeRange(elements.slotStartInput.value, elements.slotEndInput.value)) {
    window.alert("Slot start and end cannot be the same.");
    return;
  }

  if (!elements.slotDateInput.value) {
    window.alert("Choose a break or extra slot date.");
    return;
  }

  data.exceptions.push({
    id: makeRecordId("slot"),
    userId: user.id,
    date: elements.slotDateInput.value,
    type: elements.slotTypeSelect.value,
    start: elements.slotStartInput.value,
    end: elements.slotEndInput.value,
    reason: elements.slotReasonInput.value.trim()
  });

  elements.slotReasonInput.value = "";
  render();
}

function removeTimelineSlot(slotId) {
  data.exceptions = data.exceptions.filter((slot) => slot.id !== slotId);
  render();
}

function prefillSlotFromTimeline(event) {
  const removeButton = event.target.closest("[data-action='remove-schedule']");
  if (removeButton) {
    removeSchedule(removeButton.dataset.userId, removeButton.dataset.scheduleId);
    return;
  }

  const removeSlotButton = event.target.closest("[data-action='remove-slot']");
  if (removeSlotButton) {
    removeTimelineSlot(removeSlotButton.dataset.slotId);
    return;
  }

  const lane = event.target.closest(".graph-lane");
  if (lane) {
    const rect = lane.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const rawMinutes = TIMELINE_START_MINUTES + ratio * (TIMELINE_END_MINUTES - TIMELINE_START_MINUTES);
    const startMinutes = Math.min(roundToNearestSlot(rawMinutes), TIMELINE_END_MINUTES - SLOT_MINUTES);
    prefillScheduleForm(lane.dataset.userId, lane.dataset.date, minutesToTime(startMinutes), minutesToTime(startMinutes + SLOT_MINUTES), true);
    return;
  }

  const weekCell = event.target.closest(".week-cell");
  if (weekCell) {
    const template = getShiftTemplate(elements.shiftTemplateSelect?.value) || getShiftTemplate("regular") || data.shiftTemplates[0];
    prefillScheduleForm(weekCell.dataset.userId, weekCell.dataset.date, template?.start || "09:00", template?.end || "17:00", false);
    return;
  }

  const rect = elements.timelineCanvas.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  const rawMinutes = TIMELINE_START_MINUTES + ratio * (TIMELINE_END_MINUTES - TIMELINE_START_MINUTES);
  const startMinutes = Math.min(roundToNearestSlot(rawMinutes), TIMELINE_END_MINUTES - SLOT_MINUTES);
  if (elements.slotDateInput && elements.timelineDateInput?.value) {
    elements.slotDateInput.value = elements.timelineDateInput.value;
  }
  elements.slotStartInput.value = minutesToTime(startMinutes);
  elements.slotEndInput.value = minutesToTime(startMinutes + SLOT_MINUTES);
}

function prefillScheduleForm(userId, date, start, end, forceCustom) {
  if (elements.scheduleUserSelect) {
    elements.scheduleUserSelect.value = userId;
  }

  if (elements.timelineUserSelect) {
    elements.timelineUserSelect.value = userId;
  }

  if (elements.shiftTemplateSelect && forceCustom) {
    elements.shiftTemplateSelect.value = "custom";
  }

  if (elements.scheduleStartInput) {
    elements.scheduleStartInput.value = start;
  }

  if (elements.scheduleEndInput) {
    elements.scheduleEndInput.value = end;
  }

  if (elements.slotStartInput) {
    elements.slotStartInput.value = start;
  }

  if (elements.slotEndInput) {
    elements.slotEndInput.value = end;
  }

  selectOnlyScheduleDay(getDayNameFromDate(date));
}

function selectOnlyScheduleDay(day) {
  if (!elements.dayCheckboxes) {
    return;
  }

  elements.dayCheckboxes.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = checkbox.value === day;
  });
}

function addSystem(event) {
  event.preventDefault();
  const name = elements.systemNameInput.value.trim();
  if (!name) {
    return;
  }

  const id = makeId(name, data.systems.map((system) => system.id));
  data.systems.push({ id, name, primaryUserIds: [] });
  data.queues[id] = 0;
  elements.addSystemForm.reset();
  render();
}

function removeSystem(systemId) {
  const system = data.systems.find((item) => item.id === systemId);
  if (!system || !window.confirm(`Remove ${system.name}?`)) {
    return;
  }

  data.systems = data.systems.filter((item) => item.id !== systemId);
  delete data.queues[systemId];
  selectedAssigneeId = null;
  render();
}

function toggleCoverage(systemId, userId, checked) {
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
  render();
}

function moveCoveredUser(systemId, userId, direction) {
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
  render();
}

function addHoliday(event) {
  event.preventDefault();
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
  render();
}

function removeHoliday(holidayId) {
  data.holidays = data.holidays.filter((holiday) => holiday.id !== holidayId);
  render();
}

function markSelectedAssigned() {
  const easternNow = getEasternNow();
  const queueState = getQueueState(elements.assignmentSystemSelect.value, easternNow);
  const selectedRow = queueState.rows.find((row) => row.user.id === selectedAssigneeId);
  if (!queueState.system || !selectedRow || !selectedRow.selectable) {
    return;
  }

  data.assignmentLog.push({
    id: makeRecordId("assignment"),
    assignedAt: new Date().toISOString(),
    easternDate: easternNow.date,
    systemId: queueState.system.id,
    systemName: queueState.system.name,
    userId: selectedRow.user.id,
    userName: selectedRow.user.name,
    status: selectedRow.status,
    statusLabel: selectedRow.badge
  });

  const originalIndex = queueState.system.primaryUserIds.indexOf(selectedRow.user.id);
  if (originalIndex >= 0) {
    data.queues[queueState.system.id] = (originalIndex + 1) % queueState.system.primaryUserIds.length;
  }

  selectedAssigneeId = null;
  render();
}

function getQueueState(systemId, easternNow) {
  const system = data.systems.find((item) => item.id === systemId);
  if (!system) {
    return { system: null, rows: [], recommendedRow: null };
  }

  const primaryUsers = system.primaryUserIds
    .map((userId) => data.users.find((user) => user.id === userId))
    .filter(Boolean);

  const rows = rotate(primaryUsers, getQueueIndex(system)).map((user) => {
    const status = getUserStatus(user, easternNow);
    return { user, ...status };
  });

  const recommendedRow =
    rows.find((row) => row.status === "available") ||
    rows.find((row) => row.status === "later") ||
    null;

  return { system, rows, recommendedRow };
}

function getUserStatus(user, easternNow) {
  const holidayMatches = getHolidaysForUser(user.id, easternNow.date);
  if (holidayMatches.length > 0) {
    return {
      status: "holiday",
      badge: "Holiday",
      selectable: false,
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
      return {
        status: "later",
        badge: "On break",
        selectable: true,
        message: `Currently on break${currentBreak.reason ? ` (${currentBreak.reason})` : ""}. Back at ${minutesToTime(nextStart)} ET; you can pick them anyway.`
      };
    }
  }

  const currentWindow = windows.find((window) => isWithinWindow(easternNow.minutes, toMinutes(window.start), toMinutes(window.end)));
  if (currentWindow && !currentBreak) {
    return {
      status: "available",
      badge: currentWindow.source === "extra" ? "Extra slot" : "Available",
      selectable: true,
      message: currentWindow.source === "extra"
        ? `Available now via extra coverage slot until ${currentWindow.end} ET.`
        : `Available now until ${currentWindow.end} ET.`
    };
  }

  const nextStart = findNextAvailableStart(easternNow.minutes, windows, breaks);
  if (nextStart !== null) {
    return {
      status: "later",
      badge: "Later today",
      selectable: true,
      message: `Not online yet. Scheduled to log in at ${minutesToTime(nextStart)} ET; you can pick them anyway.`
    };
  }

  if (windows.length > 0) {
    const latestEnd = Math.max(...windows.map((window) => toMinutes(window.end)));
    return {
      status: "unavailable",
      badge: "Done today",
      selectable: false,
      message: `No remaining availability today. Last scheduled end was ${minutesToTime(latestEnd)} ET.`
    };
  }

  return {
    status: "unavailable",
    badge: "Not scheduled",
    selectable: false,
    message: "Not scheduled today."
  };
}

function getScheduleWindowsForDate(user, date, day) {
  const scheduleWindows = user.schedules
    .filter((schedule) => schedule.days.includes(day))
    .map((schedule) => ({ id: schedule.id, source: "schedule", start: schedule.start, end: schedule.end }));

  const extraWindows = data.exceptions
    .filter((slot) => slot.userId === user.id && slot.date === date && slot.type === "extra")
    .map((slot) => ({ id: slot.id, source: "extra", start: slot.start, end: slot.end }));

  return scheduleWindows
    .concat(extraWindows)
    .filter((window) => isValidTimeRange(window.start, window.end))
    .sort((left, right) => toMinutes(left.start) - toMinutes(right.start));
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
      render();
    } catch (error) {
      window.alert(`Could not import JSON: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!window.confirm("Reset to sample data? This replaces local browser data.")) {
    return;
  }

  data = cloneData(defaultData);
  selectedAssigneeId = null;
  render();
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

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
      schedule.priority = Number(schedule.priority || 1);
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
}

function setDefaultDates() {
  const today = getEasternNow().date;
  if (elements.timelineDateInput) {
    elements.timelineDateInput.value ||= today;
  }

  if (elements.slotDateInput) {
    elements.slotDateInput.value ||= today;
  }

  if (elements.holidayDateInput) {
    elements.holidayDateInput.value ||= today;
  }
}

function graphBlock(block, options = {}) {
  const label = formatGraphBlockText(block.start, block.end, block.type, block.label);
  return `
    <span class="graph-block ${block.type}" style="${timeRangeStyle(block.start, block.end)}" title="${escapeHtml(label)}">
      ${options.hideLabel ? "" : `<span>${escapeHtml(label)}</span>`}
      ${graphRemoveButton(block)}
    </span>
  `;
}

function graphFloatingLabel(block) {
  const label = formatGraphBlockText(block.start, block.end, block.type, block.label);
  return `<span class="graph-floating-label" style="${timeStartStyle(block.start)}">${escapeHtml(label)}</span>`;
}

function weekGraphPill(block) {
  const label = formatGraphBlockText(block.start, block.end, block.type, block.label);
  return `
    <span class="week-pill ${block.type}">
      <span>${escapeHtml(label)}</span>
      ${graphRemoveButton(block)}
    </span>
  `;
}

function graphRemoveButton(block) {
  if (block.type === "schedule") {
    return `
      <button
        class="graph-remove"
        type="button"
        data-action="remove-schedule"
        data-user-id="${escapeHtml(block.userId)}"
        data-schedule-id="${escapeHtml(block.id)}"
        aria-label="Remove schedule ${escapeHtml(block.start)} to ${escapeHtml(block.end)}"
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
        aria-label="Remove ${block.type === "break" ? "break" : "extra slot"} ${escapeHtml(block.start)} to ${escapeHtml(block.end)}"
      >×</button>
    `;
  }

  return "";
}

function formatGraphBlockText(start, end, type, label) {
  if (type === "schedule") {
    return `${start}–${end}`;
  }

  if (type === "holiday") {
    return label;
  }

  return `${label} · ${start}–${end}`;
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

function getEasternNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const time = `${values.hour}:${values.minute}`;

  return {
    day: values.weekday,
    date: `${values.year}-${values.month}-${values.day}`,
    time,
    minutes: toMinutes(time)
  };
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

function rotate(items, startIndex) {
  if (items.length === 0) {
    return [];
  }

  return items.slice(startIndex).concat(items.slice(0, startIndex));
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
