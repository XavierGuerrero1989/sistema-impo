import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal } from "../offline/operacionesRepo";
import "./finanzas.css";

export default function Finanzas() {
  const [operaciones, setOperaciones] = useState([]);

  useEffect(() => {
    getOperacionesLocal().then(setOperaciones).catch(console.error);
  }, []);

  /* =========================
     MÉTRICAS GLOBALES
  ========================== */
  const resumen = useMemo(() => {
    let total = 0;
    let cobrado = 0;
    let pendiente = 0;
    let conPendiente = 0;

    operaciones.forEach((op) => {
      const t = Number(op.totalOperacion || 0);
      const a = Number(op.adelantoMonto || 0);

      total += t;
      cobrado += a;
      pendiente += Math.max(0, t - a);

      if (t - a > 0) conPendiente++;
    });

    return { total, cobrado, pendiente, conPendiente };
  }, [operaciones]);

  const money = (n, moneda = "USD") =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  return (
    <section className="finanzas-page">
      {/* Header */}
      <header className="finanzas-header">
        <h1>Finanzas</h1>
        <p>Estado financiero de todas las operaciones</p>
      </header>

      {/* KPIs */}
      {/* KPIs */}
<div className="finanzas-kpis">
  <div className="kpi-card">
    <span>Total de operaciones</span>
    <strong>{money(resumen.total)}</strong>
  </div>

  <div className="kpi-card ok">
    <span>Adelantos pagados</span>
    <strong>{money(resumen.cobrado)}</strong>
  </div>

  <div className="kpi-card pendiente">
    <span>Saldo a pagar</span>
    <strong>{money(resumen.pendiente)}</strong>
  </div>

  <div className="kpi-card alerta">
    <span>Operaciones con saldo pendiente</span>
    <strong>{resumen.conPendiente}</strong>
  </div>
</div>



      {/* Tabla financiera */}
      <div className="finanzas-table-wrapper">
        <table className="finanzas-table">
          <thead>
            <tr>
              <th>Operación</th>
              <th>Proveedor</th>
              <th>Total</th>
              <th>Adelanto</th>
              <th>Saldo</th>
              <th>Progreso</th>
            </tr>
          </thead>

          <tbody>
            {operaciones.length === 0 && (
              <tr>
                <td colSpan="6" className="empty">
                  No hay datos financieros
                </td>
              </tr>
            )}

            {operaciones.map((op) => {
              const total = Number(op.totalOperacion || 0);
              const adelanto = Number(op.adelantoMonto || 0);
              const saldo = Math.max(0, total - adelanto);
              const progreso =
                total > 0 ? Math.min(100, (adelanto / total) * 100) : 0;

              return (
                <tr key={op.id}>
                  <td className="mono">{op.id}</td>
                  <td>{op.proveedor}</td>
                  <td>{money(total, op.moneda)}</td>
                  <td>{money(adelanto, op.moneda)}</td>
                  <td
                    className={
                      saldo === 0 ? "saldo-ok" : "saldo-pendiente"
                    }
                  >
                    {money(saldo, op.moneda)}
                  </td>
                  <td>
                    <div className="progress-mini">
                      <div
                        className="progress-fill"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                    <span className="progress-label">
                      {Math.round(progreso)}%
                    </span>
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
