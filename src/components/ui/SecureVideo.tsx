import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecureVideoProps {
  bucket: string;
  path: string;
  className?: string;
  fallbackClassName?: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export function SecureVideo({
  bucket,
  path,
  className,
  fallbackClassName,
  expiresIn = 3600,
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
}: SecureVideoProps) {
  const [videoError, setVideoError] = useState(false);

  // Reset error state when path changes
  useEffect(() => {
    setVideoError(false);
  }, [path, bucket]);

  const { data: signedUrl, isLoading, error } = useQuery({
    queryKey: ["signed-url", bucket, path],
    queryFn: async () => {
      if (!bucket || !path) return null;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error("Error creating signed URL for video:", error);
        throw error;
      }

      return data?.signedUrl;
    },
    enabled: !!bucket && !!path,
    staleTime: (expiresIn - 300) * 1000, // Refresh 5 min before expiry
    gcTime: expiresIn * 1000,
  });

  if (isLoading) {
    return <Skeleton className={cn("w-full h-full", className)} />;
  }

  if (error || videoError || !signedUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName || className
        )}
      >
        <VideoOff className="h-8 w-8" />
      </div>
    );
  }

  return (
    <video
      src={signedUrl}
      className={className}
      onError={() => setVideoError(true)}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline
    />
  );
}

// Hook for getting signed URLs for videos programmatically
export function useVideoSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  return useQuery({
    queryKey: ["signed-url", bucket, path],
    queryFn: async () => {
      if (!bucket || !path) return null;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error("Error creating signed URL for video:", error);
        throw error;
      }

      return data?.signedUrl;
    },
    enabled: !!bucket && !!path,
    staleTime: (expiresIn - 300) * 1000,
    gcTime: expiresIn * 1000,
  });
}
