import { useCallback, useEffect, useState } from "react";
import {
  getOperacionesEliminadasLocal,
  restaurarOperacionLocal,
} from "../offline/operacionesRepo";
import "./operacionesListado.css";

export default function Papelera() {
  const [operaciones, setOperaciones] = useState([]);
  const [restaurando, setRestaurando] = useState(null);

  const load = useCallback(async () => {
    setOperaciones(await getOperacionesEliminadasLocal());
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("data:changed", load);
    return () => window.removeEventListener("data:changed", load);
  }, [load]);

  const restaurar = async (id) => {
    setRestaurando(id);
    try {
      await restaurarOperacionLocal(id);
      await load();
    } finally {
      setRestaurando(null);
    }
  };

  return (
    <section className="operaciones-listado-page">
      <header className="listado-header">
        <div>
          <h1>Papelera</h1>
          <p>Operaciones eliminadas que todavía pueden recuperarse</p>
        </div>
      </header>

      <div className="tabla-wrapper">
        <table className="operaciones-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Proveedor</th>
              <th>Mercadería</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {operaciones.length === 0 && (
              <tr><td colSpan="4" className="empty">La papelera está vacía</td></tr>
            )}
            {operaciones.map((op) => (
              <tr key={op.id}>
                <td className="mono">{op.id}</td>
                <td>{op.proveedorNombre || op.proveedor || "-"}</td>
                <td>{op.activo || "-"}</td>
                <td>
                  <button
                    className="btn-ver"
                    disabled={restaurando === op.id}
                    onClick={() => restaurar(op.id)}
                  >
                    {restaurando === op.id ? "Restaurando…" : "Restaurar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
