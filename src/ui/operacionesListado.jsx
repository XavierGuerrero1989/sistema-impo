import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal } from "../offline/operacionesRepo";
import "./operacionesListado.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { calcularFinanzas, ESTADOS_OPERACION } from "../domain/operacion";

const ESTADOS = ESTADOS_OPERACION;

export default function OperacionesListado() {
  const [operaciones, setOperaciones] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("ALL");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { permissions } = useAuth();

  useEffect(() => {
    const load = () => getOperacionesLocal().then(setOperaciones).catch(console.error);
    load();
    window.addEventListener("data:changed", load);
    return () => window.removeEventListener("data:changed", load);
  }, []);

  const operacionesFiltradas = useMemo(() => {
    return operaciones.filter((op) => {
      const matchEstado =
        estadoFiltro === "ALL" || op.estado === estadoFiltro;

      const q = search.toLowerCase();
      const matchSearch =
        String(op.id || "").toLowerCase().includes(q) ||
        String(op.proveedorNombre || op.proveedor || "").toLowerCase().includes(q) ||
        String(op.activo || "").toLowerCase().includes(q);

      return matchEstado && matchSearch;
    });
  }, [operaciones, estadoFiltro, search]);

  const money = (n, moneda = "USD") =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  return (
    <section className="operaciones-listado-page">
      <header className="listado-header">
        <div>
          <h1>Operaciones</h1>
          <p>Listado completo y gestión de operaciones de importación</p>
        </div>

        {permissions.manageOperations && (
          <button
            className="btn-primary"
            onClick={() => navigate("/operaciones/nueva")}
          >
            + Nueva operación
          </button>
        )}
      </header>

      {/* Filtros */}
      <div className="filtros-bar">
        <input
          type="text"
          placeholder="Buscar por ID, proveedor o activo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
        >
          <option value="ALL">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="tabla-wrapper">
        <table className="operaciones-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Proveedor</th>
              <th>Activo</th>
              <th>Estado</th>
              <th>Finanzas</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {operacionesFiltradas.length === 0 && (
              <tr>
                <td colSpan="6" className="empty">
                  No hay operaciones para mostrar
                </td>
              </tr>
            )}

            {operacionesFiltradas.map((op) => {
              const adelantos = (op.adelantos || []).filter((a) => a.estado === "ACTIVO");
              const { total, pagado: totalPagado, saldo } = calcularFinanzas(op);
              const moneda = op.moneda || "USD";

              const estadoPago =
                totalPagado === 0
                  ? "pendiente"
                  : saldo === 0
                  ? "ok"
                  : "parcial";

              return (
                <tr key={op.id}>
                  <td className="mono">{op.id}</td>
                  <td>{op.proveedorNombre}</td>
                  <td>{op.activo}</td>

                  <td>
                    <span className={`estado-badge ${op.estado.toLowerCase()}`}>
                      {op.estado.replace("_", " ")}
                    </span>
                  </td>

                  <td>
                    <div className="finanzas-mini">
                      <span className={`pago-badge ${estadoPago}`}>
                        {adelantos.length > 0
                          ? "Adelanto OK"
                          : "Sin adelanto"}
                      </span>
                      <small>
                        {money(totalPagado, moneda)} /{" "}
                        {money(total, moneda)}
                      </small>
                      <small className="saldo">
                        Saldo: {money(saldo, moneda)}
                      </small>
                    </div>
                  </td>

                  <td>
                    <button
                      className="btn-ver"
                      onClick={() =>
                        navigate(`/operaciones/${op.id}`)
                      }
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
