import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Wifi } from "lucide-react";
import { useI18n } from "@/i18n";

interface BootstrapErrorFallbackProps {
  error: string;
  onRetry: () => void;
  title?: string;
}

export function BootstrapErrorFallback({ error, onRetry, title }: BootstrapErrorFallbackProps) {
  const { lang } = useI18n();
  const isRTL = lang === 'ar';

  return (
    <div 
      className="min-h-screen bg-background flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Wifi className="w-8 h-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {title || (isRTL ? 'تعذر الاتصال' : 'Connection Failed')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {error}
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button onClick={onRetry} className="w-full gap-2">
            <RefreshCw className="w-4 h-4" />
            {isRTL ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
          
          <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
            <AlertCircle className="w-3 h-3" />
            <span>
              {isRTL 
                ? 'تحقق من اتصال الإنترنت وحاول مرة أخرى'
                : 'Check your internet connection and try again'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
