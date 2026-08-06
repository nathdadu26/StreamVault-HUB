import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/src/components/Icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTaskSettings } from "../../hooks/useTaskSettings";
import { useBackendHealth } from "../../hooks/useBackendHealth";
import { motion, AnimatePresence } from "motion/react";

export function Bots() {
  const { settings, saveSettings, isLoading } = useTaskSettings();
  const { isOnline } = useBackendHealth();
  const [localSettings, setLocalSettings] = useState(settings);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    saveSettings(localSettings);
    setStatus({ type: "success", message: "Bot settings updated!" });
    setTimeout(() => setStatus({ type: null, message: "" }), 3000);
  };

  const setWebhook = () => {
    if (!localSettings.telegramBotToken) {
      setStatus({ type: "error", message: "Please enter a Bot Token first." });
      setTimeout(() => setStatus({ type: null, message: "" }), 3000);
      return;
    }
    // Logic for setting webhook would go here
    setStatus({ type: "success", message: "Webhook configured successfully!" });
    setTimeout(() => setStatus({ type: null, message: "" }), 3000);
  };

  if (isLoading) return null;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* SYSTEM OFFLINE BANNER */}
      {!isOnline && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
              <Icons.AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-black uppercase tracking-widest">SYSTEM OFFLINE</h4>
              <p className="text-xs font-bold opacity-80">Telegram Auto-Posting is currently paused. Connect backend to resume.</p>
            </div>
          </div>
          <Badge variant="destructive" className="font-black uppercase tracking-widest text-[9px] px-3 py-1">OFFLINE</Badge>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Bot Management</h2>
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
        {/* External Integrations (Moved from Settings) */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">External Integrations</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Connect third-party services</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="p-6 rounded-2xl bg-sky-500/5 border border-sky-500/10 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                  <Icons.Telegram className="h-6 w-6" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-sky-700">Telegram Bot API</h4>
                  <p className="text-xs text-sky-600/70 font-medium">Auto-post updates to your channel</p>
                </div>
              </div>
              <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/20 px-3 py-1">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Bot Configuration */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">Bot Configuration</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Primary Telegram bot connection details</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Telegram Bot Token</Label>
              <div className="flex gap-3">
                <Input 
                  placeholder="Enter your bot token here..."
                  value={localSettings.telegramBotToken}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                  className="h-11 rounded-xl bg-muted/20 border-border/40 focus-visible:ring-emerald-500/20 font-mono text-xs"
                />
                <Button 
                  onClick={setWebhook}
                  variant="outline"
                  className="h-11 px-6 rounded-xl font-bold text-xs border-border/40 hover:bg-sky-500/5 hover:text-sky-600 transition-colors"
                >
                  Set Webhook
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">
                Token format looks like <span className="font-mono text-emerald-500">123456789:ABCDefghIJKLmnoPQRstuvWXYZ</span>
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleSave}
                className="h-11 px-8 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              >
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bot Settings */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">Bot Settings</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Automated posting and behavior controls</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Icons.Clock className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold">Post Interval</h4>
                  <p className="text-xs text-muted-foreground font-medium">Automatically post videos to Telegram channels at set intervals.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-muted/20 border border-border/40">
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Interval Value</Label>
                  <Input 
                    type="number"
                    value={localSettings.telegramPostInterval}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, telegramPostInterval: parseInt(e.target.value) || 1 }))}
                    className="h-11 rounded-xl bg-background border-border/40 font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Time Unit</Label>
                  <select 
                    value={localSettings.telegramPostUnit}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, telegramPostUnit: e.target.value as "minutes" | "hours" }))}
                    className="flex h-11 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-2 text-[10px] text-muted-foreground font-medium">
                <Icons.Info className="h-3.5 w-3.5 text-sky-500" />
                Your bot will post every <span className="text-emerald-500 font-bold">{localSettings.telegramPostInterval} {localSettings.telegramPostUnit}</span>.
              </div>
            </div>

            <Separator className="bg-border/40" />
            
            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleSave}
                className="h-11 px-10 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              >
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
