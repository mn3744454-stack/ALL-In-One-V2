/**
 * Debug utility for troubleshooting
 * Enable by: localStorage.setItem("debug", "1")
 * Disable by: localStorage.removeItem("debug")
 */

// Exported so it can be reused elsewhere
export const isDebugEnabled = (): boolean => {
  try {
    return localStorage.getItem("debug") === "1";
  } catch {
    return false;
  }
};

// Sanitize sensitive data including IDs, phone, email, address
const sanitize = (data: Record<string, unknown>): Record<string, unknown> => {
  const sensitiveKeys = [
    "phone", "email", "address",
    "id", "user_id", "owner_id", "tenant_id", "sender_id", "invitee_id"
  ];
  const sanitized = { ...data };
  
  for (const key of sensitiveKeys) {
    if (key in sanitized && sanitized[key]) {
      const value = String(sanitized[key]);
      // Show first 8 chars for IDs (UUIDs), first 2 for other sensitive data
      const showChars = key.includes("id") || key === "id" ? 8 : 2;
      sanitized[key] = value.length > showChars 
        ? `${value.slice(0, showChars)}...[REDACTED]` 
        : "[REDACTED]";
    }
  }
  return sanitized;
};

export const debugLog = (label: string, data?: unknown) => {
  if (!isDebugEnabled()) return;
  
  if (data && typeof data === "object" && data !== null) {
    console.log(`[DEBUG] ${label}:`, sanitize(data as Record<string, unknown>));
  } else {
    console.log(`[DEBUG] ${label}`, data !== undefined ? data : "");
  }
};

export const debugError = (label: string, error?: unknown) => {
  if (!isDebugEnabled()) return;
  console.error(`[DEBUG ERROR] ${label}:`, error);
};
