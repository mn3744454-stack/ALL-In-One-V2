import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getBuildInfo } from "@/utils/buildInfo";
import { Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface DiagnosticsData {
  timestamp: string;
  buildInfo: ReturnType<typeof getBuildInfo>;
  session: {
    present: boolean;
    userId: string | null;
    email: string | null;
    expiresAt: string | null;
  };
  memberships: {
    count: number;
    tenantIds: string[];
    error: string | null;
  };
  localStorage: {
    activeTenantId: string | null;
    keys: string[];
  };
  lastError: string | null;
}

const DebugAuth = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchDiagnostics = async () => {
    setLoading(true);
    
    const buildInfo = getBuildInfo();
    let lastError: string | null = null;
    
    // Get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      lastError = `Session error: ${sessionError.message}`;
    }
    
    const session = sessionData?.session;
    
    // Get memberships if logged in
    let memberships = { count: 0, tenantIds: [] as string[], error: null as string | null };
    if (session?.user?.id) {
      const { data: memberData, error: memberError } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .eq("is_active", true);
      
      if (memberError) {
        memberships.error = memberError.message;
        lastError = `Membership error: ${memberError.message}`;
      } else if (memberData) {
        memberships.count = memberData.length;
        memberships.tenantIds = memberData.map(m => m.tenant_id);
      }
    }
    
    // Get localStorage keys related to auth/tenant
    const relevantKeys = ['activeTenantId', 'sb-access-token', 'sb-refresh-token'];
    const foundKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('tenant') || key.includes('supabase') || key.includes('sb-'))) {
        foundKeys.push(key);
      }
    }
    
    setDiagnostics({
      timestamp: new Date().toISOString(),
      buildInfo,
      session: {
        present: !!session,
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      },
      memberships,
      localStorage: {
        activeTenantId: localStorage.getItem('activeTenantId'),
        keys: foundKeys,
      },
      lastError,
    });
    
    setLoading(false);
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const copyDiagnostics = () => {
    if (!diagnostics) return;
    
    const text = `
=== KHAIL AUTH DIAGNOSTICS ===
Timestamp: ${diagnostics.timestamp}

BUILD INFO:
  Build ID: ${diagnostics.buildInfo.buildId}
  Supabase Host: ${diagnostics.buildInfo.supabaseUrlHost}
  Anon Key Fingerprint: ${diagnostics.buildInfo.anonKeyFingerprint}

SESSION:
  Present: ${diagnostics.session.present}
  User ID: ${diagnostics.session.userId || 'N/A'}
  Email: ${diagnostics.session.email || 'N/A'}
  Expires At: ${diagnostics.session.expiresAt || 'N/A'}

MEMBERSHIPS:
  Count: ${diagnostics.memberships.count}
  Tenant IDs: ${diagnostics.memberships.tenantIds.join(', ') || 'None'}
  Error: ${diagnostics.memberships.error || 'None'}

LOCAL STORAGE:
  activeTenantId: ${diagnostics.localStorage.activeTenantId || 'Not set'}
  Related Keys: ${diagnostics.localStorage.keys.join(', ') || 'None'}

LAST ERROR: ${diagnostics.lastError || 'None'}
==============================
    `.trim();
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Diagnostics copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const clearCacheAndReload = async () => {
    toast.info("Clearing caches...");
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    
    // Clear cache storage
    if ('caches' in window) {
      const names = await caches.keys();
      for (const name of names) {
        await caches.delete(name);
      }
    }
    
    // Clear localStorage tenant selection
    localStorage.removeItem('activeTenantId');
    
    toast.success("Caches cleared. Reloading...");
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy">Auth Diagnostics</h1>
          <Link to="/auth" className="text-gold hover:underline">
            ← Back to Login
          </Link>
        </div>

        <div className="space-y-4">
          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={fetchDiagnostics} disabled={loading} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={copyDiagnostics} disabled={!diagnostics}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy Diagnostics
            </Button>
            <Button onClick={clearCacheAndReload} variant="destructive">
              Clear Cache & Reload
            </Button>
          </div>

          {diagnostics && (
            <>
              {/* Build Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Build Info</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-xs space-y-1">
                  <div><span className="text-muted-foreground">Build ID:</span> {diagnostics.buildInfo.buildId}</div>
                  <div><span className="text-muted-foreground">Supabase Host:</span> {diagnostics.buildInfo.supabaseUrlHost}</div>
                  <div><span className="text-muted-foreground">Key Fingerprint:</span> {diagnostics.buildInfo.anonKeyFingerprint}</div>
                </CardContent>
              </Card>

              {/* Session */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Session</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">Present:</span>{' '}
                    <span className={diagnostics.session.present ? 'text-green-600' : 'text-red-600'}>
                      {diagnostics.session.present ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div><span className="text-muted-foreground">User ID:</span> {diagnostics.session.userId || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Email:</span> {diagnostics.session.email || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Expires:</span> {diagnostics.session.expiresAt || 'N/A'}</div>
                </CardContent>
              </Card>

              {/* Memberships */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Memberships (tenant_members)</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">Count:</span>{' '}
                    <span className={diagnostics.memberships.count > 0 ? 'text-green-600' : 'text-amber-600'}>
                      {diagnostics.memberships.count}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tenant IDs:</span>{' '}
                    {diagnostics.memberships.tenantIds.length > 0 
                      ? diagnostics.memberships.tenantIds.map(id => (
                          <div key={id} className="ml-4 text-[10px]">{id}</div>
                        ))
                      : 'None'}
                  </div>
                  {diagnostics.memberships.error && (
                    <div className="text-red-600">
                      <span className="text-muted-foreground">Error:</span> {diagnostics.memberships.error}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Local Storage */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Local Storage</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">activeTenantId:</span>{' '}
                    {diagnostics.localStorage.activeTenantId || <span className="text-amber-600">Not set</span>}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Related Keys:</span>
                    {diagnostics.localStorage.keys.length > 0 
                      ? diagnostics.localStorage.keys.map(key => (
                          <div key={key} className="ml-4 text-[10px]">{key}</div>
                        ))
                      : ' None'}
                  </div>
                </CardContent>
              </Card>

              {/* Last Error */}
              {diagnostics.lastError && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-700">Last Error</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-xs text-red-600">
                    {diagnostics.lastError}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugAuth;
