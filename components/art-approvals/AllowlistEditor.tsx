"use client";

import { useEffect, useState } from "react";

function parseEmailLines(text: string): string[] {
  const parts = text.split(/[\n,;]+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of parts) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

type Props = {
  emails: string[];
  disabled?: boolean;
  saving?: boolean;
  onSave: (emails: string[]) => Promise<void>;
};

export function AllowlistEditor({ emails, disabled, saving, onSave }: Props) {
  const [draft, setDraft] = useState(() => emails.join("\n"));

  useEffect(() => {
    setDraft(emails.join("\n"));
  }, [emails]);

  const handleSave = async () => {
    await onSave(parseEmailLines(draft));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="art-approval-allowlist">
          Client reviewer emails
        </label>
        <p className="mb-2 text-caption text-text-secondary">
          One email per line, or separate with commas. These addresses may request an OTP on the
          client review link.
        </p>
        <textarea
          id="art-approval-allowlist"
          className="input min-h-[120px] font-mono text-caption"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled || saving}
          placeholder="client.reviewer@example.com"
        />
      </div>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => void handleSave()}
        disabled={disabled || saving}
      >
        {saving ? "Saving allowlist…" : "Save allowlist"}
      </button>
    </div>
  );
}
