import { useState, useEffect } from "react";
import { TaskSettings } from "../types";
import { getStoredSettings, saveStoredSettings } from "../lib/api";

export function useTaskSettings() {
  const [settings, setSettings] = useState<TaskSettings>(getStoredSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load stored settings from Cloudflare D1 / D1 store
    const current = getStoredSettings();
    setSettings(current);
    setIsLoading(false);

    // Also attempt async fetch from Cloudflare Pages Function endpoint /api/settings
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: any) => {
        if (data && (data.task1Url !== undefined || data.downloadTaskUrl !== undefined)) {
          setSettings(data);
          saveStoredSettings(data);
        }
      })
      .catch(() => {});
  }, []);

  const saveSettings = (newSettings: TaskSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  return { settings, saveSettings, isLoading };
}
