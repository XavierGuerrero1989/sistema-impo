import "./Navbar.css";
import { useAuth } from "../auth/AuthContext";
import { NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, profile, permissions, logout } = useAuth();

  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // eventos custom desde useAutoSync
    const onSyncStart = () => {
      setSyncing(true);
      setSyncError("");
    };
    const onSyncEnd = () => setSyncing(false);
    const onSyncError = (event) => setSyncError(event.detail?.message || "Error de sincronización");

    window.addEventListener("sync:start", onSyncStart);
    window.addEventListener("sync:end", onSyncEnd);
    window.addEventListener("sync:error", onSyncError);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("sync:start", onSyncStart);
      window.removeEventListener("sync:end", onSyncEnd);
      window.removeEventListener("sync:error", onSyncError);
    };
  }, []);

  const syncLabel = syncError
    ? "Error de sincronización"
    : !online
    ? "Offline"
    : syncing
    ? "Sincronizando"
    : "Conectado";

  const syncClass = syncError
    ? "sync-status offline"
    : !online
    ? "sync-status offline"
    : syncing
    ? "sync-status syncing"
    : "sync-status online";

  return (
    <nav className="navbar">
      <div className="navbar-left">

        <Link to="/" className="navbar-brand">
          SISTEMA-IMPO
        </Link>

        <NavLink
          to="/operaciones"
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Operaciones
        </NavLink>

        {permissions.manageUsers && (
          <NavLink
            to="/usuarios"
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
          >
            Usuarios
          </NavLink>
        )}

        {/* NUEVA SECCIÓN */}
        <NavLink
          to="/proveedores"
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Proveedores
        </NavLink>

        <NavLink
          to="/documentos"
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Documentos
        </NavLink>

        <NavLink
          to="/finanzas"
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Finanzas
        </NavLink>

        <NavLink
          to="/logistica"
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Logística
        </NavLink>

        <NavLink
          to="/papelera"
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Papelera
        </NavLink>

        <NavLink
          to="/historial"
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Historial
        </NavLink>

      </div>

      <div className="navbar-right">

        <div className={syncClass} title={syncError || undefined}>
          <span className="dot" />
          {syncLabel}
        </div>

        <span className="navbar-user">
          {user?.email} · {profile?.role || "lectura"}
        </span>

        <button className="logout-btn" onClick={logout}>
          Salir
        </button>

      </div>
    </nav>
  );
}
