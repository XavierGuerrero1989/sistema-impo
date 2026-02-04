import { Routes, Route } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

import Navbar from "../ui/Navbar";
import Login from "../auth/Login";
import ProtectedRoute from "../auth/ProtectedRoute";

import OperacionesApp from "../operacionesApp";
import OperacionesListado from "../ui/operacionesListado";
import OperacionDetalle from "../ui/operacionesDetalle";
import Finanzas from "../ui/finanzas";
import Documentos from "../ui/documentos";
import Logistica from "../ui/logistica";
import CrearOperacion from "../ui/CrearOperacion";

import { useAutoSync } from "../hooks/useAutoSync";

function App() {
  const { user } = useAuth();

  // 🔐 Sync SOLO si hay usuario
  useAutoSync();

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />

      {/* PRIVATE */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="app-layout">
              <Navbar userEmail={user?.email} />

              <main className="main-content">
                <Routes>
                  <Route path="/" element={<OperacionesApp />} />
                  <Route path="/operaciones" element={<OperacionesListado />} />
                  <Route
                    path="/operaciones/nueva"
                    element={<CrearOperacion />}
                  />
                  <Route
                    path="/operaciones/:id"
                    element={<OperacionDetalle />}
                  />
                  <Route path="/finanzas" element={<Finanzas />} />
                  <Route path="/documentos" element={<Documentos />} />
                  <Route path="/logistica" element={<Logistica />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
