 "use client";

import { useEffect, useState } from "react";

type MiniFireworksProps = {
  durationMs?: number;
};

export function MiniFireworks({ durationMs = 900 }: MiniFireworksProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center pt-24">
      <div className="mini-fireworks-burst">
        {Array.from({ length: 8 }).map((_, index) => (
          <span key={index} className={`mini-fireworks-dot mini-fireworks-dot-${index + 1}`} />
        ))}
      </div>
    </div>
  );
}

