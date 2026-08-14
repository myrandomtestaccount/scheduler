import { useMemo, useState } from "react";
import { getEasternStoragePreview } from "../../lib/scheduleCore";
import type { DisplayTimezone } from "../../types";

const popularTimezones: DisplayTimezone[] = [
  { id: "et", label: "Eastern", timeZone: "America/New_York" },
  { id: "pt", label: "Pacific", timeZone: "America/Los_Angeles" },
  { id: "utc", label: "UTC", timeZone: "UTC" },
  { id: "london", label: "London", timeZone: "Europe/London" },
  { id: "paris", label: "Paris", timeZone: "Europe/Paris" },
  { id: "ist", label: "India", timeZone: "Asia/Kolkata" },
  { id: "tokyo", label: "Tokyo", timeZone: "Asia/Tokyo" },
  { id: "sydney", label: "Sydney", timeZone: "Australia/Sydney" }
];

export function ScheduleConversionPanel() {
  const [timezoneId, setTimezoneId] = useState("london");
  const [date, setDate] = useState("2026-08-14");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  const timezone = popularTimezones.find((item) => item.id === timezoneId) ?? popularTimezones[0];
  const preview = useMemo(() => getEasternStoragePreview(date, start, end, timezone), [date, end, start, timezone]);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">First migrated slice</p>
          <h2>Schedule timezone conversion</h2>
          <p className="meta">
            The React shell already uses the existing tested core, so schedule math stays centralized while the UI moves.
          </p>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Timezone</span>
          <select value={timezoneId} onChange={(event) => setTimezoneId(event.target.value)}>
            {popularTimezones.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="field">
          <span>Start</span>
          <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="field">
          <span>End</span>
          <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
      </div>

      <div className="migration-grid">
        <div className="conversion-result">
          <span>Entered schedule</span>
          <strong>{start}–{end} {preview.abbreviation}</strong>
        </div>
        <div className="conversion-result">
          <span>Stored Eastern</span>
          <strong>{preview.stored.start}–{preview.stored.end}</strong>
          <span>
            Offsets: start {preview.stored.startDayOffset}, end {preview.stored.endDayOffset}
          </span>
        </div>
        <div className="conversion-result">
          <span>Round-trip check</span>
          <strong>{preview.roundTripStart.time}–{preview.roundTripEnd.time}</strong>
          <span>{preview.roundTripStart.date} → {preview.roundTripEnd.date}</span>
        </div>
      </div>
    </section>
  );
}
