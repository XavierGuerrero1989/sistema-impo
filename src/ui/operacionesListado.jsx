import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal } from "../offline/operacionesRepo";
import "./operacionesListado.css";
import { useNavigate } from "react-router-dom";

const ESTADOS = [
  "CREADA",
  "EN_TRANSITO",
  "EN_CHILE",
  "DOCS_PENDIENTES",
  "PAGOS_PENDIENTES",
  "FINALIZADA",
];

export default function OperacionesListado() {
  const [operaciones, setOperaciones] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("ALL");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getOperacionesLocal().then(setOperaciones).catch(console.error);
  }, []);

  const operacionesFiltradas = useMemo(() => {
    return operaciones.filter((op) => {
      const matchEstado =
        estadoFiltro === "ALL" || op.estado === estadoFiltro;

      const q = search.toLowerCase();
      const matchSearch =
        op.id.toLowerCase().includes(q) ||
        op.proveedor.toLowerCase().includes(q) ||
        op.activo.toLowerCase().includes(q);

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

        <button
          className="btn-primary"
          onClick={() => navigate("/operaciones/nueva")}
        >
          + Nueva operación
        </button>
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
              const adelantos = (op.adelantos || []).filter(
                (a) => a.estado === "ACTIVO"
              );
              const pagos = (op.pagos || []).filter(
                (p) => p.estado === "ACTIVO"
              );

              const totalPagado = [...adelantos, ...pagos].reduce(
                (acc, m) => acc + Number(m.monto || 0),
                0
              );

              const total = Number(op.totalOperacion || 0);
              const saldo = Math.max(0, total - totalPagado);
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
                  <td>{op.proveedor}</td>
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
