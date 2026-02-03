import { Routes, Route } from "react-router-dom";
import Navbar from "../ui/Navbar";
import OperacionesApp from "../operacionesApp";
import OperacionesListado from "../ui/operacionesListado";
import OperacionDetalle from "../ui/operacionesDetalle";
import Finanzas from "../ui/Finanzas";
import Documentos from "../ui/Documentos";
import Logistica from "../ui/Logistica";
import CrearOperacion from "../ui/CrearOperacion";
import { useAutoSync } from "../hooks/useAutoSync";



function App() {
  useAutoSync(); // 🔥 ACÁ

  return (
    <div className="app-layout">
      <Navbar userEmail="ariel@ptm.cl" />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<OperacionesApp />} />
          <Route path="/operaciones" element={<OperacionesListado />} />
          <Route path="/operaciones/:id" element={<OperacionDetalle />} />
          <Route path="/finanzas" element={<Finanzas />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/logistica" element={<Logistica />} />
          <Route path="/operaciones/nueva" element={<CrearOperacion />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
