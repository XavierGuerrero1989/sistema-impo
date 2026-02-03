import "./KPIs.css";

export default function KPIs({ operaciones }) {
  const activas = operaciones.filter((op) => !op.deleted).length;

  const enTransito = operaciones.filter(
    (op) => op.estado === "EN_TRANSITO" || op.estado === "EN_CHILE"
  ).length;

  const docsPendientes = operaciones.filter((op) =>
    Object.values(op.documentos || {}).some((d) => d.recibido === false)
  ).length;

  const pagosPendientes = operaciones.filter(
    (op) => op.finanzas?.saldo > 0
  ).length;

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
