import { useAuth } from "../auth/AuthContext";
import Login from "../auth/Login";
import { useAutoSync } from "../hooks/useAutoSync";
import OperacionesApp from "../OperacionesApp"; // lo sacamos a otro archivo

export default function App() {
  const { user, loading } = useAuth();

  useAutoSync();

  if (loading) return <p>Cargando...</p>;

  if (!user) return <Login />;

  return <OperacionesApp />;
}
