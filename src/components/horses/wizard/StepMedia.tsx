import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Link, Image, Video, Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { HorseWizardData } from "../HorseWizard";

interface StepMediaProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepMedia = ({ data, onChange }: StepMediaProps) => {
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [dragOverImages, setDragOverImages] = useState(false);
  const [dragOverVideos, setDragOverVideos] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: 'image' | 'video'): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}s/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data: uploadData, error } = await supabase.storage
      .from('horse-media')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('horse-media')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image`,
            variant: "destructive",
          });
          continue;
        }

        const url = await uploadFile(file, 'image');
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        onChange({ images: [...data.images, ...uploadedUrls] });
        toast({
          title: "Images uploaded",
          description: `${uploadedUrls.length} image(s) uploaded successfully`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingVideos(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('video/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a video`,
            variant: "destructive",
          });
          continue;
        }

        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 50MB limit`,
            variant: "destructive",
          });
          continue;
        }

        const url = await uploadFile(file, 'video');
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        onChange({ videos: [...(data.videos || []), ...uploadedUrls] });
        toast({
          title: "Videos uploaded",
          description: `${uploadedUrls.length} video(s) uploaded successfully`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload videos",
        variant: "destructive",
      });
    } finally {
      setUploadingVideos(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    if (type === 'image') {
      setDragOverImages(false);
      handleImageUpload(e.dataTransfer.files);
    } else {
      setDragOverVideos(false);
      handleVideoUpload(e.dataTransfer.files);
    }
  }, [data.images, data.videos]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeImage = (index: number) => {
    onChange({ images: data.images.filter((_, i) => i !== index) });
  };

  const removeVideo = (index: number) => {
    onChange({ videos: (data.videos || []).filter((_, i) => i !== index) });
  };

  const addLink = () => {
    onChange({ external_links: [...data.external_links, ""] });
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...data.external_links];
    newLinks[index] = value;
    onChange({ external_links: newLinks });
  };

  const removeLink = (index: number) => {
    onChange({ external_links: data.external_links.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Images Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-base">Images</Label>
            <p className="text-sm text-muted-foreground">Upload or drag-and-drop images</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragOverImages ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/50'
          }`}
          onDrop={(e) => handleDrop(e, 'image')}
          onDragOver={handleDragOver}
          onDragEnter={() => setDragOverImages(true)}
          onDragLeave={() => setDragOverImages(false)}
          onClick={() => imageInputRef.current?.click()}
        >
          {uploadingImages ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop images here or click to browse</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF</p>
            </div>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files)}
          />
        </div>

        {/* Image Previews */}
        {data.images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
            {data.images.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                <img src={url} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-base">Videos</Label>
            <p className="text-sm text-muted-foreground">Upload or drag-and-drop videos (max 50MB)</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragOverVideos ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/50'
          }`}
          onDrop={(e) => handleDrop(e, 'video')}
          onDragOver={handleDragOver}
          onDragEnter={() => setDragOverVideos(true)}
          onDragLeave={() => setDragOverVideos(false)}
          onClick={() => videoInputRef.current?.click()}
        >
          {uploadingVideos ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Video className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop videos here or click to browse</p>
              <p className="text-xs text-muted-foreground">MP4, WebM, MOV (max 50MB)</p>
            </div>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => handleVideoUpload(e.target.files)}
          />
        </div>

        {/* Video Previews */}
        {(data.videos || []).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {(data.videos || []).map((url, index) => (
              <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-muted group">
                <video src={url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeVideo(index); }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* External Links Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-base">External Links</Label>
            <p className="text-sm text-muted-foreground">Add related links (pedigree, social, etc.)</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLink} className="gap-2">
            <Plus className="w-4 h-4" /> Add Link
          </Button>
        </div>

        {data.external_links.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-6 text-center text-muted-foreground">
            <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No links added yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.external_links.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input value={url} onChange={(e) => updateLink(index, e.target.value)} placeholder="https://example.com" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(index)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
