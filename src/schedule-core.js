(function attachScheduleCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.ScheduleCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createScheduleCore() {
  const EASTERN_TIME_ZONE = "America/New_York";
  const SLOT_MINUTES = 30;
  const MAX_SCHEDULE_DURATION_MINUTES = 12 * 60;
  const MAX_REGION_COVERAGE_MINUTES = 14 * 60;
  const END_OF_DAY_TIME = "23:59";

  const TIMEZONE_ABBREVIATIONS = {
    et: { "-300": "EST", "-240": "EDT" },
    ct: { "-360": "CST", "-300": "CDT" },
    mt: { "-420": "MST", "-360": "MDT" },
    pt: { "-480": "PST", "-420": "PDT" },
    ak: { "-540": "AKST", "-480": "AKDT" },
    ht: { "-600": "HST" },
    utc: { "0": "UTC" },
    london: { "0": "GMT", "60": "BST" },
    paris: { "60": "CET", "120": "CEST" },
    athens: { "120": "EET", "180": "EEST" },
    moscow: { "180": "MSK" },
    istanbul: { "180": "TRT" },
    dubai: { "240": "GST" },
    karachi: { "300": "PKT" },
    ist: { "330": "IST" },
    dhaka: { "360": "BST" },
    bangkok: { "420": "ICT" },
    beijing: { "480": "CST/SGT" },
    tokyo: { "540": "JST/KST" },
    sydney: { "600": "AEST", "660": "AEDT" },
    adelaide: { "570": "ACST", "630": "ACDT" },
    perth: { "480": "AWST" },
    auckland: { "720": "NZST", "780": "NZDT" },
    samoa: { "780": "WST" }
  };

  function getTimeRangeDurationMinutes(start, end) {
    if (!isValidTimeInput(start || "") || !isValidTimeInput(end || "")) {
      return Number.POSITIVE_INFINITY;
    }

    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    const duration = endMinutes - startMinutes;
    return duration > 0 ? duration : duration + 24 * 60;
  }

  function isValidScheduleTimeRange(start, end) {
    return isValidTimeRangeWithinDuration(start, end, MAX_SCHEDULE_DURATION_MINUTES);
  }

  function isValidRegionCoverageTimeRange(start, end) {
    return isValidTimeRangeWithinDuration(start, end, MAX_REGION_COVERAGE_MINUTES);
  }

  function isValidTimeRangeWithinDuration(start, end, maxDurationMinutes) {
    const duration = getTimeRangeDurationMinutes(start, end);
    return Number.isFinite(duration) && duration > 0 && duration <= maxDurationMinutes;
  }

  function formatDurationMinutes(totalMinutes) {
    if (!Number.isFinite(totalMinutes)) {
      return "Invalid duration";
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  function getDateOffset(startDate, endDate) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / millisecondsPerDay);
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

  function getBusinessWeekRange(date) {
    const weekDates = getWeekDates(date);
    return {
      startDate: weekDates[0],
      endDate: weekDates[4]
    };
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

  function formatDisplayDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(parseDate(date));
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

    if (minutesUntilAvailable >= 24 * 60) {
      const days = Math.floor(minutesUntilAvailable / (24 * 60));
      const remainingMinutes = minutesUntilAvailable % (24 * 60);
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      const parts = [`${days} day${days === 1 ? "" : "s"}`];
      if (hours > 0) {
        parts.push(`${hours}hr${hours === 1 ? "" : "s"}`);
      }
      if (minutes > 0) {
        parts.push(`${minutes} min${minutes === 1 ? "" : "s"}`);
      }
      return parts.join(" ");
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
    return isForwardTimeRange(start, end);
  }

  function isForwardTimeRange(start, end) {
    return isValidTimeInput(start) && isValidTimeInput(end) && toMinutes(start) < toMinutes(end);
  }

  function isForwardDateRange(startDate, endDate) {
    return isValidDateInput(startDate) && isValidDateInput(endDate) && startDate <= endDate;
  }

  function isSameDayForwardEasternRange(start, end) {
    return start.date === end.date && isForwardTimeRange(start.time, end.time);
  }

  function isForwardDateTimeRange(startDate, startTime, endDate, endTime, allowEqual = false) {
    const comparison = compareDateTimeValues(startDate, startTime, endDate, endTime);
    return allowEqual ? comparison <= 0 : comparison < 0;
  }

  function compareDateTimeRecords(left, right) {
    return compareDateTimeValues(left.startDate || left.date, left.start, right.startDate || right.date, right.start);
  }

  function compareDateTimeValues(startDate, startTime, endDate, endTime) {
    const left = isValidDateInput(startDate || "") && isValidTimeInput(startTime || "")
      ? `${startDate} ${startTime}`
      : "";
    const right = isValidDateInput(endDate || "") && isValidTimeInput(endTime || "")
      ? `${endDate} ${endTime}`
      : "";
    return left.localeCompare(right);
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
    const offsetMinutes = getTimeZoneOffsetMinutes(date, timezone.timeZone);
    const configuredAbbreviation = TIMEZONE_ABBREVIATIONS[timezone.id]?.[String(offsetMinutes)];
    if (configuredAbbreviation) {
      return configuredAbbreviation;
    }

    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone.timeZone,
        timeZoneName: "short"
      }).formatToParts(date);
      return parts.find((p) => p.type === "timeZoneName")?.value || timezone.id.toUpperCase();
    } catch {
      return timezone.id.toUpperCase();
    }
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

  return {
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
    getTimeZoneOffsetMinutes,
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
  };
});
