import { useAuth } from "../auth/AuthContext";
import "./Header.css";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-left">
        Sistema de Importaciones
      </div>

      <div className="header-right">
        <span className="user-email">{user?.email}</span>
        <button onClick={logout}>Salir</button>
      </div>
    </header>
  );
}
