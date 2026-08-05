import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Icons } from "@/src/components/Icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { useTaskSettings } from "../hooks/useTaskSettings";
import { getVideoBySlug, recordVisitor } from "../lib/api";
import { Video } from "../types";

export function DownloadPage() {
  const { slug } = useParams<{ slug: string }>();
  const { settings, isLoading } = useTaskSettings();
  const [video, setVideo] = useState<Video | null>(null);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (slug) {
      recordVisitor(slug);
      const found = getVideoBySlug(slug);
      if (found) {
        setVideo(found);
      } else {
        fetch(`/api/videos?slug=${encodeURIComponent(slug)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && data.slug) setVideo(data);
          })
          .catch(() => {});
      }
    }
  }, [slug]);

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

  if (isLoading) return null;

  const displayVideo = video || {
    id: "default",
    slug: slug || "sjhu4ld7_ndlksk_h",
    title: `Video Content`,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60",
    thumbnails: [],
    fileSize: "145.2 MB",
    duration: "02:45",
    views: 124,
    likes: 12,
    dislikes: 0,
    uploadedAt: new Date().toISOString(),
    releaseYear: 2024,
    genres: ["Video", "MP4"],
    quality: "1080p",
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
                   { label: "Expires In", value: "24 Hours", icon: Icons.Clock },
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
                                 <Icons.File className="h-5 w-5 text-white" />
                                 <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                                   <Icons.Check className="h-2 w-2 stroke-[3px]" />
                                 </div>
                               </div>
                             ) : (
                               <Icons.File className="h-5 w-5 text-white" />
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
                       <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest px-2">Download link configuration missing.</p>
                    )}
                 </div>

                 <div className="pt-2">
                    <Button 
                      disabled={!isTaskCompleted}
                      onClick={() => window.open(displayVideo.videoUrl, "_blank")}
                      className={`w-full h-16 rounded-2xl text-lg font-black gap-3 transition-all duration-500 relative overflow-hidden ${
                        isTaskCompleted 
                        ? "bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 text-white border-none cursor-pointer" 
                        : "bg-muted text-muted-foreground/40 border border-border/50"
                      }`}
                    >
                       <AnimatePresence mode="wait">
                          {isTaskCompleted ? (
                             <motion.div 
                               key="unlocked"
                               initial={{ y: 10, opacity: 0 }}
                               animate={{ y: 0, opacity: 1 }}
                               className="flex items-center gap-3"
                             >
                               <Icons.Download className="h-6 w-6" />
                               Start Download Now
                             </motion.div>
                          ) : (
                             <motion.div 
                               key="locked"
                               initial={{ y: -10, opacity: 0 }}
                               animate={{ y: 0, opacity: 1 }}
                               className="flex items-center gap-3"
                             >
                               <Icons.Lock className="h-5 w-5 opacity-30" />
                               Download Locked
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </Button>
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
    </div>
  );
}
