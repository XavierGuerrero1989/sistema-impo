import { useCallback, useEffect, useState } from "react";
import {
  deleteOperacionPermanenteLocal,
  getOperacionesEliminadasLocal,
  restaurarOperacionLocal,
} from "../offline/operacionesRepo";
import { deleteOperacionPermanenteFirestore } from "../services/operacionesServices";
import { useAuth } from "../auth/AuthContext";
import { confirmAction, requestExactValue } from "./sweetAlerts";
import "./operacionesListado.css";
import { referenciaOperacion } from "../domain/operacion";

export default function Papelera() {
  const [operaciones, setOperaciones] = useState([]);
  const [restaurando, setRestaurando] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const { user } = useAuth();

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

  const eliminarDefinitivamente = async (operacion) => {
    const primeraConfirmacion = await confirmAction({
      icon: "warning",
      title: "Eliminar operación definitivamente",
      text: `Se eliminará la operación ${referenciaOperacion(operacion)} y todos sus archivos de Firebase. Esta acción no se puede deshacer.`,
      confirmText: "Continuar",
      danger: true,
    });
    if (!primeraConfirmacion) return;

    const confirmacionId = await requestExactValue({
      title: "Confirmación final",
      text: `Escribí el ID ${operacion.id} para confirmar la eliminación.`,
      expectedValue: operacion.id,
    });
    if (!confirmacionId) return;

    setEliminando(operacion.id);
    try {
      await deleteOperacionPermanenteFirestore(user, operacion);
      await deleteOperacionPermanenteLocal(operacion.id);
      await load();
    } catch (error) {
      console.error(error);
      alert("No se pudo completar la eliminación definitiva. La operación permanece en la papelera.");
    } finally {
      setEliminando(null);
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
              <th>Referencia</th>
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
                <td><strong className="mono">{referenciaOperacion(op)}</strong><small className="operation-internal-id">ID: {op.id}</small></td>
                <td>{op.proveedorNombre || op.proveedor || "-"}</td>
                <td>{op.activo || "-"}</td>
                <td>
                  <div className="operation-shortcuts">
                    <button
                      className="btn-ver"
                      disabled={restaurando === op.id || eliminando === op.id}
                      onClick={() => restaurar(op.id)}
                    >
                      {restaurando === op.id ? "Restaurando…" : "Restaurar"}
                    </button>
                    <button
                      className="btn-ver danger"
                      disabled={restaurando === op.id || eliminando === op.id}
                      onClick={() => eliminarDefinitivamente(op)}
                    >
                      {eliminando === op.id ? "Eliminando…" : "Eliminar definitivamente"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
