import { useState } from "react";
import { useAuth } from "./AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import Loader from "../ui/Loader";
import "./Login.css";

export default function Login() {
  const { auth } = useAuth();
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
      // al loguear OK, App.jsx va a redirigir
    } catch (err) {
      console.error("LOGIN ERROR:", err.code, err.message);
      setError("Usuario o contraseña incorrectos");
      setLoading(false);
    }
  }

  return (
    <>
      {loading && <Loader text="Ingresando al sistema..." />}

      <div className="login-page">
        <form className="login-box" onSubmit={handleLogin}>
          <h2>Ingreso al sistema</h2>

          <input
            type="email"
            placeholder="Email"
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
            Ingresar
          </button>
        </form>
      </div>
    </>
  );
}
