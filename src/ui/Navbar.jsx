import "./Navbar.css";
import { useAuth } from "../auth/AuthContext";
import { NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/", label: "Inicio", icon: "⌂" },
  { to: "/operaciones", label: "Operaciones", icon: "▦" },
  { to: "/proveedores", label: "Proveedores", icon: "◆", permission: "viewDirectories" },
  { to: "/forwarders", label: "Forwarders", icon: "◈", permission: "viewDirectories" },
  { to: "/agentes-aduana", label: "Agentes de aduana", icon: "◇", permission: "viewDirectories" },
  { to: "/logistica", label: "Importaciones", icon: "→", permission: "viewLogistics" },
  { to: "/documentos", label: "Documentos", icon: "▤" },
  { to: "/finanzas", label: "Finanzas", icon: "$", permission: "viewFinances" },
  { to: "/historial", label: "Historial", icon: "↺" },
];

export default function Navbar() {
  const { user, profile, permissions, logout } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const onSyncStart = () => { setSyncing(true); setSyncError(""); };
    const onSyncEnd = () => setSyncing(false);
    const onSyncError = (event) => setSyncError(event.detail?.message || "Error de sincronización");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
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

  const syncLabel = syncError ? "Error de sincronización" : !online ? "Sin conexión" : syncing ? "Sincronizando" : "Todo sincronizado";
  const syncClass = syncError || !online ? "offline" : syncing ? "syncing" : "online";
  const initials = (user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <>
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setOpen((value) => !value)} aria-label="Abrir menú">☰</button>
        <div className="topbar-copy">
          <span className="topbar-eyebrow">Centro de control</span>
          <strong>Importaciones en movimiento</strong>
        </div>
        <div className={`sync-status ${syncClass}`} title={syncError || undefined}>
          <span className="dot" /> {syncLabel}
        </div>
      </header>

      <aside className={`navbar ${open ? "open" : ""}`}>
        <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">SI</span>
          <span><b>SISTEMA</b><em>IMPO</em></span>
        </Link>

        <div className="nav-section-label">Navegación</div>
        <nav className="navbar-links">
          {navItems.filter((item) => !item.permission || permissions[item.permission]).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={() => setOpen(false)}
              className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {permissions.manageUsers && (
          <>
            <div className="nav-section-label">Administración</div>
            <nav className="navbar-links">
              <NavLink to="/usuarios" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <span className="nav-icon">◎</span><span>Usuarios</span>
              </NavLink>
              <NavLink to="/papelera" className={({ isActive }) => isActive ? "nav-link active danger-link" : "nav-link danger-link"}>
                <span className="nav-icon">⌫</span><span>Papelera</span>
              </NavLink>
            </nav>
          </>
        )}

        <div className="navbar-user-card">
          <span className="user-avatar">{initials}</span>
          <span className="user-copy"><strong>{user?.email?.split("@")[0]}</strong><small>{profile?.role || "lectura"}</small></span>
          <button className="logout-btn" onClick={logout} title="Cerrar sesión">↪</button>
        </div>

        <footer className="sidebar-credit">
          <span>Desarrollado por</span>
          <a
            href="https://brainworks.vercel.app"
            target="_blank"
            rel="noreferrer"
            aria-label="Visitar el sitio web de Brainworks"
          >
            <span className="brainworks-mark">B</span>
            <strong>BRAINWORKS</strong>
            <span className="credit-arrow">↗</span>
          </a>
        </footer>
      </aside>
      {open && <button className="nav-backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
    </>
  );
}
