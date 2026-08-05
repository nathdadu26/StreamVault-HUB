import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/src/components/Icons";
import { useTaskSettings } from "../../hooks/useTaskSettings";
import { motion, AnimatePresence } from "motion/react";

export function TaskLinksManagement() {
  const { settings, saveSettings, isLoading } = useTaskSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const validateUrl = (url: string) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSave = (key: keyof typeof localSettings) => {
    const url = localSettings[key];
    if (!validateUrl(url)) {
      setStatus({ type: "error", message: "Please enter a valid HTTP/HTTPS URL." });
      setTimeout(() => setStatus({ type: null, message: "" }), 3000);
      return;
    }

    const updated = { ...settings, [key]: url };
    saveSettings(updated);
    setStatus({ type: "success", message: "Link saved successfully!" });
    setTimeout(() => setStatus({ type: null, message: "" }), 3000);
  };

  const handleReset = (key: keyof typeof localSettings) => {
    setLocalSettings({ ...localSettings, [key]: "" });
  };

  if (isLoading) return null;

  return (
    <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
      <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Task Links Management</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Manage global redirect URLs for user tasks</CardDescription>
          </div>
          <AnimatePresence>
            {status.type && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                  status.type === "success" 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                }`}
              >
                {status.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {[
          { id: "task1Url", label: "Task 1 URL", icon: Icons.ListCheck, color: "bg-indigo-500" },
          { id: "task2Url", label: "Task 2 URL", icon: Icons.ListCheck, color: "bg-slate-700" },
          { id: "downloadTaskUrl", label: "Download Task URL", icon: Icons.Download, color: "bg-amber-500" },
        ].map((field) => (
          <div key={field.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg ${field.color} flex items-center justify-center text-white`}>
                <field.icon className="h-4 w-4" />
              </div>
              <Label className="text-xs font-bold text-muted-foreground">{field.label}</Label>
            </div>
            <div className="flex gap-3">
              <Input
                value={localSettings[field.id as keyof typeof localSettings]}
                onChange={(e) => setLocalSettings({ ...localSettings, [field.id]: e.target.value })}
                placeholder="https://..."
                className="h-11 rounded-xl bg-muted/20 border-border/40 focus-visible:ring-emerald-500/20 flex-1 font-medium text-sm"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleSave(field.id as keyof typeof localSettings)}
                  className="h-11 px-6 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
