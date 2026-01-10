import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecureImageProps {
  bucket: string;
  path: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
}

export function SecureImage({
  bucket,
  path,
  alt = "",
  className,
  fallbackClassName,
  expiresIn = 3600,
}: SecureImageProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when path changes
  useEffect(() => {
    setImgError(false);
  }, [path, bucket]);

  const { data: signedUrl, isLoading, error } = useQuery({
    queryKey: ["signed-url", bucket, path],
    queryFn: async () => {
      if (!bucket || !path) return null;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error("Error creating signed URL:", error);
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

  if (error || imgError || !signedUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName || className
        )}
      >
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
}

// Hook for getting signed URLs programmatically
export function useSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  return useQuery({
    queryKey: ["signed-url", bucket, path],
    queryFn: async () => {
      if (!bucket || !path) return null;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error("Error creating signed URL:", error);
        throw error;
      }

      return data?.signedUrl;
    },
    enabled: !!bucket && !!path,
    staleTime: (expiresIn - 300) * 1000,
    gcTime: expiresIn * 1000,
  });
}
