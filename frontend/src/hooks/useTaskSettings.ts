import { useState, useEffect } from "react";
import { TaskSettings } from "../types";
import { getStoredSettings, saveStoredSettings } from "../lib/api";

export function useTaskSettings() {
  const [settings, setSettings] = useState<TaskSettings>(getStoredSettings());

  useEffect(() => {
    // Also attempt async fetch from Cloudflare Pages Function endpoint /api/settings
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: any) => {
        if (data && (data.task1Url !== undefined || data.downloadTaskUrl !== undefined)) {
          setSettings(data);
          saveStoredSettings(data);
        }
      })
      .catch((err) => console.error("[useTaskSettings] Error fetching settings:", err));
  }, []);

  const updateSettings = async (newSettings: TaskSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
    } catch (err) {
      console.error("[useTaskSettings] Error saving settings:", err);
    }
  };

  return { settings, updateSettings };
}
