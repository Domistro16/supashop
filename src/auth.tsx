import { supabase } from "./supabaseClient";
import { useEffect, useState, createContext, useContext } from "react";

const AuthContext = createContext({
  user: null,
  session: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);
  const value = {
    session,
    user: session?.user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading ? children : `<div>Loading...</div>`}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
