import { useState } from "react";
import { useAuth } from "./AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Loader from "../ui/Loader";
import "./Login.css";

export default function Login() {
  const { auth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // ✅ LOGIN OK → IR AL DASHBOARD
      setLoading(false);
      navigate("/", { replace: true });

    } catch {
      setError("Usuario o contraseña incorrectos");
      setLoading(false);
    }
  }

  return (
    <>
      {loading && <Loader text="Ingresando al sistema..." />}

      <div className="login-page">
        <form className="login-box" onSubmit={handleLogin}>
          <div className="login-brand"><span>SI</span><div><b>SISTEMA</b><em>IMPO</em></div></div>
          <span className="login-kicker">Centro de control</span>
          <h2>Bienvenido de nuevo</h2>
          <p>Ingresá para continuar gestionando tus importaciones.</p>

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="login-error">{error}</div>}

          <button type="submit" disabled={loading}>
            Ingresar al sistema →
          </button>
        </form>
      </div>
    </>
  );
}
