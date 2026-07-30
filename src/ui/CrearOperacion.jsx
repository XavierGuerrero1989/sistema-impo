import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { upsertOperacionLocal } from "../offline/operacionesRepo";
import { getProveedoresLocal } from "../proveedores/ProveedoresRepo";
import { auditEvent } from "../auth/audit";
import "./CrearOperacion.css";
import { normalizarOperacion, validarOperacion } from "../domain/operacion";
import { CONDICIONES_PAGO, crearPlanPagos } from "../domain/pagos";

export default function CrearOperacion() {

  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);

  const [form, setForm] = useState({
    id: "",
    proveedorId: "",
    activo: "",
    moneda: "USD",
    totalOperacion: "",
    porcentajeAdelanto: "30",
    porcentajeSaldo: "70",
    condicionSaldo: "ARRIBO_CHILE",
    fechaAdelanto: "",
    fechaSaldo: "",
    observaciones: "",
  });

  useEffect(() => {

    async function load() {

      const data = await getProveedoresLocal();

      setProveedores(data || []);

    }

    load().catch(console.error);

  }, []);

  const onChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  const crearOperacion = async () => {

    const proveedorSeleccionado = proveedores.find(
      (p) => p.proveedorId === form.proveedorId
    );

    if (!proveedorSeleccionado) {

      alert("Proveedor inválido");
      return;

    }

    if (
      proveedorSeleccionado.estado === "BLOQUEADO" ||
      proveedorSeleccionado.activo === false
    ) {
      alert("El proveedor está bloqueado y no puede usarse en una operación nueva");
      return;
    }

    const porcentajeAdelanto = Number(form.porcentajeAdelanto || 0);
    const porcentajeSaldo = Number(form.porcentajeSaldo || 0);
    if (porcentajeAdelanto < 0 || porcentajeSaldo < 0) {
      alert("Los porcentajes no pueden ser negativos");
      return;
    }
    if (porcentajeAdelanto + porcentajeSaldo !== 100) {
      alert("El adelanto y el saldo deben sumar 100%");
      return;
    }

    const nuevaOperacion = normalizarOperacion({

      id: form.id,

      proveedorId: proveedorSeleccionado.proveedorId,
      proveedorNombre: proveedorSeleccionado.nombreComercial,

      activo: form.activo,

      moneda: form.moneda,

      totalOperacion: Number(form.totalOperacion || 0),
      condicionVenta: {
        cuotas: crearPlanPagos({
          porcentajeAdelanto,
          porcentajeSaldo,
          condicionSaldo: form.condicionSaldo,
          fechaAdelanto: form.fechaAdelanto,
          fechaSaldo: form.fechaSaldo,
        }),
      },
      pagosProgramados: [],

      estado: "PLANIFICADA",
      logistica: {
        destino: "Chile",
        medio: "MARÍTIMO",
      },

      adelantos: [],
      pagos: [],
      documentos: [],

      historial: [
        {
          fecha: new Date().toISOString(),
          evento: "Operación creada",
          ...auditEvent("Operación creada"),
        },
      ],

      observaciones: form.observaciones,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()

    });

    const errores = validarOperacion(nuevaOperacion);
    if (errores.length) {
      alert(errores.join("\n"));
      return;
    }

    await upsertOperacionLocal(nuevaOperacion);

    navigate(`/operaciones/${form.id}`);

  };

  return (

    <section className="crear-operacion-page">

      <header className="crear-header">
        <h1>Nueva operación</h1>
        <p>Creación de una nueva operación de importación</p>
      </header>

      <div className="form-card">

        <div className="form-group">

          <label>ID de operación *</label>

          <input
            name="id"
            placeholder="op_2026_001"
            value={form.id}
            onChange={onChange}
          />

        </div>

        {/* PROVEEDOR */}

        <div className="form-group">

          <label>Proveedor *</label>

          <select
            name="proveedorId"
            value={form.proveedorId}
            onChange={onChange}
          >

            <option value="">Seleccionar proveedor</option>

            {proveedores.map((p) => (

              <option
                key={p.proveedorId}
                value={p.proveedorId}
                disabled={p.estado === "BLOQUEADO" || p.activo === false}
              >
                {p.proveedorId} — {p.nombreComercial}
                {(p.estado === "BLOQUEADO" || p.activo === false) ? " (bloqueado)" : ""}
              </option>

            ))}

          </select>

        </div>

        <div className="form-group">

          <label>Activo / Mercadería *</label>

          <input
            name="activo"
            placeholder="3 thermas + sillón"
            value={form.activo}
            onChange={onChange}
          />

        </div>

        <div className="form-row">

          <div className="form-group">

            <label>Moneda</label>

            <select
              name="moneda"
              value={form.moneda}
              onChange={onChange}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>

          </div>

          <div className="form-group">

            <label>Total operación</label>

            <input
              name="totalOperacion"
              type="number"
              placeholder="12500"
              value={form.totalOperacion}
              onChange={onChange}
            />

          </div>

        </div>

        <section className="sale-condition">
          <div className="sale-condition-head">
            <span>Condición comercial</span>
            <h2>Plan de pagos</h2>
            <p>Definí cómo se distribuirá el valor de esta operación.</p>
          </div>

          <div className="payment-split">
            <div className="payment-part advance">
              <span>Primer tramo</span>
              <strong>Adelanto</strong>
              <label>Porcentaje</label>
              <div className="percent-input">
                <input
                  name="porcentajeAdelanto"
                  type="number"
                  min="0"
                  max="100"
                  value={form.porcentajeAdelanto}
                  onChange={onChange}
                />
                <b>%</b>
              </div>
              <label>Fecha estimada</label>
              <input
                name="fechaAdelanto"
                type="date"
                value={form.fechaAdelanto}
                onChange={onChange}
              />
            </div>

            <div className="payment-part balance">
              <span>Segundo tramo</span>
              <strong>Saldo</strong>
              <label>Porcentaje</label>
              <div className="percent-input">
                <input
                  name="porcentajeSaldo"
                  type="number"
                  min="0"
                  max="100"
                  value={form.porcentajeSaldo}
                  onChange={onChange}
                />
                <b>%</b>
              </div>
              <label>Condición de pago</label>
              <select name="condicionSaldo" value={form.condicionSaldo} onChange={onChange}>
                {CONDICIONES_PAGO.filter((item) => item.value !== "AL_CREAR").map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <label>Fecha estimada, si corresponde</label>
              <input
                name="fechaSaldo"
                type="date"
                value={form.fechaSaldo}
                onChange={onChange}
              />
            </div>
          </div>

          <div className={`payment-total ${
            Number(form.porcentajeAdelanto || 0) + Number(form.porcentajeSaldo || 0) === 100
              ? "valid"
              : "invalid"
          }`}>
            <span>Total distribuido</span>
            <strong>{Number(form.porcentajeAdelanto || 0) + Number(form.porcentajeSaldo || 0)}%</strong>
            <small>Debe sumar exactamente 100%</small>
          </div>
        </section>

        <div className="form-group">

          <label>Observaciones</label>

          <textarea
            name="observaciones"
            placeholder="Notas internas de la operación"
            value={form.observaciones}
            onChange={onChange}
          />

        </div>

        <div className="form-actions">

          <button
            className="btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancelar
          </button>

          <button
            className="btn-primary"
            onClick={crearOperacion}
          >
            Crear operación
          </button>

        </div>

      </div>

    </section>

  );

}
