import { useState } from "react";
import { useAuth } from "./AuthContext";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Loader from "../ui/Loader";
import "./Login.css";

export default function Login() {
  const { auth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setMessage("");
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

  async function handlePasswordReset(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Ingresá tu correo electrónico.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setMessage(
        "Si el correo está registrado, vas a recibir un enlace para crear una nueva contraseña."
      );
    } catch (resetError) {
      if (resetError.code === "auth/invalid-email") {
        setError("El correo electrónico no es válido.");
      } else if (resetError.code === "auth/too-many-requests") {
        setError("Se hicieron demasiados intentos. Esperá unos minutos y volvé a probar.");
      } else {
        setMessage(
          "Si el correo está registrado, vas a recibir un enlace para crear una nueva contraseña."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {loading && <Loader text={recovering ? "Enviando enlace..." : "Ingresando al sistema..."} />}

      <div className="login-page">
        <form className="login-box" onSubmit={recovering ? handlePasswordReset : handleLogin}>
          <div className="login-brand"><span>SI</span><div><b>SISTEMA</b><em>IMPO</em></div></div>
          <span className="login-kicker">Centro de control</span>
          <h2>{recovering ? "Recuperá tu acceso" : "Bienvenido de nuevo"}</h2>
          <p>
            {recovering
              ? "Ingresá tu correo y te enviaremos un enlace para crear una nueva contraseña."
              : "Ingresá para continuar gestionando tus importaciones."}
          </p>

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {!recovering && (
            <>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="forgot-password"
                onClick={() => {
                  setRecovering(true);
                  setError("");
                  setMessage("");
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </>
          )}

          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-success">✓ {message}</div>}

          <button type="submit" disabled={loading}>
            {recovering ? "Enviar enlace de recuperación →" : "Ingresar al sistema →"}
          </button>

          {recovering && (
            <button
              type="button"
              className="back-to-login"
              onClick={() => {
                setRecovering(false);
                setError("");
                setMessage("");
              }}
            >
              ← Volver al inicio de sesión
            </button>
          )}
        </form>
      </div>
    </>
  );
}
