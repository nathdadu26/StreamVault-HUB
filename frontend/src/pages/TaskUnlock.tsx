import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icons } from "@/src/components/Icons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MOCK_TASKS } from "../data/mock";
import { motion, AnimatePresence } from "motion/react";
import { useTaskSettings } from "../hooks/useTaskSettings";
import { getVideoBySlug, extractSlugFromUrl, recordVisitor, checkLinkExpiration } from "../lib/api";
import { Video } from "../types";

export function TaskUnlock() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { settings, isLoading } = useTaskSettings();
  const [video, setVideo] = useState<Video | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  
  // Security States
  const [isBlocked, setIsBlocked] = useState<"vpn" | "adblock" | "expired" | null>(null);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);

  // 1. Fetch Video from D1
  useEffect(() => {
    let isMounted = true;
    async function fetchVideo() {
      const cleanSlug = extractSlugFromUrl(slug);
      console.log(`[TaskUnlock] Requested slug: "${cleanSlug}"`);
      if (cleanSlug) {
        recordVisitor(cleanSlug);
        const record = await getVideoBySlug(cleanSlug);
        if (isMounted) {
          if (record) {
            console.log(`[TaskUnlock] Record found for slug "${cleanSlug}":`, record);
            setVideo(record);
          } else {
            console.log(`[TaskUnlock] Record not found for slug "${cleanSlug}"`);
            setVideo(null);
          }
          setIsVideoLoaded(true);
        }
      } else {
        if (isMounted) {
          console.log(`[TaskUnlock] Record not found (empty/invalid slug)`);
          setVideo(null);
          setIsVideoLoaded(true);
        }
      }
    }
    fetchVideo();
    return () => { isMounted = false; };
  }, [slug]);

  // 2. Security & Expiration Check (Link Expired ONLY after successful D1 lookup)
  const checkSecurity = useCallback(async (currentVideo: Video | null) => {
    if (isLoading) return;
    setIsCheckingSecurity(true);

    if (currentVideo) {
      const { isExpired, statusLog } = checkLinkExpiration(currentVideo, settings.linkExpirationMinutes);
      console.log(`[TaskUnlock] ${statusLog}`);
      if (isExpired) {
        setIsBlocked("expired");
        setIsCheckingSecurity(false);
        return;
      }
    } else {
      console.log(`[TaskUnlock] Expiration check skipped (Record not found in D1)`);
    }

    // Check VPN/Proxy (if enabled)
    if (settings.vpnDetectionEnabled) {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json() as any;
        if (data.proxy || data.hosting || data.org?.toLowerCase().includes("vpn")) {
          setIsBlocked("vpn");
          setIsCheckingSecurity(false);
          return;
        }
      } catch (e) {
        console.error("VPN Check failed", e);
      }
    }

    // Check AdBlock (if enabled)
    if (settings.adBlockDetectionEnabled) {
      const adBlockEnabled = await new Promise<boolean>((resolve) => {
        const testAd = document.createElement("div");
        testAd.innerHTML = "&nbsp;";
        testAd.className = "adsbox";
        testAd.style.position = "absolute";
        testAd.style.top = "-1000px";
        document.body.appendChild(testAd);
        window.setTimeout(() => {
          if (testAd.offsetHeight === 0) {
            resolve(true);
          } else {
            resolve(false);
          }
          document.body.removeChild(testAd);
        }, 100);
      });

      if (adBlockEnabled) {
        setIsBlocked("adblock");
        setIsCheckingSecurity(false);
        return;
      }
    }

    setIsCheckingSecurity(false);
  }, [isLoading, settings]);

  useEffect(() => {
    if (!isLoading && isVideoLoaded) {
      checkSecurity(video);
    }
  }, [isLoading, isVideoLoaded, video, checkSecurity]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTaskId && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (activeTaskId && timer === 0) {
      setCompletedTasks((prev) => [...new Set([...prev, activeTaskId])]);
      setActiveTaskId(null);
    }
    return () => clearInterval(interval);
  }, [activeTaskId, timer]);

  const handleTaskClick = (taskId: string, url: string | undefined, waitTime: number) => {
    if (completedTasks.includes(taskId) || !url) return;
    window.open(url, "_blank");
    setActiveTaskId(taskId);
    setTimer(waitTime);
  };

  const isAllCompleted = completedTasks.length === MOCK_TASKS.length;

  if (isLoading || isCheckingSecurity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verifying Security...</p>
      </div>
    );
  }

  if (isBlocked) {
    const messages = {
      vpn: {
        title: "VPN / Proxy Detected",
        desc: "Please disable your VPN or Proxy server to access this content. We only allow direct connections for security reasons.",
        icon: Icons.ShieldAlert,
        color: "text-rose-500 bg-rose-500/10 border-rose-500/20"
      },
      adblock: {
        title: "AdBlocker Detected",
        desc: "We detected an active AdBlocker. Please disable it and refresh the page to support the platform and continue.",
        icon: Icons.AlertCircle,
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20"
      },
      expired: {
        title: "Link Expired",
        desc: "This verification link has expired. Please go back to the source and generate a new link.",
        icon: Icons.Clock,
        color: "text-slate-500 bg-slate-500/10 border-slate-500/20"
      }
    };

    const config = messages[isBlocked];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] max-w-md mx-auto text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className={`p-6 rounded-3xl border shadow-xl ${config.color}`}>
          <config.icon className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">{config.title}</h2>
          <p className="text-sm font-medium opacity-80 leading-relaxed">{config.desc}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="h-12 px-8 rounded-xl font-bold text-xs gap-2"
        >
          <Icons.RefreshCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (isVideoLoaded && !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] max-w-md mx-auto text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="p-6 rounded-3xl border shadow-xl text-rose-500 bg-rose-500/10 border-rose-500/20 w-full">
          <Icons.FileX className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">Video Not Found</h2>
          <p className="text-sm font-medium opacity-80 leading-relaxed">
            The requested video slug does not exist or has been removed from the database.
          </p>
        </div>
      </div>
    );
  }

  const currentSlug = video.slug;

  return (
    <div className="flex flex-col gap-10 w-full max-w-2xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex p-4 rounded-3xl bg-emerald-500/10 text-emerald-500 mb-2 border border-emerald-500/20 shadow-xl shadow-emerald-500/10"
        >
          <Icons.ShieldCheck className="h-10 w-10" />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground/90">Unlock Content</h1>
          <p className="text-sm text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">
            Please complete the following security verifications to gain access to the requested video content.
          </p>
        </div>
      </div>

      {/* Instructions Grid */}
      <div className="grid grid-cols-1 gap-4">
        {[
          { num: 1, icon: Icons.ListCheck, title: "Interact", desc: "Click a task and wait for the verification timer." },
          { num: 2, icon: Icons.Clock, title: "Verify", desc: "Stay on the destination page until the countdown ends." },
          { num: 3, icon: Icons.LockOpen, title: "Unlock", desc: "Once all tasks are green, access will be granted." },
        ].map((step, idx) => (
          <div key={idx} className="flex items-center gap-6 p-4 rounded-2xl bg-card border border-border/50 shadow-sm transition-all hover:border-emerald-500/30">
            <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center font-black text-foreground/40 text-lg border border-border/60">
              0{step.num}
            </div>
            <div className="flex-1 space-y-1">
               <h4 className="font-black text-sm uppercase tracking-widest text-foreground/80">{step.title}</h4>
               <p className="text-xs text-muted-foreground/70">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <Separator className="flex-1" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">Task Requirements</span>
        <Separator className="flex-1" />
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {MOCK_TASKS.map((task, i) => {
          const taskUrl = i === 0 ? settings.task1Url : settings.task2Url;
          const isConfigured = !!taskUrl;
          const isCompleted = completedTasks.includes(task.id);
          const isActive = isConfigured && (activeTaskId === null || activeTaskId === task.id);

          return (
            <div key={task.id} className="space-y-2">
              <button
                disabled={!isConfigured || (activeTaskId !== null && activeTaskId !== task.id)}
                onClick={() => handleTaskClick(task.id, taskUrl, task.waitTimeSeconds)}
                className={`w-full group relative flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-500 text-left ${
                  isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/20 cursor-default"
                    : activeTaskId === task.id
                    ? "bg-card border-emerald-500 ring-4 ring-emerald-500/10"
                    : isConfigured
                    ? "bg-card border-border/60 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 cursor-pointer"
                    : "bg-muted/10 border-border/40 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white transition-all duration-500 ${
                    isCompleted 
                    ? "bg-emerald-500 shadow-lg shadow-emerald-500/20 scale-90" 
                    : isActive
                    ? `bg-purple-600 shadow-lg shadow-purple-600/20 ${activeTaskId === task.id ? "animate-pulse" : ""}`
                    : "bg-slate-700"
                  }`}>
                    {isCompleted ? (
                      <div className="relative flex items-center justify-center">
                        <Icons.ListCheck className="h-6 w-6 text-white" />
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                          <Icons.Check className="h-2.5 w-2.5 stroke-[3px]" />
                        </div>
                      </div>
                    ) : (
                      <Icons.ListCheck className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-sm uppercase tracking-tight text-foreground/90">{task.title}</h3>
                    <p className="text-xs text-muted-foreground/70 font-medium">
                      Interaction required: <span className="text-foreground/90 font-black">{task.waitTimeSeconds}s</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activeTaskId === task.id && (
                     <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest animate-pulse">Verifying</span>
                        <Badge variant="outline" className="h-6 bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-black">{timer}s</Badge>
                     </div>
                  )}
                  {completedTasks.includes(task.id) && (
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Icons.Check className="h-4 w-4 text-emerald-500 stroke-[3px]" />
                    </div>
                  )}
                  {!activeTaskId && !completedTasks.includes(task.id) && isConfigured && (
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all border border-border/40">
                      <Icons.ChevronRight className="h-5 w-5" />
                    </div>
                  )}
                  {!isConfigured && (
                    <Icons.Lock className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
              </button>
              {!isConfigured && (
                <p className="text-[10px] font-bold text-rose-500/60 uppercase tracking-widest pl-4">
                  Task link is not configured.
                </p>
              )}
            </div>
          );
        })}

        {/* Watch Video Button */}
        <div className="pt-4">
          <Button
            size="lg"
            variant={isAllCompleted ? "default" : "secondary"}
            disabled={!isAllCompleted}
            onClick={() => navigate(`/s/${currentSlug}`)}
            className={`w-full h-18 rounded-2xl text-lg font-black gap-4 transition-all duration-700 relative overflow-hidden ${
              isAllCompleted 
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30 scale-[1.02] border-none" 
              : "bg-muted/50 text-muted-foreground/40 border border-border/50"
            }`}
          >
            <AnimatePresence mode="wait">
               {isAllCompleted ? (
                 <motion.div 
                   key="unlocked"
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   className="flex items-center gap-3"
                 >
                   <Icons.Play className="h-6 w-6 fill-current" />
                   Access Video Content
                 </motion.div>
               ) : (
                 <motion.div 
                   key="locked"
                   initial={{ y: -20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   className="flex items-center gap-3"
                 >
                   <Icons.Lock className="h-5 w-5 opacity-40" />
                   Verification Incomplete
                 </motion.div>
               )}
            </AnimatePresence>
          </Button>
        </div>

        {/* Telegram Card */}
        <Card className={`bg-sky-500/5 border border-sky-500/10 rounded-2xl p-2 mt-8 transition-all ${!settings.telegramChannelUrl ? "opacity-60 grayscale" : ""}`}>
          <CardContent className="p-4 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                <Icons.Bot className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-xs text-sky-600 uppercase tracking-widest">Join Telegram</h4>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {settings.telegramChannelUrl ? "Instant alerts for premium releases" : "Telegram link is not configured."}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              disabled={!settings.telegramChannelUrl}
              onClick={() => settings.telegramChannelUrl && window.open(settings.telegramChannelUrl, "_blank")}
              className="h-10 rounded-xl px-5 border-sky-500/20 text-sky-600 font-bold text-xs hover:bg-sky-500/10"
            >
              Join Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
