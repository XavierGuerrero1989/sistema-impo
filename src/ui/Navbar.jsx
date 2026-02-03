import "./Navbar.css";
import { useAuth } from "../auth/AuthContext";
import { NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();

  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // eventos custom desde useAutoSync
    const onSyncStart = () => setSyncing(true);
    const onSyncEnd = () => setSyncing(false);

    window.addEventListener("sync:start", onSyncStart);
    window.addEventListener("sync:end", onSyncEnd);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("sync:start", onSyncStart);
      window.removeEventListener("sync:end", onSyncEnd);
    };
  }, []);

  const syncLabel = !online
    ? "Offline"
    : syncing
    ? "Sincronizando"
    : "Conectado";

  const syncClass = !online
    ? "sync-status offline"
    : syncing
    ? "sync-status syncing"
    : "sync-status online";

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {/* 🔗 BRAND → DASHBOARD */}
        <Link to="/" className="navbar-brand">
          ImportSys
        </Link>

        <NavLink to="/operaciones" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Operaciones
        </NavLink>

        <NavLink to="/documentos" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Documentos
        </NavLink>

        <NavLink to="/finanzas" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Finanzas
        </NavLink>

        <NavLink to="/logistica" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Logística
        </NavLink>
      </div>

      <div className="navbar-right">
        {/* 🔄 SYNC STATUS */}
        <div className={syncClass}>
          <span className="dot" />
          {syncLabel}
        </div>

        <span className="navbar-user">{user?.email}</span>

        <button className="logout-btn" onClick={logout}>
          Salir
        </button>
      </div>
    </nav>
  );
}
