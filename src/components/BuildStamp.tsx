import { getBuildInfo } from "@/utils/buildInfo";

interface BuildStampProps {
  className?: string;
}

/**
 * Displays build information for diagnosing cache issues
 * Shows: Build ID, Supabase host, and anonymized API key fingerprint
 */
export const BuildStamp = ({ className = "" }: BuildStampProps) => {
  // Only render in development
  if (!import.meta.env.DEV) return null;
  
  const info = getBuildInfo();
  
  return (
    <div className={`text-[10px] text-muted-foreground/60 font-mono ${className}`}>
      <span>Build: {info.buildId}</span>
      <span className="mx-2">|</span>
      <span>DB: {info.supabaseUrlHost}</span>
      <span className="mx-2">|</span>
      <span>Key: {info.anonKeyFingerprint}</span>
    </div>
  );
};
