import "./KPIs.css";
import { calcularFinanzas } from "../domain/operacion";

export default function KPIs({ operaciones }) {

  /* =========================
     Operaciones activas
  ========================== */

  const activas = operaciones.filter(
    (op) => !op.deleted && op.estado !== "FINALIZADA"
  ).length;

  /* =========================
     En tránsito
  ========================== */

  const enTransito = operaciones.filter(
    (op) => op.estado === "EN_TRANSITO"
  ).length;

  /* =========================
     Docs pendientes
  ========================== */
  const docsPendientes = operaciones.filter((op) => {

  const documentos = Array.isArray(op.documentos)
    ? op.documentos
    : [];

  return documentos.some(
    (d) => d.estado === "PENDIENTE"
  );

}).length;

  /* =========================
     Pagos pendientes
  ========================== */

  const pagosPendientes = operaciones.filter((op) => {

    if (op.estado === "FINALIZADA") return false;

    return calcularFinanzas(op).saldo > 0;

  }).length;

  return (
    <div className="kpi-grid">
      <KpiCard title="Operaciones activas" value={activas} />
      <KpiCard title="En tránsito" value={enTransito} />
      <KpiCard title="Docs pendientes" value={docsPendientes} alert />
      <KpiCard title="Pagos pendientes" value={pagosPendientes} alert />
    </div>
  );
}

function KpiCard({ title, value, alert }) {
  return (
    <div className={`kpi-card ${alert ? "alert" : ""}`}>
      <span className="kpi-title">{title}</span>
      <span className="kpi-value">{value}</span>
    </div>
  );
}
