import { useState, useEffect } from "react";

const rawUrl = (import.meta as any).env?.VITE_KOYEB_PROCESSING_SERVER_URL;
export const KOYEB_SERVER_URL = rawUrl ? rawUrl.replace(/\/$/, "") : "";

export function useBackendHealth() {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const checkHealth = async () => {
    if (!KOYEB_SERVER_URL) {
      console.error("[BackendHealth] VITE_KOYEB_PROCESSING_SERVER_URL is not defined in environment variables.");
      setIsOnline(false);
      setIsChecking(false);
      return;
    }

    const healthUrl = `${KOYEB_SERVER_URL}/health`;
    console.log(`[BackendHealth] Requesting: ${healthUrl}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      console.log(`[BackendHealth] HTTP Status Code: ${response.status}`);
      
      const body = await response.json().catch((e) => {
        console.error("[BackendHealth] Failed to parse JSON body:", e);
        return null;
      }) as any;
      
      console.log("[BackendHealth] Response Body:", body);

      if (response.status === 200 && body && body.status === "online") {
        setIsOnline(true);
      } else {
        console.warn(`[BackendHealth] SYSTEM OFFLINE - Unexpected response. Status: ${response.status}, Body:`, body);
        setIsOnline(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`[BackendHealth] Request timed out after 10s: ${healthUrl}`);
      } else {
        console.error(`[BackendHealth] Network error / CORS failure:`, err.message || err);
      }
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Retry every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return { isOnline, isChecking, checkHealth };
}
