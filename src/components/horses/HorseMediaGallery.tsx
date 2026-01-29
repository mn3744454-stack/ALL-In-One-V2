import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SecureImage, useSignedUrl } from "@/components/ui/SecureImage";
import { SecureVideo } from "@/components/ui/SecureVideo";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { PermissionGuard } from "@/components/guards/PermissionGuard";
import { useI18n } from "@/i18n";
import { Image, Video, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface HorseMediaGalleryProps {
  images?: string[] | null;
  videos?: string[] | null;
  horseName: string;
}

const HORSE_MEDIA_BUCKET = "horse-media";

// Helper to check if a path is a full URL
const isFullUrl = (path: string): boolean => {
  return path.startsWith("http://") || path.startsWith("https://");
};

// Component for rendering a single image thumbnail
function ImageThumbnail({
  path,
  alt,
  onClick,
}: {
  path: string;
  alt: string;
  onClick: () => void;
}) {
  if (isFullUrl(path)) {
    return (
      <div
        className="aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-muted cursor-pointer group"
        onClick={onClick}
      >
        <img
          src={path}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className="aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-muted cursor-pointer group"
      onClick={onClick}
    >
      <SecureImage
        bucket={HORSE_MEDIA_BUCKET}
        path={path}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}

// Component for rendering a single video thumbnail
function VideoThumbnail({ path }: { path: string }) {
  if (isFullUrl(path)) {
    return (
      <div className="aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-muted">
        <video
          src={path}
          className="w-full h-full object-cover"
          controls
          playsInline
        />
      </div>
    );
  }

  return (
    <div className="aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-muted">
      <SecureVideo
        bucket={HORSE_MEDIA_BUCKET}
        path={path}
        className="w-full h-full object-cover"
        controls
      />
    </div>
  );
}

// Component to resolve signed URL for lightbox
function LightboxImageResolver({
  path,
  onResolve,
}: {
  path: string;
  onResolve: (url: string) => void;
}) {
  const { data: signedUrl } = useSignedUrl(
    HORSE_MEDIA_BUCKET,
    isFullUrl(path) ? "" : path
  );

  // If it's a full URL, return it directly
  if (isFullUrl(path)) {
    if (signedUrl === undefined) {
      // Signal resolved with original URL
      onResolve(path);
    }
    return null;
  }

  // For storage paths, wait for signed URL
  if (signedUrl) {
    onResolve(signedUrl);
  }

  return null;
}

export function HorseMediaGallery({
  images,
  videos,
  horseName,
}: HorseMediaGalleryProps) {
  const { t } = useI18n();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  const hasMedia =
    (images && images.length > 0) || (videos && videos.length > 0);

  // Prepare lightbox images with resolved URLs
  const lightboxImages = useMemo(() => {
    if (!images) return [];

    return images.map((path, index) => {
      // If it's already a full URL, use it directly
      if (isFullUrl(path)) {
        return {
          url: path,
          alt: `${horseName} ${index + 1}`,
        };
      }
      // Otherwise, use resolved URL if available, or placeholder
      return {
        url: resolvedUrls[path] || "",
        alt: `${horseName} ${index + 1}`,
      };
    });
  }, [images, horseName, resolvedUrls]);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleUrlResolved = (path: string, url: string) => {
    setResolvedUrls((prev) => {
      if (prev[path] !== url) {
        return { ...prev, [path]: url };
      }
      return prev;
    });
  };

  if (!hasMedia) {
    return null;
  }

  return (
    <PermissionGuard permissionKey="horses.media.manage" showFallback={false}>
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Image className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
            {t("horses.profile.mediaGallery")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Hidden resolvers for storage paths */}
          {images?.map(
            (path) =>
              !isFullUrl(path) && (
                <LightboxImageResolver
                  key={path}
                  path={path}
                  onResolve={(url) => handleUrlResolved(path, url)}
                />
              )
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
            {/* Images */}
            {images?.map((path, index) => (
              <ImageThumbnail
                key={`img-${index}`}
                path={path}
                alt={`${horseName} ${index + 1}`}
                onClick={() => handleImageClick(index)}
              />
            ))}

            {/* Videos */}
            {videos?.map((path, index) => (
              <VideoThumbnail key={`vid-${index}`} path={path} />
            ))}
          </div>

          {/* Show count summary */}
          <div className="flex items-center gap-4 mt-3 text-xs sm:text-sm text-muted-foreground">
            {images && images.length > 0 && (
              <span className="flex items-center gap-1">
                <Image className="w-3.5 h-3.5" />
                {images.length}
              </span>
            )}
            {videos && videos.length > 0 && (
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />
                {videos.length}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages.filter((img) => img.url)}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </PermissionGuard>
  );
}
