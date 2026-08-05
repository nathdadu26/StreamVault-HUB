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

        {/* Integration Settings */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">External Integrations</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Connect third-party services</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6">
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
                  <Button variant="outline" className="border-sky-500/20 text-sky-600 hover:bg-sky-500/10 h-10 rounded-xl px-6 font-bold text-xs">Configure</Button>
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
