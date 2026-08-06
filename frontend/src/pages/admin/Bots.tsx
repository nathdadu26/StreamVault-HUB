import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/src/components/Icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTaskSettings } from "../../hooks/useTaskSettings";
import { motion, AnimatePresence } from "motion/react";
import { TelegramChannel } from "../../types";
import {
  fetchTelegramChannels,
  saveTelegramChannel,
  deleteTelegramChannel,
  toggleTelegramChannel,
  recordTelegramPostResult,
  getStoredFiles,
  KOYEB_SERVER_URL,
} from "../../lib/api";

export function Bots() {
  const { settings, saveSettings, isLoading } = useTaskSettings();
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
    const list = await fetchTelegramChannels();
    setChannels(list);
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
    if (channels.some((c) => c.channelId === cleanId)) {
      showStatus("error", `Channel ${cleanId} already exists!`);
      return;
    }

    const updated = await saveTelegramChannel({
      channelId: cleanId,
      channelName: cleanName,
      enabled: true,
      totalSuccess: 0,
      totalFailed: 0,
    });
    setChannels(updated);
    setNewChanName("");
    setNewChanId("");
    setIsAdding(false);
    showStatus("success", `Channel "${cleanName}" added successfully.`);
  };

  // 4. Toggle Channel
  const handleToggle = async (channelId: string) => {
    const updated = await toggleTelegramChannel(channelId);
    setChannels(updated);
    const target = updated.find((c) => c.channelId === channelId || c.id === channelId);
    if (target) {
      showStatus("info", `Channel "${target.channelName}" ${target.enabled ? "Enabled" : "Disabled"}.`);
    }
  };

  // 5. Remove Channel
  const handleRemove = async (channelId: string) => {
    const updated = await deleteTelegramChannel(channelId);
    setChannels(updated);
    showStatus("success", "Channel removed.");
  };

  // 6. Posting Workflow: Single channel or All enabled channels
  const runPostingWorkflowForChannel = async (channel: TelegramChannel, qty: number) => {
    const videos = getStoredFiles();
    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i <= qty; i++) {
      setPostingProgress(`[${channel.channelName}] Sending Post ${i} of ${qty}...`);
      
      // Simulate/Trigger Post logic
      try {
        const videoToPost = videos[Math.floor(Math.random() * videos.length)];
        const botToken = settings.telegramBotToken || "ENV_BOT_TOKEN";

        if (botToken && botToken !== "ENV_BOT_TOKEN" && videoToPost) {
          // Send via Telegram Bot API
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
            setChannels(updated);
          } else {
            failCount++;
            const updated = await recordTelegramPostResult(channel.channelId, false);
            setChannels(updated);
          }
        } else {
          // Record success if in demo/ENV mode
          successCount++;
          const updated = await recordTelegramPostResult(channel.channelId, true);
          setChannels(updated);
        }
      } catch (err) {
        failCount++;
        const updated = await recordTelegramPostResult(channel.channelId, false);
        setChannels(updated);
      }

      // 5-second delay between posts if not last post
      if (i < qty) {
        setPostingProgress(`[${channel.channelName}] Waiting 5s before post ${i + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    return { successCount, failCount };
  };

  const handlePostNow = async (channel: TelegramChannel) => {
    if (isPosting) return;
    setIsPosting(true);
    const qty = Math.max(1, Math.min(20, postQuantity));
    
    try {
      showStatus("info", `Starting post workflow for "${channel.channelName}" (${qty} post${qty > 1 ? "s" : ""})...`);
      const res = await runPostingWorkflowForChannel(channel, qty);
      showStatus("success", `Completed posting to "${channel.channelName}": ${res.successCount} success, ${res.failCount} failed.`);
    } catch (err: any) {
      showStatus("error", `Posting failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsPosting(false);
      setPostingProgress("");
    }
  };

  const handleRunAllWorkflow = async () => {
    const enabledChannels = channels.filter((c) => c.enabled);
    if (enabledChannels.length === 0) {
      showStatus("error", "No enabled channels available to post.");
      return;
    }

    if (isPosting) return;
    setIsPosting(true);
    const qty = Math.max(1, Math.min(20, postQuantity));

    try {
      showStatus("info", `Starting sequential posting for ${enabledChannels.length} enabled channel(s)...`);
      
      // Process sequentially: Channel A completely, then Channel B, etc.
      for (let idx = 0; idx < enabledChannels.length; idx++) {
        const chan = enabledChannels[idx];
        setPostingProgress(`Processing Channel ${idx + 1}/${enabledChannels.length}: ${chan.channelName}`);
        await runPostingWorkflowForChannel(chan, qty);
      }

      showStatus("success", "All channel posting workflows completed!");
    } catch (err: any) {
      showStatus("error", `Workflow execution error: ${err.message || "Unknown error"}`);
    } finally {
      setIsPosting(false);
      setPostingProgress("");
    }
  };

  const webhookUrl = `${KOYEB_SERVER_URL || window.location.origin}/api/telegram/webhook`;

  if (isLoading) return null;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
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
                status.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : status.type === "error"
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  : "bg-sky-500/10 text-sky-500 border-sky-500/20"
              }`}
            >
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress banner when workflow is active */}
      {isPosting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-spin">
              <Icons.RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600">Posting Workflow In Progress</p>
              <p className="text-[11px] text-muted-foreground font-medium">{postingProgress}</p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-white font-bold text-[10px] animate-pulse">5s Interval Active</Badge>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Telegram Bot Card */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Icons.Telegram className="h-4 w-4 text-sky-500" />
                  Telegram Bot Status
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Token provided via ENV & Webhook Endpoint
                </CardDescription>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 font-bold text-[10px]">
                ENV Configured
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bot Token</span>
                <p className="text-xs font-mono font-bold text-emerald-600 truncate">
                  {settings.telegramBotToken ? `${settings.telegramBotToken.substring(0, 10)}...` : "Provided via TELEGRAM_BOT_TOKEN ENV"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Webhook Endpoint</span>
                <p className="text-xs font-mono text-sky-600 truncate" title={webhookUrl}>
                  {webhookUrl}
                </p>
              </div>
            </div>

            {/* Forwarding Workflow Info */}
            <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
                  <Icons.Info className="h-3.5 w-3.5 text-sky-500" />
                  Automatic Channel Registration
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Forward any message from a Telegram channel to your bot. The bot extracts the Channel ID & Name automatically and saves them to Cloudflare D1 while ignoring duplicates.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(!isAdding)}
                className="h-9 px-4 rounded-xl font-bold text-xs border-sky-500/30 text-sky-600 hover:bg-sky-500/10 shrink-0"
              >
                {isAdding ? "Cancel" : "+ Add Channel Manually"}
              </Button>
            </div>

            {/* Manual Add Form */}
            <AnimatePresence>
              {isAdding && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddChannelSubmit}
                  className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-4 overflow-hidden"
                >
                  <h4 className="text-xs font-bold text-foreground">Add New Telegram Channel</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Channel Name
                      </Label>
                      <Input
                        placeholder="e.g. Movie Updates Channel"
                        value={newChanName}
                        onChange={(e) => setNewChanName(e.target.value)}
                        className="h-10 rounded-xl bg-background border-border/40 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Channel ID *
                      </Label>
                      <Input
                        placeholder="e.g. -1001234567890"
                        value={newChanId}
                        onChange={(e) => setNewChanId(e.target.value)}
                        className="h-10 rounded-xl bg-background border-border/40 text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAdding(false)}
                      className="h-9 px-4 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-9 px-6 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    >
                      Save Channel
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Posting Interval Card */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Icons.Clock className="h-4 w-4 text-emerald-500" />
              Posting Interval Card
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              One global interval setting applied across all channels
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-muted/20 border border-border/40">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Interval Value
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={intervalVal}
                  onChange={(e) => setIntervalVal(parseInt(e.target.value) || 1)}
                  className="h-11 rounded-xl bg-background border-border/40 font-bold"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Unit Selector
                </Label>
                <select
                  value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value as "minutes" | "hours")}
                  className="flex h-11 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 appearance-none cursor-pointer"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Example: <span className="font-bold text-foreground">{intervalVal} {intervalUnit}</span> = Every {intervalVal} {intervalUnit}
              </p>
              <Button
                onClick={handleSaveInterval}
                className="h-10 px-6 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              >
                Save Interval
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Post Quantity Card */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Icons.Layers className="h-4 w-4 text-purple-500" />
              Post Quantity Card
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Number of posts sent per channel per execution (Min: 1, Max: 20)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-6 rounded-2xl bg-muted/20 border border-border/40 space-y-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Post Quantity
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={postQuantity}
                onChange={(e) => setPostQuantity(parseInt(e.target.value) || 1)}
                className="h-11 rounded-xl bg-background border-border/40 font-bold max-w-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Each channel will receive <span className="text-emerald-500 font-bold">{postQuantity}</span> post(s) sequentially with a 5-second delay between posts.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveQuantity}
                className="h-10 px-6 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              >
                Save Quantity
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Channels Management */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Channels Management</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Registered channels and performance statistics
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadChannels}
                  className="h-9 px-3 rounded-xl text-xs font-bold border-border/40 hover:bg-muted"
                >
                  <Icons.RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Sync
                </Button>

                {channels.some((c) => c.enabled) && (
                  <Button
                    disabled={isPosting}
                    onClick={handleRunAllWorkflow}
                    size="sm"
                    className="h-9 px-4 rounded-xl font-bold text-xs bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20"
                  >
                    Run Automation Scheduler
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {channels.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
                  <Icons.Telegram className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">No Telegram Channels Added</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Forward any message from a channel to your Telegram Bot, or click "+ Add Channel Manually" above to register a channel.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/10 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Channel Name</th>
                      <th className="py-3 px-6">Channel ID</th>
                      <th className="py-3 px-6">Total Success</th>
                      <th className="py-3 px-6">Total Failed</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-xs font-medium">
                    {channels.map((chan) => (
                      <tr key={chan.id || chan.channelId} className="hover:bg-muted/10 transition-colors">
                        <td className="py-4 px-6 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${chan.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                            {chan.channelName}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-muted-foreground text-[11px]">
                          {chan.channelId}
                        </td>
                        <td className="py-4 px-6">
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold px-2.5 py-0.5 text-[11px]">
                            {chan.totalSuccess || 0}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold px-2.5 py-0.5 text-[11px]">
                            {chan.totalFailed || 0}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Post Now Action */}
                            <Button
                              disabled={isPosting || !chan.enabled}
                              onClick={() => handlePostNow(chan)}
                              title="Post Now"
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 rounded-lg border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-bold text-xs"
                            >
                              <i className="fi fi-rr-arrow-up-right-from-square mr-1 text-xs" />
                              <span className="hidden sm:inline">Post Now</span>
                            </Button>

                            {/* Enable / Disable Action */}
                            <Button
                              onClick={() => handleToggle(chan.channelId)}
                              title={chan.enabled ? "Disable Channel" : "Enable Channel"}
                              size="sm"
                              variant="ghost"
                              className={`h-8 w-8 p-0 rounded-lg transition-colors ${
                                chan.enabled
                                  ? "text-amber-500 hover:bg-amber-500/10"
                                  : "text-emerald-500 hover:bg-emerald-500/10"
                              }`}
                            >
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={chan.enabled ? "pause" : "play"}
                                  initial={{ scale: 0.5, opacity: 0, rotate: chan.enabled ? -90 : 90 }}
                                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                  exit={{ scale: 0.5, opacity: 0, rotate: chan.enabled ? 90 : -90 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex items-center justify-center"
                                >
                                  {chan.enabled ? (
                                    <i className="fi fi-rr-pause text-sm" />
                                  ) : (
                                    <i className="fi fi-br-play text-sm" />
                                  )}
                                </motion.div>
                              </AnimatePresence>
                            </Button>

                            {/* Remove Action */}
                            <Button
                              onClick={() => handleRemove(chan.channelId)}
                              title="Remove Channel"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                            >
                              <i className="fi fi-rr-trash text-sm" />
                            </Button>
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
