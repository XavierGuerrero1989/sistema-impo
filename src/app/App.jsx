import { Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";

import Navbar from "../ui/Navbar";
import Login from "../auth/Login";
import ProtectedRoute from "../auth/ProtectedRoute";
import AdminRoute from "../auth/AdminRoute";
import PermissionRoute from "../auth/PermissionRoute";
import Loader from "../ui/Loader";

import { useAutoSync } from "../hooks/useAutoSync";

import { listenProveedores } from "../sync/ListenProveedores";
import { listenOperaciones } from "../sync/ListenOperaciones";

const OperacionesApp = lazy(() => import("../operacionesApp"));
const OperacionesListado = lazy(() => import("../ui/operacionesListado"));
const OperacionDetalle = lazy(() => import("../ui/operacionesDetalle"));
const Finanzas = lazy(() => import("../ui/finanzas"));
const Documentos = lazy(() => import("../ui/documentos"));
const Logistica = lazy(() => import("../ui/logistica"));
const CrearOperacion = lazy(() => import("../ui/CrearOperacion"));
const Proveedores = lazy(() => import("../proveedores/Proveedores"));
const NuevoProveedor = lazy(() => import("../proveedores/NuevoProveedor"));
const ProveedorDetalle = lazy(() => import("../proveedores/ProveedorDetalle"));
const Papelera = lazy(() => import("../ui/Papelera"));
const Usuarios = lazy(() => import("../ui/Usuarios"));
const Historial = lazy(() => import("../ui/Historial"));

function App() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return undefined;

    const unsubscribe = listenProveedores((error) => {
      console.error("Error sincronizando proveedores:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    return listenOperaciones((error) => {
      console.error("Error sincronizando operaciones:", error);
      window.dispatchEvent(new CustomEvent("sync:error", {
        detail: { message: "No se pudieron recibir cambios de operaciones" },
      }));
    });
  }, [user]);

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
                <Suspense fallback={<Loader />}>
                  <Routes>
                  <Route path="/" element={<OperacionesApp />} />
                  <Route path="/operaciones" element={<OperacionesListado />} />
                  <Route
                    path="/operaciones/nueva"
                    element={
                      <PermissionRoute permission="manageOperations">
                        <CrearOperacion />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/operaciones/:id"
                    element={<OperacionDetalle />}
                  />
                  <Route path="/finanzas" element={<Finanzas />} />
                  <Route path="/documentos" element={<Documentos />} />
                  <Route path="/logistica" element={<Logistica />} />
                  <Route path="/proveedores" element={<Proveedores />} />
                  <Route
                    path="/proveedores/nuevo"
                    element={
                      <PermissionRoute permission="manageProviders">
                        <NuevoProveedor />
                      </PermissionRoute>
                    }
                  />
                  <Route path="/proveedores/:proveedorId" element={<ProveedorDetalle />} />
                  <Route
                    path="/papelera"
                    element={
                      <PermissionRoute permission="manageOperations">
                        <Papelera />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/usuarios"
                    element={<AdminRoute><Usuarios /></AdminRoute>}
                  />
                  <Route path="/historial" element={<Historial />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
