import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    powerManager: any;
  }
}

export function usePowerState() {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (window.powerManager?.getStateSnapshot) {
      try {
        const snap = await window.powerManager.getStateSnapshot();
        setState(snap);
      } catch (err) {
        console.error("Failed to load power state snapshot:", err);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { state, loading, refresh };
}
