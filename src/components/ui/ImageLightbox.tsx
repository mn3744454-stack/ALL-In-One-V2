import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface LightboxImage {
  url: string;
  alt?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ZOOM_LEVELS = [1, 1.5, 2, 2.5, 3];

export function ImageLightbox({
  images,
  initialIndex,
  open,
  onOpenChange,
}: ImageLightboxProps) {
  const { t, dir } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoomIndex(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  const currentZoom = ZOOM_LEVELS[zoomIndex];
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIndex > 0;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handleZoomIn = useCallback(() => {
    if (canZoomIn) {
      setZoomIndex((prev) => prev + 1);
    }
  }, [canZoomIn]);

  const handleZoomOut = useCallback(() => {
    if (canZoomOut) {
      setZoomIndex((prev) => prev - 1);
      // Reset position if zooming back to 1x
      if (zoomIndex === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  }, [canZoomOut, zoomIndex]);

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      setCurrentIndex((prev) => prev - 1);
      setZoomIndex(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [hasPrevious]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
      setZoomIndex(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [hasNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          if (dir === "rtl") handleNext();
          else handlePrevious();
          break;
        case "ArrowRight":
          if (dir === "rtl") handlePrevious();
          else handleNext();
          break;
        case "Escape":
          onOpenChange(false);
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, dir, handleNext, handlePrevious, handleZoomIn, handleZoomOut, onOpenChange]);

  // Mouse drag for panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && currentZoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>{currentImage.alt || `${currentIndex + 1} / ${images.length}`}</DialogTitle>
        </VisuallyHidden>
        
        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/60 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 disabled:opacity-30"
              onClick={handleZoomOut}
              disabled={!canZoomOut}
              title={t('horses.mediaGallery.zoomOut')}
            >
              <ZoomOut className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <span className="text-white text-xs sm:text-sm font-medium min-w-[2.5rem] text-center">
              {Math.round(currentZoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 disabled:opacity-30"
              onClick={handleZoomIn}
              disabled={!canZoomIn}
              title={t('horses.mediaGallery.zoomIn')}
            >
              <ZoomIn className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div
          className={cn(
            "w-full h-full flex items-center justify-center overflow-hidden",
            currentZoom > 1 ? "cursor-grab" : "cursor-default",
            isDragging && "cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={currentImage.url}
            alt={currentImage.alt || `Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
            style={{
              transform: `scale(${currentZoom}) translate(${position.x / currentZoom}px, ${position.y / currentZoom}px)`,
            }}
            draggable={false}
          />
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 sm:h-12 sm:w-12 disabled:opacity-30",
                dir === "rtl" ? "right-2 sm:right-4" : "left-2 sm:left-4"
              )}
              onClick={handlePrevious}
              disabled={!hasPrevious}
              title={t('horses.mediaGallery.previous')}
            >
              <ChevronLeft className={cn("h-6 w-6 sm:h-8 sm:w-8", dir === "rtl" && "rotate-180")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 sm:h-12 sm:w-12 disabled:opacity-30",
                dir === "rtl" ? "left-2 sm:left-4" : "right-2 sm:right-4"
              )}
              onClick={handleNext}
              disabled={!hasNext}
              title={t('horses.mediaGallery.next')}
            >
              <ChevronRight className={cn("h-6 w-6 sm:h-8 sm:w-8", dir === "rtl" && "rotate-180")} />
            </Button>
          </>
        )}

        {/* Bottom Counter */}
        <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gradient-to-t from-black/60 to-transparent">
          <span className="text-white text-sm sm:text-base font-medium">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
