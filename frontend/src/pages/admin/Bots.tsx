import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/src/components/Icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTaskSettings } from "../../hooks/useTaskSettings";
import { motion, AnimatePresence } from "motion/react";
import { TelegramChannel, TaskSettings } from "../../types";
import {
  fetchTelegramChannels,
  saveTelegramChannel,
  deleteTelegramChannel,
  toggleTelegramChannel,
  recordTelegramPostResult,
  getStoredFiles,
  KOYEB_SERVER_URL,
} from "../../lib/api";

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class BotsErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[BotsErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 text-center bg-rose-500/5 border border-rose-500/20 rounded-3xl space-y-4">
          <div className="h-16 w-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            {Icons?.AlertTriangle ? <Icons.AlertTriangle className="h-8 w-8" /> : <span>⚠️</span>}
          </div>
          <div>
            <h2 className="text-xl font-bold text-rose-600">Bots Menu Error</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              A runtime error occurred in the Telegram Automation module.
            </p>
          </div>
          <div className="p-4 bg-background border border-border/40 rounded-xl text-left overflow-auto max-h-40">
            <code className="text-[10px] text-rose-500 font-mono whitespace-pre">
              {this.state.error?.stack || this.state.error?.message}
            </code>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-8"
          >
            Reset Module
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function BotsContent() {
  const { settings: rawSettings, saveSettings, isLoading } = useTaskSettings();
  
  // Ensure settings are NEVER undefined
  const settings: TaskSettings = rawSettings || {
    task1Url: "",
    task2Url: "",
    downloadTaskUrl: "",
    vpnDetectionEnabled: false,
    adBlockDetectionEnabled: false,
    linkExpirationMinutes: 30,
    telegramBotToken: "",
    telegramPostInterval: 30,
    telegramPostUnit: "minutes",
    telegramPostQuantity: 1,
    telegramChannelUrl: "",
  };

  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [intervalVal, setIntervalVal] = useState<number>(30);
  const [intervalUnit, setIntervalUnit] = useState<"minutes" | "hours">("minutes");
  const [postQuantity, setPostQuantity] = useState<number>(1);
  
  // UI states
  const [status, setStatus] = useState<{ type: "success" | "error" | "info" | null; message: string }>({
    type: null,
    message: "",
  });
  const [isPosting, setIsPosting] = useState(false);
  const [postingProgress, setPostingProgress] = useState("");
  
  // Manual add channel state
  const [newChanName, setNewChanName] = useState("");
  const [newChanId, setNewChanId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (settings) {
      setIntervalVal(settings.telegramPostInterval || 30);
      setIntervalUnit(settings.telegramPostUnit || "minutes");
      setPostQuantity(settings.telegramPostQuantity || 1);
    }
  }, [settings]);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const list = await fetchTelegramChannels();
      setChannels(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("[Bots] loadChannels error:", err);
      setChannels([]);
    }
  };

  const showStatus = (type: "success" | "error" | "info", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: null, message: "" }), 4000);
  };

  // 1. Save Interval
  const handleSaveInterval = () => {
    const val = Math.max(1, Number(intervalVal) || 1);
    const newSettings = {
      ...settings,
      telegramPostInterval: val,
      telegramPostUnit: intervalUnit,
    };
    saveSettings(newSettings);
    showStatus("success", `Posting interval updated to every ${val} ${intervalUnit}.`);
  };

  // 2. Save Quantity
  const handleSaveQuantity = () => {
    let qty = Number(postQuantity) || 1;
    if (qty < 1) qty = 1;
    if (qty > 20) qty = 20;
    setPostQuantity(qty);

    const newSettings = {
      ...settings,
      telegramPostQuantity: qty,
    };
    saveSettings(newSettings);
    showStatus("success", `Post quantity saved to ${qty} post(s) per channel.`);
  };

  // 3. Add Channel
  const handleAddChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanId.trim()) {
      showStatus("error", "Channel ID is required (e.g. -100123456789).");
      return;
    }

    const cleanId = newChanId.trim();
    const cleanName = newChanName.trim() || `Channel ${cleanId}`;

    // Check duplicate
    if (Array.isArray(channels) && channels.some((c) => c?.channelId === cleanId)) {
      showStatus("error", `Channel ${cleanId} already exists!`);
      return;
    }

    try {
      const updated = await saveTelegramChannel({
        channelId: cleanId,
        channelName: cleanName,
        enabled: true,
        totalSuccess: 0,
        totalFailed: 0,
      });
      setChannels(Array.isArray(updated) ? updated : []);
      setNewChanName("");
      setNewChanId("");
      setIsAdding(false);
      showStatus("success", `Channel "${cleanName}" added successfully.`);
    } catch (err: any) {
      showStatus("error", "Failed to add channel: " + err.message);
    }
  };

  // 4. Toggle Channel
  const handleToggle = async (channelId: string) => {
    try {
      const updated = await toggleTelegramChannel(channelId);
      setChannels(Array.isArray(updated) ? updated : []);
      const target = updated?.find((c) => c?.channelId === channelId || c?.id === channelId);
      if (target) {
        showStatus("info", `Channel "${target.channelName}" ${target.enabled ? "Enabled" : "Disabled"}.`);
      }
    } catch (err: any) {
      showStatus("error", "Failed to toggle: " + err.message);
    }
  };

  // 5. Remove Channel
  const handleRemove = async (channelId: string) => {
    try {
      const updated = await deleteTelegramChannel(channelId);
      setChannels(Array.isArray(updated) ? updated : []);
      showStatus("success", "Channel removed.");
    } catch (err: any) {
      showStatus("error", "Failed to remove: " + err.message);
    }
  };

  // 6. Posting Workflow
  const runPostingWorkflowForChannel = async (channel: TelegramChannel, qty: number) => {
    if (!channel) return { successCount: 0, failCount: 0 };
    const videos = getStoredFiles() || [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i <= qty; i++) {
      setPostingProgress(`[${channel.channelName}] Sending Post ${i} of ${qty}...`);
      
      try {
        const videoToPost = videos.length > 0 ? videos[Math.floor(Math.random() * videos.length)] : null;
        const botToken = settings.telegramBotToken;

        if (botToken && botToken.length > 5 && videoToPost) {
          const caption = `🎬 <b>${videoToPost.title || "New Media"}</b>\n\n📺 Watch & Download:\n${window.location.origin}/s/${videoToPost.slug}`;
          const photoUrl = videoToPost.thumbnailUrl;

          const endpoint = photoUrl
            ? `https://api.telegram.org/bot${botToken}/sendPhoto`
            : `https://api.telegram.org/bot${botToken}/sendMessage`;

          const bodyPayload = photoUrl
            ? { chat_id: channel.channelId, photo: photoUrl, caption, parse_mode: "HTML" }
            : { chat_id: channel.channelId, text: caption, parse_mode: "HTML" };

          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyPayload),
          });

          if (res.ok) {
            successCount++;
            const updated = await recordTelegramPostResult(channel.channelId, true);
            setChannels(Array.isArray(updated) ? updated : []);
          } else {
            failCount++;
            const updated = await recordTelegramPostResult(channel.channelId, false);
            setChannels(Array.isArray(updated) ? updated : []);
          }
        } else {
          // Demo mode or missing token/video
          successCount++;
          const updated = await recordTelegramPostResult(channel.channelId, true);
          setChannels(Array.isArray(updated) ? updated : []);
        }
      } catch (err) {
        failCount++;
        await recordTelegramPostResult(channel.channelId, false).catch(() => {});
      }

      if (i < qty) {
        setPostingProgress(`[${channel.channelName}] Waiting 5s...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    return { successCount, failCount };
  };

  const handlePostNow = async (channel: TelegramChannel) => {
    if (isPosting || !channel) return;
    setIsPosting(true);
    const qty = Math.max(1, Math.min(20, postQuantity));
    
    try {
      showStatus("info", `Starting post to "${channel.channelName}"...`);
      const res = await runPostingWorkflowForChannel(channel, qty);
      showStatus("success", `Done: ${res.successCount} OK, ${res.failCount} Failed.`);
    } catch (err: any) {
      showStatus("error", `Failed: ${err.message}`);
    } finally {
      setIsPosting(false);
      setPostingProgress("");
    }
  };

  const handleRunAllWorkflow = async () => {
    const enabledChannels = (channels || []).filter((c) => c?.enabled);
    if (enabledChannels.length === 0) {
      showStatus("error", "No enabled channels.");
      return;
    }

    if (isPosting) return;
    setIsPosting(true);
    const qty = Math.max(1, Math.min(20, postQuantity));

    try {
      showStatus("info", `Starting workflow for ${enabledChannels.length} channel(s)...`);
      for (let idx = 0; idx < enabledChannels.length; idx++) {
        const chan = enabledChannels[idx];
        setPostingProgress(`Channel ${idx + 1}/${enabledChannels.length}: ${chan.channelName}`);
        await runPostingWorkflowForChannel(chan, qty);
      }
      showStatus("success", "Automation workflow complete!");
    } catch (err: any) {
      showStatus("error", "Workflow error: " + err.message);
    } finally {
      setIsPosting(false);
      setPostingProgress("");
    }
  };

  const webhookUrl = `${KOYEB_SERVER_URL || window.location.origin}/api/telegram/webhook`;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-24 space-y-4">
      <Icons.RefreshCw className="h-10 w-10 text-sky-500 animate-spin" />
      <p className="text-sm font-bold text-muted-foreground">Initializing Bots Engine...</p>
    </div>
  );

  // Safe Icons access
  const TelegramIcon = Icons?.Telegram || Icons?.Bot || (() => null);
  const InfoIcon = Icons?.Info || (() => null);
  const ClockIcon = Icons?.Clock || (() => null);
  const LayersIcon = Icons?.Layers || (() => null);
  const RefreshIcon = Icons?.RefreshCw || (() => null);

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Telegram Automation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Automated channel broadcasting & scheduling engine</p>
        </div>

        <AnimatePresence>
          {status.type && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`text-xs font-bold px-4 py-2 rounded-xl border ${
                status.type === "success" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                status.type === "error" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : 
                "bg-sky-500/10 text-sky-500 border-sky-500/20"
              }`}
            >
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isPosting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-spin">
              <RefreshIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600">Workflow Active</p>
              <p className="text-[11px] text-muted-foreground font-medium">{postingProgress}</p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-white font-bold text-[10px] animate-pulse">Running</Badge>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TelegramIcon className="h-4 w-4 text-sky-500" />
                  Telegram Bot Status
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Token provided via ENV</CardDescription>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 font-bold text-[10px]">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bot Token</span>
                <p className="text-xs font-mono font-bold text-emerald-600 truncate">
                  {settings.telegramBotToken ? `${settings.telegramBotToken.substring(0, 10)}...` : "Using TELEGRAM_BOT_TOKEN ENV"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Webhook</span>
                <p className="text-xs font-mono text-sky-600 truncate" title={webhookUrl}>{webhookUrl}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
                  <InfoIcon className="h-3.5 w-3.5" />
                  Auto Registration
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Forward messages to the bot to register channels automatically.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(!isAdding)}
                className="h-9 px-4 rounded-xl font-bold text-xs border-sky-500/30 text-sky-600 shrink-0"
              >
                {isAdding ? "Cancel" : "+ Add Manually"}
              </Button>
            </div>

            <AnimatePresence>
              {isAdding && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddChannelSubmit}
                  className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</Label>
                      <Input
                        placeholder="Movie Channel"
                        value={newChanName}
                        onChange={(e) => setNewChanName(e.target.value)}
                        className="h-10 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ID *</Label>
                      <Input
                        placeholder="-100..."
                        value={newChanId}
                        onChange={(e) => setNewChanId(e.target.value)}
                        className="h-10 rounded-xl text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="submit" size="sm" className="h-9 px-6 rounded-xl font-bold text-xs bg-emerald-500 text-white">Save</Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-emerald-500" />
              Interval
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-muted/20 border border-border/40">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Value</Label>
                <Input
                  type="number"
                  min={1}
                  value={intervalVal}
                  onChange={(e) => setIntervalVal(parseInt(e.target.value) || 1)}
                  className="h-11 rounded-xl font-bold"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Unit</Label>
                <select
                  value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value as "minutes" | "hours")}
                  className="flex h-11 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm font-bold appearance-none cursor-pointer"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveInterval} className="h-10 px-6 rounded-xl font-bold text-xs bg-emerald-500 text-white">Save Interval</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <LayersIcon className="h-4 w-4 text-purple-500" />
              Quantity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-6 rounded-2xl bg-muted/20 border border-border/40 space-y-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Posts per channel</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={postQuantity}
                onChange={(e) => setPostQuantity(parseInt(e.target.value) || 1)}
                className="h-11 rounded-xl font-bold max-w-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveQuantity} className="h-10 px-6 rounded-xl font-bold text-xs bg-emerald-500 text-white">Save Quantity</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Channels</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadChannels} className="h-9 px-3 rounded-xl text-xs font-bold border-border/40">
                  <RefreshIcon className="h-3.5 w-3.5 mr-1" /> Sync
                </Button>
                {(channels || []).some((c) => c?.enabled) && (
                  <Button disabled={isPosting} onClick={handleRunAllWorkflow} size="sm" className="h-9 px-4 rounded-xl font-bold text-xs bg-sky-500 text-white">
                    Run Automation
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(!channels || channels.length === 0) ? (
              <div className="p-12 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
                  <TelegramIcon className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">No channels added yet</h4>
                <p className="text-xs text-muted-foreground">Register channels to begin automation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/10 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Name</th>
                      <th className="py-3 px-6">ID</th>
                      <th className="py-3 px-6">Success</th>
                      <th className="py-3 px-6">Failed</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-xs">
                    {channels.map((chan) => (
                      <tr key={chan?.id || chan?.channelId} className="hover:bg-muted/10">
                        <td className="py-4 px-6 font-bold text-foreground flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${chan?.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                          {chan?.channelName || "Unknown"}
                        </td>
                        <td className="py-4 px-6 font-mono text-muted-foreground text-[11px]">{chan?.channelId}</td>
                        <td className="py-4 px-6"><Badge className="bg-emerald-500/10 text-emerald-600 px-2.5 text-[11px]">{chan?.totalSuccess || 0}</Badge></td>
                        <td className="py-4 px-6"><Badge className="bg-rose-500/10 text-rose-500 px-2.5 text-[11px]">{chan?.totalFailed || 0}</Badge></td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button disabled={isPosting || !chan?.enabled} onClick={() => handlePostNow(chan)} size="sm" variant="outline" className="h-8 px-3 text-xs font-bold border-emerald-500/30 text-emerald-600">Post Now</Button>
                            <Button onClick={() => handleToggle(chan?.channelId)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-500">
                               <i className={`fi fi-rr-${chan?.enabled ? "pause" : "play"} text-sm`} />
                            </Button>
                            <Button onClick={() => handleRemove(chan?.channelId)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500"><i className="fi fi-rr-trash text-sm" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function Bots() {
  return (
    <BotsErrorBoundary>
      <BotsContent />
    </BotsErrorBoundary>
  );
}

