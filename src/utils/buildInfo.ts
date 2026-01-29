/**
 * Build Information Utility
 * Used to diagnose caching issues by showing build stamp and Supabase fingerprint
 */

// IMPORTANT: Update this timestamp when making changes to diagnose cache issues
export const BUILD_ID = "2026-01-29T14:30:00Z";

export function getBuildInfo() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  
  // Extract host from Supabase URL
  let supabaseUrlHost = "unknown";
  try {
    supabaseUrlHost = new URL(supabaseUrl).host;
  } catch {
    supabaseUrlHost = "invalid-url";
  }
  
  // Create fingerprint: first 6 chars + "..." + last 4 chars
  const anonKeyFingerprint = anonKey.length > 10 
    ? `${anonKey.slice(0, 6)}...${anonKey.slice(-4)}`
    : "key-too-short";
  
  return {
    buildId: BUILD_ID,
    supabaseUrlHost,
    anonKeyFingerprint,
  };
}

export function getBuildStampText(): string {
  const info = getBuildInfo();
  return `Build: ${info.buildId} | DB: ${info.supabaseUrlHost} | Key: ${info.anonKeyFingerprint}`;
}
