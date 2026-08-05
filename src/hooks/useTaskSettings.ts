import { useState, useEffect } from "react";
import { TaskSettings } from "../types";
import { DEFAULT_SETTINGS } from "../data/mock";

const SETTINGS_KEY = "stream_vault_task_settings";

export function useTaskSettings() {
  const [settings, setSettings] = useState<TaskSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setIsLoading(false);
  }, []);

  const saveSettings = (newSettings: TaskSettings) => {
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  return { settings, saveSettings, isLoading };
}
