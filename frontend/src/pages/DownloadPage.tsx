import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Icons } from "@/src/components/Icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { useTaskSettings } from "../hooks/useTaskSettings";
import { getVideoBySlug, extractSlugFromUrl, recordVisitor, checkLinkExpiration, getAvailableQualities, generateSignedR2Url } from "../lib/api";
import { Video } from "../types";

export function DownloadPage() {
  const { slug } = useParams<{ slug: string }>();
  const { settings, isLoading } = useTaskSettings();
  const [video, setVideo] = useState<Video | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [downloadingQuality, setDownloadingQuality] = useState<string | null>(null);

  // Security States
  const [isBlocked, setIsBlocked] = useState<"vpn" | "adblock" | "expired" | null>(null);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);

  // 1. Fetch Video from D1
  useEffect(() => {
    let isMounted = true;
    async function fetchVideo() {
      const cleanSlug = extractSlugFromUrl(slug);
      console.log(`[DownloadPage] Requested slug: "${cleanSlug}"`);
      if (cleanSlug) {
        recordVisitor(cleanSlug);
        const record = await getVideoBySlug(cleanSlug);
        if (isMounted) {
          if (record) {
            console.log(`[DownloadPage] Record found for slug "${cleanSlug}":`, record);
            setVideo(record);
          } else {
            console.log(`[DownloadPage] Record not found for slug "${cleanSlug}"`);
            setVideo(null);
          }
          setIsVideoLoaded(true);
        }
      } else {
        if (isMounted) {
          console.log(`[DownloadPage] Record not found (empty/invalid slug)`);
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
      console.log(`[DownloadPage] ${statusLog}`);
      if (isExpired) {
        setIsBlocked("expired");
        setIsCheckingSecurity(false);
        return;
      }
    } else {
      console.log(`[DownloadPage] Expiration check skipped (Record not found in D1)`);
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
      setIsTaskCompleted(true);
      setActiveTaskId(null);
    }
    return () => clearInterval(interval);
  }, [activeTaskId, timer]);

  const handleTaskClick = () => {
    if (isTaskCompleted || !settings.downloadTaskUrl) return;
    window.open(settings.downloadTaskUrl, "_blank");
    setActiveTaskId("download-task");
    setTimer(10);
  };

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

  const displayVideo = video;
  const availableQualities = getAvailableQualities(displayVideo);

  const handleDownloadQuality = async (targetUrl: string, quality: string) => {
    if (!displayVideo) return;
    setDownloadingQuality(quality);
    try {
      const expirationMinutes = settings.linkExpirationMinutes || 10;
      const signedUrl = await generateSignedR2Url(
        targetUrl,
        displayVideo.title,
        quality,
        expirationMinutes
      );
      console.log(`[DownloadPage] Generating signed download link for quality "${quality}" with expiration ${expirationMinutes}m: ${signedUrl}`);

      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = `${displayVideo.title}_${quality}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to generate signed download link:", err);
    } finally {
      setDownloadingQuality(null);
    }
  };

  return (
    <div className="flex flex-col gap-10 w-full max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center space-y-4">
         <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="inline-flex p-4 rounded-3xl bg-emerald-500/10 text-emerald-500 mb-2 border border-emerald-500/20"
         >
           <Icons.ShieldCheck className="h-10 w-10" />
         </motion.div>
         <div className="space-y-2">
           <h1 className="text-3xl font-black tracking-tight text-foreground/90">Content Prepared</h1>
           <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
             Your high-speed download link has been successfully generated and is ready for use.
           </p>
         </div>
      </div>

      <Card className="border border-border/40 bg-card shadow-2xl shadow-black/5 overflow-hidden rounded-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
           <div className="aspect-video md:aspect-auto relative bg-slate-900">
              <img src={displayVideo.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                 <Badge className="bg-emerald-500 text-white border-none font-black text-[10px] uppercase tracking-widest px-2.5 py-1 mb-3">System Verified</Badge>
                 <h2 className="text-xl font-black text-white leading-tight">{displayVideo.title}</h2>
              </div>
           </div>
           <div className="p-8 md:p-10 flex flex-col justify-between gap-8 bg-card">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                 {[
                   { label: "File Size", value: displayVideo.fileSize, icon: Icons.FileText },
                   { label: "Format", value: "MP4 Video", icon: Icons.Folder },
                   { label: "Quality", value: "1080P HD", icon: Icons.Zap },
                   { label: "Expires In", value: `${settings.linkExpirationMinutes} Minutes`, icon: Icons.Clock },
                 ].map((item, idx) => (
                   <div key={idx} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-muted-foreground/60">
                         <item.icon className="h-3.5 w-3.5" />
                         <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                      </div>
                      <p className="font-black text-sm text-foreground/80">{item.value}</p>
                   </div>
                 ))}
              </div>

              <div className="space-y-6">
                 {/* Download Task Card */}
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Required Action</span>
                       {isTaskCompleted && (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-black h-5">Verified</Badge>
                       )}
                    </div>
                    <button
                      disabled={!settings.downloadTaskUrl || isTaskCompleted || !!activeTaskId}
                      onClick={handleTaskClick}
                      className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all duration-300 text-left ${
                        isTaskCompleted 
                        ? "bg-emerald-500/5 border-emerald-500/20 opacity-60" 
                        : !!activeTaskId 
                        ? "border-emerald-500 ring-4 ring-emerald-500/5 bg-card"
                        : settings.downloadTaskUrl
                        ? "border-border/60 bg-muted/20 hover:border-emerald-500/40 hover:bg-muted/30"
                        : "border-rose-500/20 bg-rose-500/5 cursor-not-allowed"
                      }`}
                    >
                       <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white transition-all duration-300 ${
                            isTaskCompleted 
                            ? "bg-emerald-500" 
                            : settings.downloadTaskUrl 
                            ? `bg-purple-600 ${activeTaskId ? "animate-pulse" : ""}` 
                            : "bg-slate-700"
                          }`}>
                             {isTaskCompleted ? (
                               <div className="relative flex items-center justify-center">
                                 <Icons.Download className="h-5 w-5 text-white" />
                                 <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                                   <Icons.Check className="h-2 w-2 stroke-[3px]" />
                                 </div>
                               </div>
                             ) : (
                               <Icons.Download className="h-5 w-5 text-white" />
                             )}
                          </div>
                          <div className="space-y-0.5">
                             <h4 className="text-xs font-black uppercase tracking-tight text-foreground/90">Download Task</h4>
                             <p className="text-[10px] text-muted-foreground font-medium">
                               {isTaskCompleted ? "Verification successful" : !!activeTaskId ? `Wait ${timer}s to verify` : settings.downloadTaskUrl ? "Final verification step" : "Task not configured"}
                             </p>
                          </div>
                       </div>
                       {!!activeTaskId ? (
                          <Badge variant="outline" className="h-6 bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-black">{timer}s</Badge>
                       ) : !isTaskCompleted && settings.downloadTaskUrl && (
                          <Icons.ChevronRight className="h-4 w-4 text-muted-foreground" />
                       )}
                    </button>
                    {!settings.downloadTaskUrl && (
                       <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest px-2.5">Download link configuration missing.</p>
                    )}
                 </div>

                 <div className="pt-2">
                    <AnimatePresence mode="wait">
                       {isTaskCompleted ? (
                          <motion.div
                             key="unlocked-qualities"
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -10 }}
                             className="space-y-3"
                          >
                             <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                                   <Icons.CheckCircle2 className="h-3.5 w-3.5" />
                                   Select Download Quality ({availableQualities.length})
                                </span>
                             </div>
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 w-full">
                                {availableQualities.map((item) => (
                                   <Button
                                      key={item.quality}
                                      disabled={downloadingQuality === item.quality}
                                      onClick={() => handleDownloadQuality(item.url, item.quality)}
                                      className="w-full h-14 rounded-2xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 text-white border-none cursor-pointer transition-all active:scale-95 flex items-center justify-center text-center px-2 min-w-0 overflow-hidden"
                                   >
                                      {downloadingQuality === item.quality ? (
                                         <div className="flex items-center justify-center gap-1.5 min-w-0 w-full text-center">
                                            <Icons.Loader2 className="h-4 w-4 animate-spin shrink-0 text-white" />
                                            <span className="truncate text-center font-black">
                                               {item.quality.toUpperCase()}...
                                            </span>
                                         </div>
                                      ) : (
                                         <div className="flex items-center justify-center gap-1.5 min-w-0 w-full text-center">
                                            <Icons.Download className="h-4 w-4 shrink-0 text-white" />
                                            <span className="truncate text-center font-black">
                                               DOWNLOAD {item.quality.toUpperCase()}
                                            </span>
                                         </div>
                                      )}
                                   </Button>
                                ))}
                             </div>
                          </motion.div>
                       ) : (
                          <motion.div
                             key="locked-button"
                             initial={{ opacity: 0, y: -10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: 10 }}
                          >
                             <Button
                                disabled={true}
                                className="w-full h-16 rounded-2xl text-lg font-black gap-3 bg-muted text-muted-foreground/40 border border-border/50 cursor-not-allowed"
                             >
                                <Icons.Lock className="h-5 w-5 opacity-30" />
                                Download Locked
                             </Button>
                          </motion.div>
                       )}
                    </AnimatePresence>
                    <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60 uppercase font-black tracking-widest">
                      <Icons.ShieldCheck className="h-3 w-3 text-emerald-500" />
                      Encrypted & Secure Download
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </Card>

      {/* Ad Placeholder */}
      <div className="w-full aspect-[4/1] min-h-[160px] border-2 border-dashed border-border/40 rounded-3xl flex flex-col items-center justify-center bg-muted/20 gap-4 transition-colors hover:bg-muted/30 group">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground/40 group-hover:scale-110 transition-transform">
           <Icons.LayoutDashboard className="h-5 w-5" />
        </div>
        <div className="text-center">
           <span className="block text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Premium Sponsor Area</span>
           <span className="text-[10px] font-bold text-muted-foreground/20">Leaderboard Banner • 728 × 90</span>
        </div>
      </div>

      {/* Telegram Card */}
      <Card className={`bg-sky-500/5 border border-sky-500/10 rounded-2xl p-2 transition-all ${!settings.telegramChannelUrl ? "opacity-60 grayscale" : ""}`}>
        <div className="p-4 flex items-center justify-between gap-6">
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
        </div>
      </Card>
    </div>
  );
}
