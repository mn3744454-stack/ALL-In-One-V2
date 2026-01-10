import { useParams } from "react-router-dom";
import { useMediaShareInfo } from "@/hooks/useMediaShareLinks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileX, Image, Video, FileText, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n";

export default function SharedMedia() {
  const { token } = useParams<{ token: string }>();
  const { t } = useI18n();
  const { shareInfo, isLoading, error } = useMediaShareInfo(token);

  // Get signed URL for the file
  const { data: signedUrl, isLoading: loadingUrl } = useQuery({
    queryKey: ["shared-media-url", shareInfo?.bucket, shareInfo?.path],
    queryFn: async () => {
      if (!shareInfo?.bucket || !shareInfo?.path) return null;

      const { data, error } = await supabase.storage
        .from(shareInfo.bucket)
        .createSignedUrl(shareInfo.path, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!shareInfo?.bucket && !!shareInfo?.path,
  });

  const isImage = shareInfo?.mime_type?.startsWith("image/");
  const isVideo = shareInfo?.mime_type?.startsWith("video/");

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  };

  if (isLoading || loadingUrl) {
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

  if (error || !shareInfo) {
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
              {t("sharedMedia.invalidLinkDesc")}
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
            {isImage && signedUrl ? (
              <img
                src={signedUrl}
                alt={shareInfo.filename}
                className="max-w-full max-h-full object-contain"
              />
            ) : isVideo && signedUrl ? (
              <video
                src={signedUrl}
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
                <h3 className="font-medium text-navy">{shareInfo.filename}</h3>
                <p className="text-sm text-muted-foreground">
                  {shareInfo.mime_type}
                </p>
              </div>
            </div>

            <Button onClick={handleDownload} disabled={!signedUrl}>
              <Download className="w-4 h-4 me-2" />
              {t("sharedMedia.download")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
