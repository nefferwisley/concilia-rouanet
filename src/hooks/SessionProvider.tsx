import { createContext, type ReactNode, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabaseClient";

export type SessionState = {
  session: Session | null;
  loading: boolean;
};

export const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let stateVersion = 0;
    const initialStateVersion = stateVersion;

    void supabase.auth.getSession()
      .then(({ data }) => {
        if (active && stateVersion === initialStateVersion) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active && stateVersion === initialStateVersion) {
          setSession(null);
          setLoading(false);
        }
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        stateVersion += 1;
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, loading }), [loading, session]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
