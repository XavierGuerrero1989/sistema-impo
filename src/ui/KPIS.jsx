import "./KPIs.css";
import { calcularFinanzas } from "../domain/operacion";
import { estadoPagoProgramado } from "../domain/pagos";
import { useNavigate } from "react-router-dom";

export default function KPIs({ operaciones }) {
  const navigate = useNavigate();

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

  const proximosPagos = operaciones
    .flatMap((op) =>
      (op.pagosProgramados || [])
        .filter((pago) => !["PAGADO", "CANCELADO"].includes(pago.estado))
        .map((pago) => ({ ...pago, operacionId: op.id }))
    )
    .sort((a, b) => String(a.fechaProgramada || "9999").localeCompare(String(b.fechaProgramada || "9999")));
  const pagosUrgentes = proximosPagos.filter((pago) =>
    ["PROXIMO", "VENCIDO"].includes(estadoPagoProgramado(pago))
  ).length;
  const proximaFecha = proximosPagos[0]?.fechaProgramada
    ? new Date(`${proximosPagos[0].fechaProgramada}T00:00:00`).toLocaleDateString("es-AR")
    : "Sin fechas próximas";

  return (
    <div className="kpi-grid">
      <KpiCard title="Operaciones activas" value={activas} icon="▦" tone="blue" caption="En seguimiento" />
      <KpiCard title="En tránsito" value={enTransito} icon="→" tone="cyan" caption="Moviéndose ahora" />
      <KpiCard title="Docs pendientes" value={docsPendientes} icon="▤" tone="amber" caption="Requieren revisión" />
      <KpiCard title="Pagos pendientes" value={pagosPendientes} icon="$" tone="violet" caption="Con saldo abierto" />
      <KpiCard title="Próximos pagos" value={pagosUrgentes} icon="◷" tone="rose" caption={proximaFecha} onClick={() => navigate("/finanzas")} />
    </div>
  );
}

function KpiCard({ title, value, icon, tone, caption, onClick }) {
  return (
    <div className={`kpi-card ${tone} ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <span className="kpi-icon">{icon}</span>
      <div><span className="kpi-title">{title}</span><span className="kpi-value">{value}</span><small>{caption}</small></div>
    </div>
  );
}
