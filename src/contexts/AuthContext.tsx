import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
      setUser(currentSession?.user ?? null);

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
        log('authStateChange', { event, userId: newSession?.user?.id });
        setSession(newSession);
        setUser(newSession?.user ?? null);

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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
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
