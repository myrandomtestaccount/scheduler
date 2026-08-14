const items = [
  {
    status: "done",
    title: "Schedule core is shared",
    body: "React imports the existing schedule conversion helpers instead of creating a second timezone implementation."
  },
  {
    status: "done",
    title: "React build is isolated",
    body: "The legacy queue and admin pages keep working while the React entry builds separately from react.html."
  },
  {
    status: "next",
    title: "Next slice: queue core extraction",
    body: "Move assignment recommendation and recent-assignment edit behavior into tested framework-independent modules."
  },
  {
    status: "later",
    title: "Then migrate admin screens",
    body: "Schedule editor, graph, queue correction popup, and recent assignments should move before lower-risk settings pages."
  }
];

export function MigrationChecklist() {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Migration guardrails</p>
          <h2>What moves next</h2>
        </div>
      </div>

      <ul className="migration-list">
        {items.map((item) => (
          <li key={item.title}>
            <span className={`status-dot ${item.status}`} aria-hidden="true" />
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
