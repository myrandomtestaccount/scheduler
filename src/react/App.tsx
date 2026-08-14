import { MigrationChecklist } from "./features/migration/MigrationChecklist";
import { ScheduleConversionPanel } from "./features/schedules/ScheduleConversionPanel";

export function App() {
  return (
    <>
      <header className="hero react-migration-hero">
        <div className="hero-topbar">
          <a className="brand-lockup" href="index.html" aria-label="Go to assignment queue">
            <img src="images/logo.png" alt="" aria-hidden="true" className="logo-img" />
            <span className="logo-wordmark">SME Queue</span>
          </a>
          <div className="hero-actions">
            <a className="secondary-link" href="index.html">Legacy queue</a>
            <a className="secondary-link" href="admin.html">Legacy admin</a>
          </div>
        </div>
        <div className="react-migration-title">
          <p className="eyebrow">React migration</p>
          <h1>Rebuild the UI without moving the schedule goalposts</h1>
          <p>
            This shell is intentionally small: it proves React can consume the existing tested schedule core before
            the high-risk admin and queue screens move over.
          </p>
        </div>
      </header>

      <main className="shell react-migration-shell">
        <ScheduleConversionPanel />
        <MigrationChecklist />
      </main>
    </>
  );
}
