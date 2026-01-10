import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Link, Video, Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SecureImage } from "@/components/ui/SecureImage";
import type { HorseWizardData } from "../HorseWizard";

// Interface for media asset references stored in wizard data
export interface MediaAssetRef {
  id: string;
  path: string;
  bucket: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
}

interface StepMediaProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
  tenantId: string;
  horseId?: string; // For edit mode - the real horse ID
  tempEntityId: string; // For create mode - stable temp UUID from HorseWizard
}

export const StepMedia = ({ data, onChange, tenantId, horseId, tempEntityId }: StepMediaProps) => {
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [dragOverImages, setDragOverImages] = useState(false);
  const [dragOverVideos, setDragOverVideos] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRef[]>([]);
  const [videoAssets, setVideoAssets] = useState<MediaAssetRef[]>([]);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Determine the entity ID to use for uploads and queries
  // In edit mode: use horseId (real horse ID)
  // In create mode: use tempEntityId (stable UUID from HorseWizard)
  const entityIdForUpload = horseId ?? tempEntityId;

  // Load existing media assets
  // - Edit mode: load by horseId
  // - Create mode: load by tempEntityId (for assets uploaded in this session)
  useEffect(() => {
    const loadExistingAssets = async () => {
      const entityIdToQuery = horseId ?? tempEntityId;
      if (!entityIdToQuery || !tenantId) return;
      
      try {
        const { data: assets, error } = await supabase
          .from("media_assets" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("entity_type", "horse")
          .eq("entity_id", entityIdToQuery)
          .order("display_order", { ascending: true });

        if (error) {
          console.warn("Error loading media assets:", error);
          return;
        }

        const images: MediaAssetRef[] = [];
        const videos: MediaAssetRef[] = [];
        
        (assets as any[] || []).forEach((asset: any) => {
          const ref: MediaAssetRef = {
            id: asset.id,
            path: asset.path,
            bucket: asset.bucket,
            filename: asset.filename,
            mime_type: asset.mime_type || "",
            size_bytes: asset.size_bytes || 0,
          };
          
          if (asset.mime_type?.startsWith("video/")) {
            videos.push(ref);
          } else {
            images.push(ref);
          }
        });

        setMediaAssets(images);
        setVideoAssets(videos);
      } catch (err) {
        console.error("Error loading media assets:", err);
      }
    };

    loadExistingAssets();
  }, [horseId, tempEntityId, tenantId]);

  const uploadFile = async (file: File, type: 'image' | 'video'): Promise<MediaAssetRef | null> => {
    const fileExt = file.name.split('.').pop();
    // Use tenant-scoped path: ${tenantId}/${entityType}/${entityId}/${uuid}.${ext}
    // entityIdForUpload is always a valid UUID (either real horseId or temp UUID)
    const path = `${tenantId}/horses/${entityIdForUpload}/${crypto.randomUUID()}.${fileExt}`;

    // 1. Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('horse-media')
      .upload(path, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // 2. Get current user
    const { data: user } = await supabase.auth.getUser();

    // 3. Create media_asset record
    const { data: asset, error: assetError } = await supabase
      .from("media_assets" as any)
      .insert({
        tenant_id: tenantId,
        entity_type: "horse",
        entity_id: entityIdForUpload, // Always a valid UUID
        bucket: "horse-media",
        path,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        visibility: "tenant",
        created_by: user?.user?.id,
        display_order: type === 'image' ? mediaAssets.length : videoAssets.length,
      })
      .select()
      .single();

    if (assetError) {
      console.error('Asset creation error:', assetError);
      // Clean up the uploaded file if asset creation fails
      await supabase.storage.from('horse-media').remove([path]);
      throw assetError;
    }

    return {
      id: (asset as any).id,
      path,
      bucket: "horse-media",
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    };
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadedAssets: MediaAssetRef[] = [];
      
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image`,
            variant: "destructive",
          });
          continue;
        }

        const asset = await uploadFile(file, 'image');
        if (asset) uploadedAssets.push(asset);
      }

      if (uploadedAssets.length > 0) {
        const newAssets = [...mediaAssets, ...uploadedAssets];
        setMediaAssets(newAssets);
        // Also update legacy images array for backward compatibility
        onChange({ images: [...data.images, ...uploadedAssets.map(a => a.path)] });
        toast({
          title: "Images uploaded",
          description: `${uploadedAssets.length} image(s) uploaded successfully`,
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
      const uploadedAssets: MediaAssetRef[] = [];
      
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

        const asset = await uploadFile(file, 'video');
        if (asset) uploadedAssets.push(asset);
      }

      if (uploadedAssets.length > 0) {
        const newAssets = [...videoAssets, ...uploadedAssets];
        setVideoAssets(newAssets);
        // Also update legacy videos array for backward compatibility
        onChange({ videos: [...(data.videos || []), ...uploadedAssets.map(a => a.path)] });
        toast({
          title: "Videos uploaded",
          description: `${uploadedAssets.length} video(s) uploaded successfully`,
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
  }, [mediaAssets, videoAssets, data.images, data.videos]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeImage = async (index: number) => {
    const asset = mediaAssets[index];
    if (!asset) return;

    try {
      // 1. Delete from storage
      await supabase.storage.from('horse-media').remove([asset.path]);
      
      // 2. Delete from media_assets
      await supabase.from("media_assets" as any).delete().eq("id", asset.id);
      
      // 3. Update local state
      const newAssets = mediaAssets.filter((_, i) => i !== index);
      setMediaAssets(newAssets);
      onChange({ images: data.images.filter((_, i) => i !== index) });
      
      toast({
        title: "Image removed",
        description: "Image has been deleted",
      });
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast({
        title: "Failed to remove image",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeVideo = async (index: number) => {
    const asset = videoAssets[index];
    if (!asset) return;

    try {
      // 1. Delete from storage
      await supabase.storage.from('horse-media').remove([asset.path]);
      
      // 2. Delete from media_assets
      await supabase.from("media_assets" as any).delete().eq("id", asset.id);
      
      // 3. Update local state
      const newAssets = videoAssets.filter((_, i) => i !== index);
      setVideoAssets(newAssets);
      onChange({ videos: (data.videos || []).filter((_, i) => i !== index) });
      
      toast({
        title: "Video removed",
        description: "Video has been deleted",
      });
    } catch (error: any) {
      console.error("Error removing video:", error);
      toast({
        title: "Failed to remove video",
        description: error.message,
        variant: "destructive",
      });
    }
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

        {/* Image Previews using SecureImage */}
        {mediaAssets.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
            {mediaAssets.map((asset, index) => (
              <div key={asset.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                <SecureImage 
                  bucket={asset.bucket}
                  path={asset.path}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
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
        {videoAssets.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {videoAssets.map((asset, index) => (
              <div key={asset.id} className="relative aspect-video rounded-lg overflow-hidden bg-muted group">
                <div className="w-full h-full flex items-center justify-center bg-navy/10">
                  <Video className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                  <p className="text-xs text-white truncate">{asset.filename}</p>
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
