const STORAGE_KEY = "smeScheduler.data.v1";
const EASTERN_TIME_ZONE = "America/New_York";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultData = {
  users: [
    {
      id: "alice",
      name: "Alice",
      schedules: [
        { id: "alice-weekdays", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "08:00", end: "16:00", priority: 1 }
      ]
    },
    {
      id: "ben",
      name: "Ben",
      schedules: [
        { id: "ben-weekdays", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "09:00", end: "17:00", priority: 2 }
      ]
    },
    {
      id: "casey",
      name: "Casey",
      schedules: [
        { id: "casey-weekdays", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], start: "10:00", end: "18:00", priority: 3 }
      ]
    }
  ],
  systems: [
    { id: "external-system", name: "External System", primaryUserIds: ["alice", "ben"] },
    { id: "internal-api", name: "Internal API", primaryUserIds: ["casey", "alice"] }
  ],
  queues: {
    "external-system": 0,
    "internal-api": 0
  },
  assignmentLog: []
};

let data = loadData();

const elements = {
  currentEtTime: document.querySelector("#currentEtTime"),
  assignmentSystemSelect: document.querySelector("#assignmentSystemSelect"),
  suggestionCard: document.querySelector("#suggestionCard"),
  markAssignedButton: document.querySelector("#markAssignedButton"),
  queueList: document.querySelector("#queueList"),
  assignmentLog: document.querySelector("#assignmentLog"),
  refreshButton: document.querySelector("#refreshButton"),
  addUserForm: document.querySelector("#addUserForm"),
  userNameInput: document.querySelector("#userNameInput"),
  usersList: document.querySelector("#usersList"),
  addScheduleForm: document.querySelector("#addScheduleForm"),
  scheduleUserSelect: document.querySelector("#scheduleUserSelect"),
  dayCheckboxes: document.querySelector("#dayCheckboxes"),
  scheduleStartInput: document.querySelector("#scheduleStartInput"),
  scheduleEndInput: document.querySelector("#scheduleEndInput"),
  schedulePriorityInput: document.querySelector("#schedulePriorityInput"),
  scheduleList: document.querySelector("#scheduleList"),
  addSystemForm: document.querySelector("#addSystemForm"),
  systemNameInput: document.querySelector("#systemNameInput"),
  systemsList: document.querySelector("#systemsList"),
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

  elements.refreshButton.addEventListener("click", render);
  elements.assignmentSystemSelect.addEventListener("change", renderClockAndAssignment);
  elements.markAssignedButton.addEventListener("click", markSuggestedAssigned);
  elements.addUserForm.addEventListener("submit", addUser);
  elements.addScheduleForm.addEventListener("submit", addSchedule);
  elements.addSystemForm.addEventListener("submit", addSystem);
  elements.exportButton.addEventListener("click", exportData);
  elements.importInput.addEventListener("change", importData);
  elements.resetButton.addEventListener("click", resetData);
}

function activateTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Tab`);
  });
}

function render() {
  normalizeData();
  saveData();
  renderSystemSelect();
  renderScheduleUserSelect();
  renderUsers();
  renderSchedules();
  renderSystems();
  renderDataPreview();
  renderClockAndAssignment();
}

function renderClockAndAssignment() {
  const easternNow = getEasternNow();
  elements.currentEtTime.textContent = `${easternNow.day} ${easternNow.time}`;

  const selectedSystemId = elements.assignmentSystemSelect.value;
  const suggestion = getSuggestion(selectedSystemId, easternNow);

  renderSuggestion(suggestion);
  renderQueue(suggestion);
  renderAssignmentLog();
}

function renderSystemSelect() {
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

function renderSuggestion(suggestion) {
  if (!suggestion.system) {
    elements.suggestionCard.innerHTML = `<span class="suggestion-name">No system selected</span><span class="suggestion-meta">Add a system/app first.</span>`;
    elements.markAssignedButton.disabled = true;
    return;
  }

  if (!suggestion.user) {
    elements.suggestionCard.innerHTML = `<span class="suggestion-name">No available user</span><span class="suggestion-meta">${escapeHtml(suggestion.message)}</span>`;
    elements.markAssignedButton.disabled = true;
    return;
  }

  elements.suggestionCard.innerHTML = `
    <span class="suggestion-name">${escapeHtml(suggestion.user.name)}</span>
    <span class="suggestion-meta">${escapeHtml(suggestion.message)}</span>
  `;
  elements.markAssignedButton.disabled = false;
}

function renderQueue(suggestion) {
  const rows = suggestion.queue.map((row, index) => {
    const statusClass = row.available ? "available" : "unavailable";
    const position = index === 0 ? "Next" : `#${index + 1}`;
    return `
      <div class="list-item">
        <div>
          <div class="item-title">${position}: ${escapeHtml(row.user.name)}</div>
          <div class="meta">${escapeHtml(row.scheduleText)}</div>
        </div>
        <span class="status-pill ${statusClass}">${row.available ? "Available" : "Unavailable"}</span>
      </div>
    `;
  }).join("");

  elements.queueList.innerHTML = rows || emptyState("No primary users assigned to this system.");
}

