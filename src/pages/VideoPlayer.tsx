/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useParams } from "react-router-dom";
import { Icons } from "@/src/components/Icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_VIDEO } from "../data/mock";
import { Separator } from "@/components/ui/separator";

export function VideoPlayer() {
  const { slug } = useParams();
  const video = MOCK_VIDEO; // In production, fetch by slug

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Video Container */}
      <div className="group relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-900 shadow-2xl ring-1 ring-white/10">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title}
          className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="w-24 h-24 rounded-full bg-emerald-500/10 backdrop-blur-xl flex items-center justify-center hover:bg-emerald-500/20 transition-all hover:scale-110 group/play border border-white/20 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-emerald-500/40 shadow-xl">
               <Icons.Play className="h-8 w-8 text-white fill-current ml-1" />
            </div>
          </button>
        </div>

        {/* Video Controls Mock */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 to-transparent flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden cursor-pointer group/progress">
             <div className="h-full w-1/3 bg-emerald-500 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
             </div>
           </div>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button className="text-white hover:text-emerald-500 transition-colors">
                   <Icons.Play className="h-5 w-5 fill-current" />
                </button>
                <div className="flex items-center gap-3">
                   <Icons.Volume2 className="h-5 w-5 text-white" />
                   <div className="h-1 w-16 bg-white/20 rounded-full">
                      <div className="h-full w-3/4 bg-white rounded-full" />
                   </div>
                </div>
                <span className="text-xs text-white/80 font-black tracking-tight">12:45 / 1:50:28</span>
              </div>
              <div className="flex items-center gap-6">
                <Badge variant="outline" className="text-white border-white/20 text-[10px] font-black px-1.5 h-5 rounded uppercase tracking-tighter">HD 1080P</Badge>
                <button className="text-white hover:text-emerald-500 transition-colors"><Icons.Settings className="h-5 w-5" /></button>
                <button className="text-white hover:text-emerald-500 transition-colors"><Icons.Maximize className="h-5 w-5" /></button>
              </div>
           </div>
        </div>
      </div>

      {/* Video Content Info */}
      <div className="space-y-6 px-2">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap gap-2">
               <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1 font-black text-[10px] tracking-widest uppercase">Verified Quality</Badge>
               <Badge variant="outline" className="border-border/60 text-muted-foreground/60 font-black text-[10px] tracking-widest uppercase">{video.releaseYear}</Badge>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground/90 leading-tight">{video.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground/60">
              <div className="flex items-center gap-1.5">
                 <Icons.Eye className="h-4 w-4" />
                 <span>24,782 Unique Views</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                 <Icons.Clock className="h-4 w-4" />
                 <span>{video.duration} runtime</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <Button variant="secondary" className="rounded-xl gap-2.5 px-6 h-12 border border-border/60 font-black text-xs hover:bg-emerald-500/5 hover:text-emerald-500 hover:border-emerald-500/30 transition-all">
              <Icons.ThumbsUp className="h-4 w-4" />
              1.2K
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
                 <Button className="h-14 rounded-2xl gap-3 px-10 font-black text-lg bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20">
                    <Icons.Download className="h-5 w-5" />
                    Download Content
                 </Button>
                 <Button variant="outline" className="h-14 rounded-2xl gap-3 px-8 font-black text-base border-border/60 hover:bg-muted/50">
                    <Icons.Shield className="h-5 w-5 rotate-45" />
                    Report Issue
                 </Button>
              </div>

              {/* Description Card */}
              <Card className="border border-border/40 bg-muted/20 shadow-none rounded-2xl">
                 <CardContent className="p-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-3">About this video</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                       Enjoy high-quality streaming of your favorite content. This video has been optimized for low bandwidth without compromising visual fidelity. If you encounter any issues, please use the report button above.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-6">
                       {video.genres.map((genre) => (
                          <span key={genre} className="px-3 py-1.5 rounded-lg bg-card border border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                             {genre}
                          </span>
                       ))}
                    </div>
                 </CardContent>
              </Card>
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
    </div>
  );
}
