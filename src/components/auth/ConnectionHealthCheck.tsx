import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { testConnectivity, isUsingProxy, getProxyUrl } from '@/lib/proxyConfig';
import { useI18n } from '@/i18n/I18nContext';

interface ConnectionStatus {
  success: boolean;
  source: 'proxy' | 'direct' | 'none';
  message: string;
  latencyMs?: number;
}

export function ConnectionHealthCheck() {
  const { t } = useI18n();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  
  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    
    try {
      const result = await testConnectivity();
      setStatus(result);
    } catch (e) {
      setStatus({
        success: false,
        source: 'none',
        message: 'فشل الاختبار',
      });
    } finally {
      setTesting(false);
    }
  };
  
  const usingProxy = isUsingProxy();
  const proxyUrl = getProxyUrl();
  
  return (
    <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          فحص الاتصال
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleTest}
          disabled={testing}
          className="h-7 px-2 text-xs"
        >
          {testing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            'اختبار'
          )}
        </Button>
      </div>
      
      {status && (
        <div className={`flex items-center gap-2 text-sm p-2 rounded ${
          status.success 
            ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {status.success ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1">
            {status.message}
            {status.latencyMs && (
              <span className="text-muted-foreground ms-1">
                ({status.latencyMs}ms)
              </span>
            )}
          </span>
        </div>
      )}
      
      {!status && !testing && (
        <p className="text-xs text-muted-foreground">
          {usingProxy 
            ? `البروكسي: ${proxyUrl?.replace('https://', '').substring(0, 30)}...`
            : 'اضغط "اختبار" للتحقق من الاتصال بالخادم'
          }
        </p>
      )}
      
      {status && !status.success && (
        <p className="text-xs text-muted-foreground mt-2">
          جرّب استخدام VPN أو بيانات الجوال (4G/5G)
        </p>
      )}
    </div>
  );
}
