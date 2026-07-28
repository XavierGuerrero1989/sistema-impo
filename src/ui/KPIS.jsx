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
      <KpiCard title="Operaciones activas" value={activas} icon="▦" tone="blue" caption="En seguimiento" />
      <KpiCard title="En tránsito" value={enTransito} icon="→" tone="cyan" caption="Moviéndose ahora" />
      <KpiCard title="Docs pendientes" value={docsPendientes} icon="▤" tone="amber" caption="Requieren revisión" />
      <KpiCard title="Pagos pendientes" value={pagosPendientes} icon="$" tone="violet" caption="Con saldo abierto" />
    </div>
  );
}

function KpiCard({ title, value, icon, tone, caption }) {
  return (
    <div className={`kpi-card ${tone}`}>
      <span className="kpi-icon">{icon}</span>
      <div><span className="kpi-title">{title}</span><span className="kpi-value">{value}</span><small>{caption}</small></div>
    </div>
  );
}
