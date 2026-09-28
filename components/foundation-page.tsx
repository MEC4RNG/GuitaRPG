import { PageHeader } from "./page-header";
import { Panel } from "./panel";

type FoundationPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  milestone: string;
  contract: string;
};

export function FoundationPage({
  eyebrow,
  title,
  description,
  milestone,
  contract,
}: FoundationPageProps) {
  return (
    <div className="page-stack">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="foundation-grid">
        <Panel raised>
          <span className="panel__label">FOUNDATION STATUS</span>
          <h2>Route ready</h2>
          <p>
            This surface is now part of the production application shell. Feature behavior will be
            introduced by its dedicated implementation ticket rather than mocked here.
          </p>
          <span className="status-chip status-chip--success">
            <span aria-hidden="true">✓</span>
            Shell integrated
          </span>
        </Panel>

        <Panel>
          <span className="panel__label">NEXT MILESTONE</span>
          <h2>{milestone}</h2>
          <p>{contract}</p>
        </Panel>
      </div>
    </div>
  );
}