function renderAssignmentLog() {
  const rows = data.assignmentLog.slice(-8).reverse().map((entry) => {
    const system = data.systems.find((item) => item.id === entry.systemId);
    const userName = entry.userName || data.users.find((user) => user.id === entry.userId)?.name || "Removed user";
    const assignedAt = new Date(entry.assignedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
    return `
      <div class="list-item">
        <div>
          <div class="item-title">${escapeHtml(userName)}</div>
          <div class="meta">${escapeHtml(system?.name || "Removed system")} · ${assignedAt}</div>
        </div>
        <span class="status-pill ${entry.wasFallback ? "unavailable" : "available"}">${entry.wasFallback ? "Fallback" : "Primary"}</span>
      </div>
    `;
  }).join("");

  elements.assignmentLog.innerHTML = rows || emptyState("No assignments yet.");
}

function renderUsers() {
  const rows = data.users.map((user) => {
    const scheduleCount = user.schedules.length;
    const coverageCount = data.systems.filter((system) => system.primaryUserIds.includes(user.id)).length;
    return `
      <div class="list-item">
        <div>
          <div class="item-title">${escapeHtml(user.name)}</div>
          <div class="meta">${scheduleCount} schedule block${scheduleCount === 1 ? "" : "s"} · ${coverageCount} system/app assignment${coverageCount === 1 ? "" : "s"}</div>
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

function renderScheduleUserSelect() {
  const selectedValue = elements.scheduleUserSelect.value;
  elements.scheduleUserSelect.innerHTML = "";

  data.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.name;
    elements.scheduleUserSelect.append(option);
  });

  if (data.users.some((user) => user.id === selectedValue)) {
    elements.scheduleUserSelect.value = selectedValue;
  }
}

function renderDayCheckboxes() {
  elements.dayCheckboxes.innerHTML = DAYS.map((day) => `
    <label class="check-row">
      <input type="checkbox" value="${day}" ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(day) ? "checked" : ""}>
      <span>${day.slice(0, 3)}</span>
    </label>
  `).join("");
}

function renderSchedules() {
  const rows = data.users.flatMap((user) => {
    return user.schedules.map((schedule) => {
      return `
        <div class="list-item">
          <div>
            <div class="item-title">${escapeHtml(user.name)}</div>
            <div class="meta">${escapeHtml(schedule.days.join(", "))} · ${schedule.start}–${schedule.end} ET · Priority ${schedule.priority}</div>
          </div>
          <button class="remove-button" type="button" data-action="remove-schedule" data-user-id="${escapeHtml(user.id)}" data-schedule-id="${escapeHtml(schedule.id)}">Remove</button>
        </div>
      `;
    });
  }).join("");

  elements.scheduleList.innerHTML = rows || emptyState("Add a schedule block.");
  elements.scheduleList.querySelectorAll("[data-action='remove-schedule']").forEach((button) => {
    button.addEventListener("click", () => removeSchedule(button.dataset.userId, button.dataset.scheduleId));
  });
}

function renderSystems() {
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

function renderDataPreview() {
  elements.dataPreview.value = JSON.stringify(data, null, 2);
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
  if (!user || !window.confirm(`Remove ${user.name}? This also removes them from system coverage.`)) {
    return;
  }

  data.users = data.users.filter((item) => item.id !== userId);
  data.systems.forEach((system) => {
    system.primaryUserIds = system.primaryUserIds.filter((id) => id !== userId);
    clampQueue(system.id);
  });
  render();
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

  user.schedules.push({
    id: makeRecordId("schedule"),
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
  render();
}

function markSuggestedAssigned() {
  const suggestion = getSuggestion(elements.assignmentSystemSelect.value, getEasternNow());
  if (!suggestion.user || !suggestion.system) {
    return;
  }

  data.assignmentLog.push({
    id: makeRecordId("assignment"),
    assignedAt: new Date().toISOString(),
    systemId: suggestion.system.id,
    systemName: suggestion.system.name,
    userId: suggestion.user.id,
    userName: suggestion.user.name,
    wasFallback: suggestion.wasFallback
  });

  if (!suggestion.wasFallback) {
    data.queues[suggestion.system.id] = (getQueueIndex(suggestion.system) + 1) % suggestion.system.primaryUserIds.length;
  }

  render();
}

function getSuggestion(systemId, easternNow) {
  const system = data.systems.find((item) => item.id === systemId);
  if (!system) {
    return { system: null, user: null, queue: [], wasFallback: false, message: "Add a system/app first." };
  }

  const primaryUsers = system.primaryUserIds
    .map((userId) => data.users.find((user) => user.id === userId))
    .filter(Boolean);
  const queue = rotate(primaryUsers, getQueueIndex(system)).map((user) => {
    const availability = getAvailability(user, easternNow);
    return {
      user,
      available: availability.available,
      priority: availability.priority,
      scheduleText: availability.text
    };
  });

  const nextPrimary = queue[0];
  if (nextPrimary?.available) {
    return {
      system,
      user: nextPrimary.user,
      queue,
      wasFallback: false,
      message: "Next primary SME is currently available."
    };
  }

  const primaryIds = new Set(system.primaryUserIds);
  const fallback = data.users
    .filter((user) => !primaryIds.has(user.id))
    .map((user) => ({ user, availability: getAvailability(user, easternNow) }))
    .filter((item) => item.availability.available)
    .sort((left, right) => {
      return left.availability.priority - right.availability.priority ||
        left.availability.startMinutes - right.availability.startMinutes ||
        left.user.name.localeCompare(right.user.name);
    })[0];

  if (fallback) {
    return {
      system,
      user: fallback.user,
      queue,
      wasFallback: true,
      message: `${nextPrimary?.user.name || "The next primary SME"} is unavailable. Suggested fallback is available now.`
    };
  }

  return {
    system,
    user: null,
    queue,
    wasFallback: false,
    message: nextPrimary ? `${nextPrimary.user.name} is unavailable and no fallback user is scheduled now.` : "No primary SMEs assigned to this system."
  };
}

function getAvailability(user, easternNow) {
  const matchingSchedules = user.schedules
    .filter((schedule) => schedule.days.includes(easternNow.day))
    .filter((schedule) => isWithinWindow(easternNow.minutes, toMinutes(schedule.start), toMinutes(schedule.end)))
    .sort((left, right) => Number(left.priority) - Number(right.priority) || toMinutes(left.start) - toMinutes(right.start));

  if (matchingSchedules.length === 0) {
    return {
      available: false,
      priority: Number.MAX_SAFE_INTEGER,
      startMinutes: Number.MAX_SAFE_INTEGER,
      text: "Not scheduled now"
    };
  }

  const schedule = matchingSchedules[0];
  return {
    available: true,
    priority: Number(schedule.priority),
    startMinutes: toMinutes(schedule.start),
    text: `${schedule.start}–${schedule.end} ET · Priority ${schedule.priority}`
  };
}

function getEasternNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const time = `${values.hour}:${values.minute}`;

  return {
    day: values.weekday,
    time,
    minutes: toMinutes(time)
  };
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
  data.queues = data.queues && typeof data.queues === "object" ? data.queues : {};
  data.users.forEach((user) => {
    user.schedules = Array.isArray(user.schedules) ? user.schedules : [];
  });
  data.systems.forEach((system) => {
    system.primaryUserIds = system.primaryUserIds.filter((userId) => data.users.some((user) => user.id === userId));
    if (!(system.id in data.queues)) {
      data.queues[system.id] = 0;
    }
    clampQueue(system.id);
  });
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
