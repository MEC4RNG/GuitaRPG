"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountDataControls({ recoverable }: { recoverable: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function deletePlayer() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Account deletion failed.");
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account deletion failed.");
      setPending(false);
    }
  }

  return (
    <section className="account-data-controls" aria-labelledby="player-data-title">
      <div>
        <p className="eyebrow">PLAYER DATA</p>
        <h3 id="player-data-title">Export or delete your Player</h3>
        <p>
          {recoverable
            ? "Download a JSON copy of your Player-owned data or permanently delete the account."
            : "Guest Players can be permanently deleted, but cannot export until progress is protected."}
        </p>
      </div>
      {recoverable ? (
        <a className="action-button action-button--secondary" href="/api/account/export" download>
          Download my data
        </a>
      ) : null}
      {!open ? (
        <button
          className="action-button action-button--danger"
          type="button"
          onClick={() => setOpen(true)}
        >
          Delete this Player
        </button>
      ) : (
        <div className="account-delete-confirmation" role="group" aria-labelledby="delete-title">
          <h4 id="delete-title">Permanently delete this Player?</h4>
          <p>
            This removes the account and all Profile, goals, Quests, Sessions, Results, evidence,
            history, XP, Skills, readiness, Attributes, and progression events. This cannot be
            undone.
          </p>
          {recoverable ? <p>You must have signed in within the last 10 minutes.</p> : null}
          <label>
            Type DELETE to confirm
            <input
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <div className="account-delete-actions">
            <button
              className="action-button action-button--danger"
              disabled={pending || confirmation !== "DELETE"}
              type="button"
              onClick={() => void deletePlayer()}
            >
              {pending ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              className="action-button action-button--secondary"
              disabled={pending}
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmation("");
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
          {error ? <p role="alert">{error}</p> : null}
        </div>
      )}
    </section>
  );
}
