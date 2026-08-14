export type TimeZoneId =
  | "et"
  | "ct"
  | "mt"
  | "pt"
  | "utc"
  | "london"
  | "paris"
  | "ist"
  | "tokyo"
  | "sydney";

export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface DisplayTimezone {
  id: TimeZoneId | string;
  label: string;
  timeZone: string;
}

export interface ScheduleRecord {
  id: string;
  shiftType: string;
  days: Weekday[];
  startDate: string;
  endDate: string;
  start: string;
  end: string;
  startDayOffset?: number;
  endDayOffset?: number;
}

export interface UserRecord {
  id: string;
  name: string;
  schedules: ScheduleRecord[];
  regions?: string[];
}
