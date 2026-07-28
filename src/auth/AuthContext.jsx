import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { selectLocalDatabase } from "../offline/db";
import { loadUserProfile } from "./userProfile";
import { permissionsFor } from "./roles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      await selectLocalDatabase(firebaseUser?.uid);
      const nextProfile = await loadUserProfile(firebaseUser);
      setUser(firebaseUser);
      setProfile(nextProfile);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      permissions: permissionsFor(profile?.role),
      auth,
      logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// El hook comparte el contexto por diseño; no es un componente de Fast Refresh.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
