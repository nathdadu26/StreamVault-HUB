import { useState, useEffect } from "react";

export const KOYEB_SERVER_URL = 
  (import.meta as any).env?.VITE_KOYEB_PROCESSING_SERVER_URL || "https://your-koyeb-app.koyeb.app";

export function useBackendHealth() {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const checkHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${KOYEB_SERVER_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  return { isOnline, isChecking, checkHealth };
}
