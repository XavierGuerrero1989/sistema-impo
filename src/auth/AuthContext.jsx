import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { selectLocalDatabase } from "../offline/db";
import { loadUserProfile } from "./userProfile";
import { isPrimaryAdmin, permissionsFor, ROLES } from "./roles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      try {
        await selectLocalDatabase(firebaseUser?.uid);
        const nextProfile = await loadUserProfile(firebaseUser);
        if (firebaseUser && nextProfile?.activo === false) {
          await signOut(auth);
          setProfile(null);
          return;
        }
        setProfile(nextProfile);
      } catch (error) {
        console.error("No se pudo cargar el perfil del usuario:", error);
        setProfile(firebaseUser ? {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: isPrimaryAdmin(firebaseUser.email) ? ROLES.ADMIN : ROLES.LECTURA,
        } : null);
      } finally {
        setLoading(false);
      }
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
