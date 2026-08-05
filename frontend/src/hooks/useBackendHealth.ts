import { useState, useEffect } from "react";

const KOYEB_SERVER_URL = import.meta.env.VITE_KOYEB_PROCESSING_SERVER_URL || "http://localhost:3000";

export function useBackendHealth() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${KOYEB_SERVER_URL}/health`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json() as any;
          setIsOnline(data.status === "online");
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("[BackendHealth] Health check failed:", error);
        setIsOnline(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isLoading };
}
