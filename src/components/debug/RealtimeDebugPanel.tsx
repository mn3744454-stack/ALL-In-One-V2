import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";

/**
 * DEV-only floating debug panel for proving realtime delivery.
 * Mount with: {import.meta.env.DEV && <RealtimeDebugPanel />}
 */
export function RealtimeDebugPanel() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const addLog = (msg: string) =>
    setLog((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()} ${msg}`]);

  const createTestNotification = async () => {
    if (!user?.id) return addLog("❌ No user");
    const { error } = await supabase.from("notifications" as any).insert({
      user_id: user.id,
      tenant_id: activeTenant?.tenant_id || null,
      event_type: "debug.test",
      title: "Test notification",
      body: "Created by debug panel",
      is_read: false,
    });
    addLog(error ? `❌ ${error.message}` : "✅ Notification inserted");
  };

  const createTestLabMessage = async () => {
    if (!user?.id || !requestId) return addLog("❌ No user or requestId");
    const { error } = await supabase.from("lab_request_messages").insert({
      request_id: requestId,
      sender_user_id: user.id,
      sender_tenant_id: activeTenant?.tenant_id || null,
      body: `[DEBUG] Test message at ${new Date().toLocaleTimeString()}`,
    });
    addLog(error ? `❌ ${error.message}` : "✅ Lab message inserted");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 bg-popover border border-border rounded-lg shadow-xl text-xs font-mono">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left text-muted-foreground hover:text-foreground"
      >
        <Bug className="h-3.5 w-3.5" />
        <span className="flex-1">Realtime Debug</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          <div className="text-muted-foreground space-y-0.5">
            <div>User: <span className="text-foreground">{user?.id?.slice(0, 8) ?? "–"}</span></div>
            <div>Tenant: <span className="text-foreground">{activeTenant?.tenant_id?.slice(0, 8) ?? "–"}</span></div>
            {requestId && <div>RequestId: <span className="text-foreground">{requestId.slice(0, 8)}</span></div>}
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={createTestNotification}
              className="flex-1 px-2 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
            >
              Test Notification
            </button>
            <button
              onClick={createTestLabMessage}
              disabled={!requestId}
              className="flex-1 px-2 py-1.5 rounded bg-secondary text-secondary-foreground hover:opacity-90 disabled:opacity-40"
            >
              Test Lab Msg
            </button>
          </div>

          {log.length > 0 && (
            <div className="max-h-32 overflow-y-auto bg-muted rounded p-1.5 space-y-0.5">
              {log.map((l, i) => (
                <div key={i} className="text-[10px] text-muted-foreground">{l}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
