import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout, BOOTSTRAP_TIMEOUT_MS } from "@/lib/withTimeout";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV = import.meta.env.DEV;
const log = (msg: string, data?: unknown) => {
  if (DEV) console.log(`[AUTH] ${msg}`, data ?? '');
};
const logError = (msg: string, error?: unknown) => {
  if (DEV) console.error(`[AUTH ERROR] ${msg}`, error ?? '');
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track current user ID to avoid unnecessary state updates on TOKEN_REFRESHED
  const currentUserIdRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string): Promise<void> => {
    log('fetchProfile start', { userId });
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        logError('fetchProfile query error', error);
        return;
      }

      if (data) {
        setProfile(data);
        log('fetchProfile success', { id: data.id });
      } else {
        log('fetchProfile: no profile found');
      }
    } catch (err) {
      logError('fetchProfile exception', err);
    }
  };

  const bootstrap = useCallback(async () => {
    log('bootstrap start');
    setLoading(true);

    try {
      log('getSession start');
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      log('getSession end', { hasSession: !!currentSession, error: sessionError?.message });

      if (sessionError) {
        logError('getSession error', sessionError);
        setLoading(false);
        return;
      }

      setSession(currentSession);
      const newUser = currentSession?.user ?? null;
      setUser(newUser);
      currentUserIdRef.current = newUser?.id ?? null;

      if (currentSession?.user) {
        // Fire and forget - don't block bootstrap on profile fetch
        fetchProfile(currentSession.user.id).catch((err) => {
          logError('fetchProfile failed (non-blocking)', err);
        });
      }

      log('bootstrap complete');
    } catch (err) {
      logError('bootstrap exception', err);
    } finally {
      setLoading(false);
      log('bootstrap finally - loading set to false');
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    log('Setting up auth state listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        const newUserId = newSession?.user?.id ?? null;
        log('authStateChange', { event, userId: newUserId });
        
        // Always update session (contains fresh tokens)
        setSession(newSession);
        
        // For TOKEN_REFRESHED: skip setUser if same user ID to avoid
        // downstream re-renders that cascade through TenantContext and
        // WorkspaceRouteGuard, which can unmount open modals/wizards.
        if (event === 'TOKEN_REFRESHED' && newUserId === currentUserIdRef.current) {
          log('TOKEN_REFRESHED for same user, skipping setUser to prevent cascade');
          return;
        }
        
        // Real identity change — update user state
        setUser(newSession?.user ?? null);
        currentUserIdRef.current = newUserId;

        if (newSession?.user) {
          // Fire and forget profile fetch
          setTimeout(() => {
            fetchProfile(newSession.user.id).catch((err) => {
              logError('fetchProfile from authStateChange failed', err);
            });
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Then bootstrap
    bootstrap();

    return () => {
      log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [bootstrap]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    log('signIn start');
    try {
      const { error } = await withTimeout(
        () => supabase.auth.signInWithPassword({ email, password }),
        BOOTSTRAP_TIMEOUT_MS,
        'Sign in'
      );
      log('signIn complete', { hasError: !!error });
      return { error: error as Error | null };
    } catch (err) {
      logError('signIn timeout or exception', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    log('signOut start - clearing state immediately');
    
    // Clear state immediately (optimistic UI)
    setUser(null);
    setSession(null);
    setProfile(null);
    currentUserIdRef.current = null;

    try {
      if (window.location.pathname !== "/auth") {
        window.history.replaceState(null, "", "/auth");
      }
    } catch {
      // no-op
    }

    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timed out')), 5000)
        )
      ]);
      log('signOut global success');
    } catch (err) {
      logError('signOut global failed, using local fallback', err);
      try {
        await supabase.auth.signOut({ scope: 'local' });
        log('signOut local fallback success');
      } catch (localErr) {
        logError('signOut local fallback also failed', localErr);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
