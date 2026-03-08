import "./KPIs.css";

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

  const docsPendientes = operaciones.filter((op) =>
    (op.documentos || []).some((d) => d.estado === "PENDIENTE")
  ).length;

  /* =========================
     Pagos pendientes
  ========================== */

  const pagosPendientes = operaciones.filter((op) => {

    if (op.estado === "FINALIZADA") return false;

    const total = Number(op.totalOperacion || 0);

    const adelantos = (op.adelantos || [])
      .filter((m) => m.estado === "ACTIVO")
      .reduce((acc, m) => acc + Number(m.monto || 0), 0);

    const pagos = (op.pagos || [])
      .filter((m) => m.estado === "ACTIVO")
      .reduce((acc, m) => acc + Number(m.monto || 0), 0);

    const pagado = adelantos + pagos;

    return total > pagado;

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