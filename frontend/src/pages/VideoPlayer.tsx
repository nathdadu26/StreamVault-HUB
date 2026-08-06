import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Icons } from "@/src/components/Icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "motion/react";
import { getVideoBySlug, extractSlugFromUrl, recordVisitor, checkLinkExpiration } from "../lib/api";
import { useTaskSettings } from "../hooks/useTaskSettings";
import { Video } from "../types";
import { PlyrPlayer } from "../components/PlyrPlayer";

export function VideoPlayer() {
  const { slug } = useParams<{ slug: string }>();
  const { settings, isLoading: isLoadingSettings } = useTaskSettings();
  const [video, setVideo] = useState<Video | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleCopyLink = () => {
    if (!video) return;
    const linkToCopy = `${window.location.origin}/ad/${video.slug}`;
    navigator.clipboard.writeText(linkToCopy).then(() => {
      setIsCopied(true);
      setShowToast(true);
      setTimeout(() => setIsCopied(false), 2000);
      setTimeout(() => setShowToast(false), 3000);
    }).catch((err) => {
      console.error("Failed to copy link:", err);
    });
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchVideo() {
      const cleanSlug = extractSlugFromUrl(slug);
      console.log(`[VideoPlayer] Requested slug: "${cleanSlug}"`);
      if (cleanSlug) {
        recordVisitor(cleanSlug);
        const record = await getVideoBySlug(cleanSlug);
        if (isMounted) {
          if (record) {
            console.log(`[VideoPlayer] Record found for slug "${cleanSlug}":`, record);
            setVideo(record);
            const expResult = checkLinkExpiration(record, settings.linkExpirationMinutes);
            console.log(`[VideoPlayer] ${expResult.statusLog}`);
            setIsExpired(expResult.isExpired);
          } else {
            console.log(`[VideoPlayer] Record not found for slug "${cleanSlug}"`);
            setVideo(null);
          }
          setIsVideoLoaded(true);
        }
      } else {
        if (isMounted) {
          console.log(`[VideoPlayer] Record not found (empty/invalid slug)`);
          setVideo(null);
          setIsVideoLoaded(true);
        }
      }
    }
    if (!isLoadingSettings) {
      fetchVideo();
    }
    return () => { isMounted = false; };
  }, [slug, isLoadingSettings, settings.linkExpirationMinutes]);

  if (isLoadingSettings || !isVideoLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Video...</p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] max-w-md mx-auto text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="p-6 rounded-3xl border shadow-xl text-slate-500 bg-slate-500/10 border-slate-500/20 w-full">
          <Icons.Clock className="h-12 w-12 mx-auto mb-4 text-slate-500" />
          <h2 className="text-2xl font-black mb-2">Link Expired</h2>
          <p className="text-sm font-medium opacity-80 leading-relaxed">
            This video link has expired. Please go back to the source and generate a new link.
          </p>
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

  if (!video) {
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

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Plyr Video Container */}
      <div className="w-full rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        <PlyrPlayer
          key={displayVideo.id || displayVideo.slug}
          src={displayVideo.videoUrl}
          poster={displayVideo.thumbnailUrl}
          mp4Qualities={displayVideo.mp4Qualities}
          title={displayVideo.title}
        />
      </div>

      {/* Video Content Info */}
      <div className="space-y-6 px-2">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap gap-2">
               <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1 font-black text-[10px] tracking-widest uppercase">Verified Quality</Badge>
               <Badge variant="outline" className="border-border/60 text-muted-foreground/60 font-black text-[10px] tracking-widest uppercase">{displayVideo.releaseYear}</Badge>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground/90 leading-tight">{displayVideo.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground/60">
              <div className="flex items-center gap-1.5">
                 <Icons.Eye className="h-4 w-4" />
                 <span>{displayVideo.views.toLocaleString()} Views</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                 <Icons.Clock className="h-4 w-4" />
                 <span>{displayVideo.duration} runtime</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <Button variant="secondary" className="rounded-xl gap-2.5 px-6 h-12 border border-border/60 font-black text-xs hover:bg-emerald-500/5 hover:text-emerald-500 hover:border-emerald-500/30 transition-all">
              <Icons.ThumbsUp className="h-4 w-4" />
              {displayVideo.likes}
            </Button>
            <Button variant="secondary" className="rounded-xl h-12 px-4 border border-border/60 text-muted-foreground hover:bg-rose-500/5 hover:text-rose-500 hover:border-rose-500/30 transition-all">
              <Icons.ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator className="bg-border/40" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-2 space-y-6">
              {/* Main Actions */}
              <div className="flex flex-wrap gap-4">
                 <Link to={`/d/${displayVideo.slug}`}>
                   <Button className="h-14 rounded-2xl gap-3 px-10 font-black text-lg bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 text-white border-none">
                      <Icons.Download className="h-5 w-5" />
                      Download Content
                   </Button>
                 </Link>
                 <Button 
                   variant="outline" 
                   onClick={handleCopyLink}
                   className="h-14 rounded-2xl gap-3 px-8 font-black text-base border-border/60 hover:bg-muted/50 transition-all active:scale-95"
                 >
                    {isCopied ? (
                      <>
                        <Icons.Check className="h-5 w-5 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Icons.Copy className="h-5 w-5" />
                        Copy Link
                      </>
                    )}
                 </Button>
              </div>
           </div>

           <div className="space-y-6">
              {/* Ad Space */}
              <div className="aspect-[4/5] md:aspect-auto md:h-full min-h-[300px] rounded-2xl bg-muted/40 border-2 border-dashed border-border flex flex-col items-center justify-center p-6 text-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/40">
                    <Icons.Zap className="h-6 w-6" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Advertisement</h4>
                    <p className="text-[11px] font-bold text-muted-foreground/30">Vertical Display Area<br/>300 × 600</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10 text-xs font-bold"
          >
            <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Icons.Check className="h-3.5 w-3.5 stroke-[3px]" />
            </div>
            <span>Link copied.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
