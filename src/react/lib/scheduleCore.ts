import "../../schedule-core.js";
import type { DisplayTimezone } from "../types";

export interface ConvertedWallTime {
  date: string;
  time: string;
}

export interface EasternScheduleConversion {
  start: string;
  end: string;
  startDate: string;
  endDate: string;
  startDayOffset: number;
  endDayOffset: number;
}

export interface ScheduleCoreApi {
  EASTERN_TIME_ZONE: string;
  buildEasternScheduleFromDisplayTimes(date: string, start: string, end: string, sourceTimeZone: string): EasternScheduleConversion;
  convertWallTimeToTimeZone(date: string, time: string, sourceTimeZone: string, targetTimeZone: string): ConvertedWallTime;
  getTimezoneAbbreviation(date: Date, timezone: DisplayTimezone): string;
  getZonedDateTimeParts(date: Date, timeZone: string): ConvertedWallTime;
  zonedWallTimeToDate(date: string, time: string, timeZone: string): Date;
}

declare global {
  var ScheduleCore: ScheduleCoreApi | undefined;
}

function loadScheduleCore(): ScheduleCoreApi {
  const loadedScheduleCore = globalThis.ScheduleCore;
  if (!loadedScheduleCore) {
    throw new Error("ScheduleCore failed to initialize.");
  }

  return loadedScheduleCore;
}

export const scheduleCore = loadScheduleCore();

export function getEasternStoragePreview(date: string, start: string, end: string, timezone: DisplayTimezone) {
  const stored = scheduleCore.buildEasternScheduleFromDisplayTimes(date, start, end, timezone.timeZone);
  const roundTripStart = scheduleCore.convertWallTimeToTimeZone(
    stored.startDate,
    stored.start,
    scheduleCore.EASTERN_TIME_ZONE,
    timezone.timeZone
  );
  const roundTripEnd = scheduleCore.convertWallTimeToTimeZone(
    stored.endDate,
    stored.end,
    scheduleCore.EASTERN_TIME_ZONE,
    timezone.timeZone
  );
  const startInstant = scheduleCore.zonedWallTimeToDate(date, start, timezone.timeZone);

  return {
    stored,
    roundTripStart,
    roundTripEnd,
    abbreviation: scheduleCore.getTimezoneAbbreviation(startInstant, timezone)
  };
}
