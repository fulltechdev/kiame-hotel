import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_CHECK_TIMEOUT_MS = 5000;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function checkAdminRole(userId: string, onResult: (isAdmin: boolean) => void) {
  let settled = false;
  const settle = (admin: boolean) => {
    if (settled) return;
    settled = true;
    onResult(admin);
  };
  const timeoutId = setTimeout(() => settle(false), ADMIN_CHECK_TIMEOUT_MS);
  void Promise.resolve(
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
  ).then(
    ({ data }) => settle(!!data),
    () => settle(false)
  ).then(() => clearTimeout(timeoutId));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (!newSession?.user) {
          setLoading(false);
          setIsAdmin(false);
        } else {
          checkAdminRole(newSession.user.id, (admin) => {
            setIsAdmin(admin);
            setLoading(false);
          });
        }
      }
    );

    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (cancelled) return;
      setSession(initialSession);
      if (!initialSession?.user) {
        setLoading(false);
        setIsAdmin(false);
      } else {
        checkAdminRole(initialSession.user.id, (admin) => {
          setIsAdmin(admin);
          if (!cancelled) setLoading(false);
        });
      }
    });

    const forceStopLoading = setTimeout(() => {
      setLoading((prev) => (prev ? false : prev));
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(forceStopLoading);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
