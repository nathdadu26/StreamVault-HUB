import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/src/components/Icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { TaskLinksManagement } from "@/src/components/admin/TaskLinksManagement";
import { useTaskSettings } from "../../hooks/useTaskSettings";
import { motion, AnimatePresence } from "motion/react";

export function Settings() {
  const { settings, saveSettings, isLoading } = useTaskSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSaveAll = () => {
    saveSettings(localSettings);
    setStatus({ type: "success", message: "Settings updated successfully!" });
    setTimeout(() => setStatus({ type: null, message: "" }), 3000);
  };

  const handleToggle = (key: keyof typeof localSettings) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (isLoading) return null;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Platform Settings</h2>
        <AnimatePresence>
          {status.type && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`text-xs font-bold px-4 py-2 rounded-xl border ${
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

      <div className="grid grid-cols-1 gap-8">
        {/* Task Links Management */}
        <TaskLinksManagement />

        {/* Telegram Community Management */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">Telegram Community</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Manage the global Telegram community link used across the website</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Telegram Channel URL</Label>
              <div className="flex gap-3">
                <Input 
                  placeholder="https://t.me/your_channel"
                  value={localSettings.telegramChannelUrl}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, telegramChannelUrl: e.target.value }))}
                  className="h-11 rounded-xl bg-muted/20 border-border/40 focus-visible:ring-emerald-500/20"
                />
                <Button 
                  onClick={handleSaveAll}
                  className="h-11 px-8 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                >
                  Save
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">
                This link will be used for all "Join Telegram" buttons globally.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">Security & Access</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Protection and verification controls</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-6">
              {/* VPN Detection */}
              <div className="flex items-center justify-between group">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-foreground">VPN Detection</h4>
                  <p className="text-xs text-muted-foreground font-medium">Block visitors using VPN or Proxies</p>
                </div>
                <Switch 
                  checked={localSettings.vpnDetectionEnabled} 
                  onCheckedChange={() => handleToggle("vpnDetectionEnabled")}
                  className="data-[state=checked]:bg-emerald-500" 
                />
              </div>

              <Separator className="bg-border/40" />

              {/* AdBlock Detection */}
              <div className="flex items-center justify-between group">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-foreground">AdBlocker Detection</h4>
                  <p className="text-xs text-muted-foreground font-medium">Force users to disable AdBlock to continue</p>
                </div>
                <Switch 
                  checked={localSettings.adBlockDetectionEnabled} 
                  onCheckedChange={() => handleToggle("adBlockDetectionEnabled")}
                  className="data-[state=checked]:bg-emerald-500" 
                />
              </div>

              <Separator className="bg-border/40" />

              {/* Link Expiration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-foreground">Link Expiration</h4>
                    <p className="text-xs text-muted-foreground font-medium">Time until task links become invalid</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number"
                      value={localSettings.linkExpirationMinutes}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, linkExpirationMinutes: parseInt(e.target.value) || 0 }))}
                      className="h-10 w-20 text-center font-bold text-xs rounded-xl bg-muted/20 border-border/40"
                    />
                    <span className="text-xs font-bold text-muted-foreground">Minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 pt-4">
           <Button variant="outline" className="h-11 px-6 rounded-xl font-bold text-xs border-border/40" onClick={() => setLocalSettings(settings)}>Cancel</Button>
           <Button className="h-11 px-8 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" onClick={handleSaveAll}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
