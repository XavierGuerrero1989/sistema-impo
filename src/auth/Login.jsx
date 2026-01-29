import { useState } from "react";
import { useAuth } from "./AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const { auth } = useAuth(); // ← ESTE es el auth bueno
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("LOGIN ERROR:", err.code, err.message);
      setError(err.code);
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.box}>
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

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit">Ingresar</button>
      </form>
    </div>
  );
}


const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f5f5",
  },
  box: {
    background: "white",
    padding: 32,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 280,
  },
};
