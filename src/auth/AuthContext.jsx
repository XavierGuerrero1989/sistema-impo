import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { selectLocalDatabase } from "../offline/db";
import { loadUserProfile } from "./userProfile";
import { isPrimaryAdmin, isSystemOwner, permissionsFor, ROLES } from "./roles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [accessBlocked, setAccessBlocked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          await selectLocalDatabase(undefined);
          return;
        }

        const accessSnapshot = await getDoc(doc(db, "configuracion", "acceso"));
        const systemSuspended = accessSnapshot.exists()
          && accessSnapshot.data()?.suspendido === true;

        if (systemSuspended && !isSystemOwner(firebaseUser.email)) {
          setAccessBlocked(true);
          setUser(null);
          setProfile(null);
          await signOut(auth);
          return;
        }

        setAccessBlocked(false);
        setUser(firebaseUser);
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
        if (firebaseUser && !isSystemOwner(firebaseUser.email)) {
          setAccessBlocked(true);
          setUser(null);
          setProfile(null);
          await signOut(auth).catch(() => {});
          return;
        }
        setUser(firebaseUser);
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

  useEffect(() => {
    if (!user || isSystemOwner(user.email)) return undefined;

    return onSnapshot(doc(db, "configuracion", "acceso"), (snapshot) => {
      if (snapshot.exists() && snapshot.data()?.suspendido === true) {
        setAccessBlocked(true);
        setUser(null);
        setProfile(null);
        signOut(auth).catch(console.error);
      }
    }, (error) => {
      console.error("No se pudo verificar el estado general de acceso:", error);
    });
  }, [user]);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      permissions: permissionsFor(profile?.role),
      accessBlocked,
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
