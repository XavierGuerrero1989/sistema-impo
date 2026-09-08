import { CONDICIONES_PAGO, importeCuota } from "../domain/pagos";
import "./PaymentPlanEditor.css";

const makeInstallment = (index) => ({
  id: `cuota_${Date.now()}_${index}`,
  nombre: index === 1 ? "Adelanto" : `Pago ${index}`,
  porcentaje: 0,
  condicion: index === 1 ? "AL_CREAR" : "SOLICITUD_PROVEEDOR",
  fechaEstimada: null,
});

export default function PaymentPlanEditor({ cuotas, onChange, total = null, moneda = "USD" }) {
  const totalDistribuido = cuotas.reduce((sum, cuota) => sum + Number(cuota.porcentaje || 0), 0);
  const update = (id, field, value) => onChange(cuotas.map((cuota) =>
    cuota.id === id ? { ...cuota, [field]: value } : cuota
  ));
  const resize = (requested) => {
    const count = Math.max(1, Math.trunc(Number(requested || 1)));
    if (count <= cuotas.length) return onChange(cuotas.slice(0, count));
    onChange([...cuotas, ...Array.from({ length: count - cuotas.length }, (_, i) => makeInstallment(cuotas.length + i + 1))]);
  };
  const money = (value) => new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda || "USD", maximumFractionDigits: moneda === "CLP" ? 0 : 2,
  }).format(Number(value || 0));

  return (
    <div className="plan-editor">
      <div className="plan-editor-head">
        <div><strong>Condición de pago</strong><span>Esta distribución debe sumar exactamente 100%.</span></div>
        <label><span>Cantidad de pagos</span><input type="number" min="1" value={cuotas.length} onChange={(e) => resize(e.target.value)} /></label>
      </div>
      <div className="plan-editor-grid">
        {cuotas.map((cuota, index) => (
          <article key={cuota.id}>
            <div className="plan-editor-title"><b>Pago {index + 1}</b>{cuotas.length > 1 && <button type="button" onClick={() => onChange(cuotas.filter((item) => item.id !== cuota.id))}>Eliminar</button>}</div>
            <label><span>Nombre</span><input value={cuota.nombre} onChange={(e) => update(cuota.id, "nombre", e.target.value)} /></label>
            <label><span>Porcentaje</span><input type="number" min="0.01" max="100" step="0.01" value={cuota.porcentaje} onChange={(e) => update(cuota.id, "porcentaje", e.target.value)} /></label>
            {total !== null && <div className="plan-editor-amount"><span>Importe</span><strong>{money(importeCuota(cuota, total))}</strong></div>}
            <label><span>Condición</span><select value={cuota.condicion} onChange={(e) => update(cuota.id, "condicion", e.target.value)}>{CONDICIONES_PAGO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label><span>Fecha estimada (opcional)</span><input type="date" value={cuota.fechaEstimada || ""} onChange={(e) => update(cuota.id, "fechaEstimada", e.target.value || null)} /></label>
          </article>
        ))}
      </div>
      <button className="plan-editor-add" type="button" onClick={() => resize(cuotas.length + 1)}>＋ Agregar otro pago</button>
      <div className={`plan-editor-total ${Math.abs(totalDistribuido - 100) < 0.001 ? "valid" : "invalid"}`}><span>Total distribuido</span><strong>{totalDistribuido}%</strong></div>
    </div>
  );
}
