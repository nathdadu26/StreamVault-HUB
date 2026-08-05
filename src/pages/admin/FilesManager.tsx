/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/src/components/Icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MOCK_VIDEO } from "../../data/mock";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FilesManager() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [editingVideo, setEditingVideo] = useState<typeof MOCK_VIDEO | null>(null);
  const [previewingVideo, setPreviewingVideo] = useState<typeof MOCK_VIDEO | null>(null);

  const simulateUpload = () => {
    setUploading(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setUploading(false), 1000);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search videos..." 
            className="pl-10 h-11 bg-card border-border/60 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 rounded-xl font-bold px-4 border-border/60">
            <Icons.Checklist className="h-4 w-4 mr-2" />
            Bulk Actions
          </Button>
          <Button onClick={simulateUpload} className="h-11 rounded-xl font-black px-6 shadow-lg shadow-emerald-500/20">
            <Icons.Plus className="h-4 w-4 mr-2" />
            Upload New
          </Button>
        </div>
      </div>

      {/* Active Uploads */}
      {uploading && (
        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-none overflow-hidden animate-in zoom-in-95 duration-300">
          <CardContent className="p-6">
             <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <Icons.FileStack className="h-8 w-8" />
                </div>
                <div className="flex-1 space-y-3">
                   <div className="flex items-center justify-between">
                      <div>
                         <h4 className="font-black text-sm uppercase tracking-tight">Uploading: example_video_01.mp4</h4>
                         <p className="text-xs text-muted-foreground">
                            {progress < 40 && "Processing: Renaming and validating file..."}
                            {progress >= 40 && progress < 70 && "Processing: Converting to web-optimized format..."}
                            {progress >= 70 && progress < 90 && "Processing: Extracting thumbnails..."}
                            {progress >= 90 && "Finalizing: Saving to D1 database..."}
                         </p>
                      </div>
                      <span className="text-sm font-black text-emerald-500">{progress}%</span>
                   </div>
                   <Progress value={progress} className="h-1.5 bg-emerald-500/10" />
                </div>
             </div>
          </CardContent>
        </Card>
      )}

      {/* Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="group border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden">
            <div className="aspect-video relative overflow-hidden bg-muted">
              <img 
                src={MOCK_VIDEO.thumbnailUrl} 
                alt="" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                 <Button 
                   size="icon" 
                   variant="secondary" 
                   className="rounded-full h-10 w-10 shadow-xl"
                   onClick={() => setPreviewingVideo(MOCK_VIDEO)}
                 >
                   <Icons.Play className="h-4 w-4 fill-current" />
                 </Button>
                 <Button 
                   size="icon" 
                   variant="secondary" 
                   className="rounded-full h-10 w-10 shadow-xl"
                   onClick={() => setEditingVideo(MOCK_VIDEO)}
                 >
                   <Icons.Settings className="h-4 w-4" />
                 </Button>
              </div>
              <div className="absolute top-2 left-2 flex gap-1">
                 <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5">MP4</Badge>
              </div>
              <div className="absolute bottom-2 right-2">
                 <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white">{MOCK_VIDEO.duration}</span>
              </div>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <h4 className="font-black text-sm truncate text-foreground/90">{MOCK_VIDEO.title}</h4>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>{MOCK_VIDEO.fileSize}</span>
                      <span>•</span>
                      <span>{MOCK_VIDEO.views} Views</span>
                   </div>
                   <span className="text-[10px] font-bold text-muted-foreground">Aug 04</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                 <Button 
                    variant="outline" 
                    className="flex-1 h-9 rounded-lg text-xs font-bold border-border/60 hover:bg-muted"
                    onClick={() => setEditingVideo(MOCK_VIDEO)}
                 >
                    Edit Details
                 </Button>
                 <Button 
                    variant="outline" 
                    size="icon"
                    className="h-9 w-9 rounded-lg border-border/60 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                 >
                    <Icons.Shield className="h-4 w-4 rotate-45" />
                 </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingVideo} onOpenChange={(open) => !open && setEditingVideo(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Edit Media Properties</DialogTitle>
            </DialogHeader>
            {editingVideo && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Display Title</Label>
                  <Input id="title" defaultValue={editingVideo.title} className="h-12 bg-muted/30 border-border/60 rounded-xl font-bold focus:ring-emerald-500/20" />
                </div>
                
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Keyframe Thumbnails</Label>
                  <div className="grid grid-cols-5 gap-3">
                    {editingVideo.thumbnails.map((thumb, idx) => (
                      <div 
                        key={idx} 
                        className={`aspect-video rounded-xl overflow-hidden cursor-pointer border-4 transition-all duration-300 ${
                          editingVideo.thumbnailUrl === thumb ? "border-emerald-500 scale-105 shadow-xl shadow-emerald-500/20" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div className="aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-emerald-500/40 hover:bg-emerald-500/5 cursor-pointer transition-all">
                       <Icons.Download className="h-4 w-4 text-muted-foreground rotate-180" />
                       <span className="text-[8px] font-black uppercase tracking-tighter">Custom</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-muted/30 p-6 flex items-center justify-end gap-3 border-t">
             <Button variant="ghost" onClick={() => setEditingVideo(null)} className="font-bold rounded-xl h-11">Discard Changes</Button>
             <Button onClick={() => setEditingVideo(null)} className="rounded-xl h-11 px-8 font-black shadow-lg shadow-emerald-500/20">Apply Updates</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewingVideo} onOpenChange={(open) => !open && setPreviewingVideo(null)}>
        <DialogContent className="sm:max-w-4xl bg-black border-none p-0 overflow-hidden rounded-3xl shadow-2xl">
          {previewingVideo && (
            <div className="aspect-video w-full bg-black flex items-center justify-center relative group">
               <img src={previewingVideo.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-50" />
               <button className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110 shadow-2xl">
                 <Icons.Play className="h-10 w-10 text-white fill-white ml-1" />
               </button>
               <div className="absolute top-6 left-6 right-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                    <h3 className="text-white font-black text-sm">Preview: {previewingVideo.title}</h3>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setPreviewingVideo(null)} className="text-white hover:bg-white/10 rounded-full bg-black/20 backdrop-blur-md">
                    <Icons.X className="h-5 w-5" />
                  </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
