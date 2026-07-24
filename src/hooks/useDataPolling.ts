import { useEffect } from 'react';

export function useDataPolling(callback: () => void | Promise<void>, intervalMs: number = 5000) {
  useEffect(() => {
    // Initial call
    callback();

    // Setup polling
    const intervalId = setInterval(callback, intervalMs);

    return () => clearInterval(intervalId);
  }, [callback, intervalMs]);
}
