import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Image, Video, FileText, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface SharedMediaData {
  signedUrl: string;
  filename: string;
  mimeType: string;
}

export default function SharedMedia() {
  const { token } = useParams<{ token: string }>();
  const { t } = useI18n();

  // Call edge function to get signed URL (works for anonymous users)
  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-media-sign", token],
    queryFn: async (): Promise<SharedMediaData> => {
      if (!token) throw new Error("No token");

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/shared-media-sign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load shared media");
      }

      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const isImage = data?.mimeType?.startsWith("image/");
  const isVideo = data?.mimeType?.startsWith("video/");

  const handleDownload = () => {
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <Skeleton className="h-64 w-full rounded-lg mb-4" />
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-navy mb-2">
              {t("sharedMedia.invalidLink")}
            </h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : t("sharedMedia.invalidLinkDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardContent className="p-6">
          {/* Preview */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-6 flex items-center justify-center">
            {isImage && data.signedUrl ? (
              <img
                src={data.signedUrl}
                alt={data.filename}
                className="max-w-full max-h-full object-contain"
              />
            ) : isVideo && data.signedUrl ? (
              <video
                src={data.signedUrl}
                controls
                className="max-w-full max-h-full"
              />
            ) : (
              <div className="text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">{t("sharedMedia.previewNotAvailable")}</p>
              </div>
            )}
          </div>

          {/* File info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                {isImage ? (
                  <Image className="w-5 h-5 text-gold" />
                ) : isVideo ? (
                  <Video className="w-5 h-5 text-gold" />
                ) : (
                  <FileText className="w-5 h-5 text-gold" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-navy">{data.filename}</h3>
                <p className="text-sm text-muted-foreground">
                  {data.mimeType}
                </p>
              </div>
            </div>

            <Button onClick={handleDownload} disabled={!data.signedUrl}>
              <Download className="w-4 h-4 me-2" />
              {t("sharedMedia.download")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
