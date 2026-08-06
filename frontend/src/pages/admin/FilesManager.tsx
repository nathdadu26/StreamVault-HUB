import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/src/components/Icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Video } from "../../types";
import { 
  getStoredFiles, 
  updateFileThumbnail, 
  deleteFile, 
} from "../../lib/api";
import { StoredUploadItem } from "../../lib/uploadQueueDb";
import { uploadManager } from "../../lib/uploadManager";
import { PlyrPlayer } from "../../components/PlyrPlayer";
import { useBackendHealth } from "../../hooks/useBackendHealth";

export function FilesManager() {
  const [files, setFiles] = useState<Video[]>([]);
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<StoredUploadItem[]>([]);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingThumbnailUrl, setEditingThumbnailUrl] = useState("");
  const [previewingVideo, setPreviewingVideo] = useState<Video | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOnline } = useBackendHealth();

  useEffect(() => {
    refreshFiles();
    uploadManager.setOnFilesChangedCallback(refreshFiles);
    const unsubscribe = uploadManager.subscribe((queue) => {
      setUploadQueue(queue);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const refreshFiles = () => {
    const loaded = getStoredFiles();
    setFiles(loaded);

    fetch("/api/videos")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFiles(data);
        }
      })
      .catch(() => {});
  };

  const handleFilesSelected = (fileList: FileList | File[]) => {
    if (!isOnline) return;
    uploadManager.addFiles(fileList);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isOnline) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isOnline && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleSaveEdit = () => {
    if (!editingVideo) return;
    updateFileThumbnail(editingVideo.id, editingThumbnailUrl, editingTitle);
    refreshFiles();
    setEditingVideo(null);
  };

  const handleDelete = (id: string) => {
    deleteFile(id);
    refreshFiles();
    setDeleteConfirmId(null);
  };

  const filteredFiles = files.filter(
    (f) =>
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
        accept="video/*"
        multiple
        className="hidden"
        disabled={!isOnline}
      />

      {/* TOP: Large Upload Card (Always Visible) */}
      <Card className="border border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Video Processing & Cloudflare Storage</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Upload videos for automated MP4 conversion, thumbnail extraction & D1/R2 storage
              </CardDescription>
            </div>
            {isOnline ? (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-bold">
                Server Ready
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs font-bold">
                Server Offline
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          {/* Offline Banner Warning */}
          {!isOnline && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 text-xs font-bold animate-in fade-in duration-300">
              <Icons.AlertTriangle className="h-5 w-5 shrink-0" />
              <span>The processing server is currently offline. Video uploads are temporarily unavailable.</span>
            </div>
          )}

          {/* Large Dashed Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => isOnline && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-300 group ${
              !isOnline
                ? "border-border/30 bg-muted/5 opacity-50 cursor-not-allowed"
                : isDragging
                ? "border-emerald-500 bg-emerald-500/10 scale-[1.01] cursor-pointer"
                : "border-border/60 hover:border-emerald-500/60 bg-muted/10 hover:bg-muted/20 cursor-pointer"
            }`}
          >
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-transform ${
              isOnline ? "bg-emerald-500/10 text-emerald-500 group-hover:scale-110" : "bg-muted text-muted-foreground"
            }`}>
              <Icons.Upload className="h-8 w-8" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-base text-foreground/90">
                {isOnline ? (
                  <>Drag & Drop video here or <span className="text-emerald-500 underline underline-offset-4">Click to Browse</span></>
                ) : (
                  <span className="text-muted-foreground">Upload Server Disconnected</span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                {isOnline 
                  ? "Supports MP4, MOV, MKV, AVI, WEBM (Automated conversion to MP4 & 5 Thumbnails)"
                  : "The website and admin dashboard continue working directly via Cloudflare D1"}
              </p>
            </div>
          </div>

          {/* Upload Queue Section */}
          {uploadQueue.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground/80">
                  Upload Queue ({uploadQueue.length})
                </h4>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => uploadManager.cancelAllUploads()}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground h-7 px-3 rounded-lg border-border/60"
                  >
                    Cancel Uploads
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => uploadManager.clearFinishedUploads()}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground h-7 px-3 rounded-lg border-border/60"
                  >
                    Clear Finished
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {uploadQueue.map((item) => {
                  let badgeLabel = "Processing";
                  let badgeBg = "bg-orange-500";

                  if (item.step === "Completed") {
                    badgeLabel = "Ready";
                    badgeBg = "bg-emerald-600";
                  } else if (item.step === "Failed") {
                    badgeLabel = "Failed";
                    badgeBg = "bg-rose-600";
                  } else if (item.step === "Uploading to Bunny Stream" && item.progress < 100) {
                    badgeLabel = "Uploading";
                    badgeBg = "bg-blue-600";
                  }

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-border/40 bg-muted/20 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                            <Icons.FileVideo className="h-4.5 w-4.5" />
                          </div>
                          <div className="truncate min-w-0">
                            <h5 className="text-xs font-black truncate text-foreground/90">{item.name}</h5>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {item.sizeFormatted}
                            </p>
                            {item.error && (
                              <p className="text-[10px] text-amber-500/90 font-medium truncate mt-0.5">
                                {item.error}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className={`h-6 px-3 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-none border-none shrink-0 ${badgeBg}`}>
                            {badgeLabel}
                          </span>
                          <Icons.X
                            className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"
                            onClick={() => uploadManager.cancelUpload(item.id)}
                          />
                        </div>
                      </div>

                      {item.step === "Uploading to Bunny Stream" && item.progress < 100 && (
                        <Progress
                          value={item.progress}
                          className="h-1.5 bg-blue-500/10"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BOTTOM: All Files Section */}
      <Card className="border border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">All Files (Cloudflare D1)</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""} registered in D1 database
              </CardDescription>
            </div>

            <div className="relative w-full md:w-72">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-card border-border/60 rounded-xl text-xs font-medium"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-muted/50 text-muted-foreground mx-auto flex items-center justify-center">
                <Icons.FileVideo className="h-6 w-6" />
              </div>
              <h4 className="font-black text-sm text-foreground/80">No Files Found</h4>
              <p className="text-xs text-muted-foreground">Upload a video using the card above to create your first record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="py-4 px-6">Active Thumbnail</th>
                    <th className="py-4 px-6">Title</th>
                    <th className="py-4 px-6">Slug</th>
                    <th className="py-4 px-6">Views</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="h-16 w-28 rounded-xl overflow-hidden relative bg-muted border border-border/40 group-hover:border-emerald-500/40 transition-colors">
                          <img src={file.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          <Badge className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-bold px-1 py-0 border-none">
                            {file.duration}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1 max-w-xs">
                          <h4 className="font-black text-sm text-foreground/90 truncate">{file.title}</h4>
                          <p className="text-[10px] text-muted-foreground truncate">{file.fileSize}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <code className="px-2 py-1 rounded bg-muted/40 font-mono text-[10px] text-emerald-600 font-bold border border-border/40">
                          /ad/{file.slug}
                        </code>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-black text-foreground/80">{file.views.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewingVideo(file)}
                            className="h-9 px-3 rounded-lg text-xs font-bold border-border/60 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
                          >
                            <Icons.Play className="h-3.5 w-3.5 mr-1" /> Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingVideo(file);
                              setEditingTitle(file.title);
                              setEditingThumbnailUrl(file.thumbnailUrl);
                            }}
                            className="h-9 px-3 rounded-lg text-xs font-bold border-border/60 hover:bg-muted"
                          >
                            <Icons.Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirmId(file.id)}
                            className="h-9 px-3 rounded-lg text-xs font-bold border-border/60 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                          >
                            <Icons.Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
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

      {/* Edit Modal (5 Thumbnails Selection) */}
      <Dialog open={!!editingVideo} onOpenChange={(open) => !open && setEditingVideo(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">Edit Media & Select Active Thumbnail</DialogTitle>
            </DialogHeader>

            {editingVideo && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Display Title</Label>
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="h-11 bg-muted/20 border-border/40 rounded-xl font-bold text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Extracted Thumbnails (Select 1 of 5)
                    </Label>
                    <span className="text-[10px] font-bold text-emerald-500">Stored in R2</span>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    {editingVideo.thumbnails.map((thumb, idx) => (
                      <div
                        key={idx}
                        onClick={() => setEditingThumbnailUrl(thumb)}
                        className={`aspect-video rounded-xl overflow-hidden cursor-pointer border-4 transition-all duration-300 relative ${
                          editingThumbnailUrl === thumb
                            ? "border-emerald-500 scale-105 shadow-xl shadow-emerald-500/20"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={thumb} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        {editingThumbnailUrl === thumb && (
                          <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Icons.Check className="h-3 w-3 stroke-[3px]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-muted/30 p-6 flex items-center justify-end gap-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setEditingVideo(null)} className="font-bold rounded-xl h-11">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="rounded-xl h-11 px-8 font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
              Save Changes to D1
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-none shadow-2xl p-6 rounded-2xl space-y-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-destructive">Delete File from D1 & R2?</DialogTitle>
          </DialogHeader>
          <p className="text-xs font-medium text-muted-foreground leading-relaxed">
            This action will permanently delete the database entry from Cloudflare D1 and remove all associated MP4 and thumbnail files from Cloudflare R2.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="rounded-xl h-10 font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              variant="destructive"
              className="rounded-xl h-10 px-6 font-black"
            >
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewingVideo} onOpenChange={(open) => !open && setPreviewingVideo(null)}>
        <DialogContent 
          showCloseButton={false}
          className="sm:max-w-4xl bg-black/95 border border-white/10 p-4 sm:p-6 overflow-hidden rounded-3xl shadow-2xl backdrop-blur-2xl"
        >
          {previewingVideo && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-white uppercase tracking-tight truncate max-w-md sm:max-w-xl">
                    {previewingVideo.title}
                  </h3>
                  <p className="text-[10px] font-mono text-emerald-400 font-bold">
                    /ad/{previewingVideo.slug}
                  </p>
                </div>
                {/* Single Close Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewingVideo(null)}
                  className="h-9 w-9 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 shrink-0"
                >
                  <Icons.X className="h-4 w-4" />
                </Button>
              </div>

              <PlyrPlayer
                src={previewingVideo.videoUrl}
                poster={previewingVideo.thumbnailUrl}
                mp4Qualities={previewingVideo.mp4Qualities}
                title={previewingVideo.title}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
