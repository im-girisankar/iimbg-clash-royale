"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* The entire live-update mechanism: router.refresh() every 10s, which
   re-runs the Server Component tree against `revalidate = 5` data. No
   websockets, no polling endpoint. */
export function AutoRefresh() {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const refreshId = setInterval(() => {
      router.refresh();
      setSecondsAgo(0);
    }, 10_000);
    const tickId = setInterval(() => setSecondsAgo((s) => s + 1), 1_000);

    return () => {
      clearInterval(refreshId);
      clearInterval(tickId);
    };
  }, [router]);

  return (
    <p className="text-center text-xs text-fg-subtle" aria-live="polite">
      Updated {secondsAgo}s ago
    </p>
  );
}
