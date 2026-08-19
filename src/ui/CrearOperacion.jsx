import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { upsertOperacionLocal } from "../offline/operacionesRepo";
import { getProveedoresLocal } from "../proveedores/ProveedoresRepo";
import { auditEvent } from "../auth/audit";
import "./CrearOperacion.css";
import { normalizarOperacion, validarOperacion } from "../domain/operacion";
import { CONDICIONES_PAGO, importeCuota } from "../domain/pagos";
import { INCOTERMS, INCOTERMS_VERSION } from "../domain/incoterms";

export default function CrearOperacion() {

  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);

  const [form, setForm] = useState({
    id: "",
    proveedorId: "",
    activo: "",
    incoterm: "",
    moneda: "USD",
    totalOperacion: "",
    observaciones: "",
  });
  const [cuotas, setCuotas] = useState([
    {
      id: "cuota_1",
      nombre: "Adelanto",
      porcentaje: "30",
      condicion: "AL_CREAR",
      fechaEstimada: "",
    },
    {
      id: "cuota_2",
      nombre: "Saldo",
      porcentaje: "70",
      condicion: "ARRIBO_CHILE",
      fechaEstimada: "",
    },
  ]);

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

  const nuevaCuota = (index) => ({
    id: `cuota_${Date.now()}_${index}`,
    nombre: `Pago ${index}`,
    porcentaje: "0",
    condicion: "SOLICITUD_PROVEEDOR",
    fechaEstimada: "",
  });

  const actualizarCuota = (id, field, value) => {
    setCuotas((current) => current.map((cuota) =>
      cuota.id === id ? { ...cuota, [field]: value } : cuota
    ));
  };

  const ajustarCantidadCuotas = (cantidadSolicitada) => {
    const cantidad = Math.max(1, Math.trunc(Number(cantidadSolicitada || 1)));
    setCuotas((current) => {
      if (cantidad <= current.length) return current.slice(0, cantidad);
      const adicionales = Array.from(
        { length: cantidad - current.length },
        (_, offset) => nuevaCuota(current.length + offset + 1)
      );
      return [...current, ...adicionales];
    });
  };

  const eliminarCuota = (id) => {
    if (cuotas.length === 1) return;
    setCuotas((current) => current.filter((cuota) => cuota.id !== id));
  };

  const totalDistribuido = cuotas.reduce(
    (sum, cuota) => sum + Number(cuota.porcentaje || 0),
    0
  );

  const money = (amount) => new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: form.moneda,
    maximumFractionDigits: form.moneda === "CLP" ? 0 : 2,
  }).format(Number(amount || 0));

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

    if (cuotas.some((cuota) => !cuota.nombre.trim())) {
      alert("Todos los pagos deben tener un nombre");
      return;
    }
    if (cuotas.some((cuota) => Number(cuota.porcentaje || 0) <= 0)) {
      alert("Todos los pagos deben tener un porcentaje mayor a 0%");
      return;
    }
    if (Math.abs(totalDistribuido - 100) > 0.001) {
      alert("El plan de pagos debe sumar exactamente 100%");
      return;
    }

    const nuevaOperacion = normalizarOperacion({

      id: form.id,

      proveedorId: proveedorSeleccionado.proveedorId,
      proveedorNombre: proveedorSeleccionado.nombreComercial,

      activo: form.activo,
      incoterm: form.incoterm,
      incotermVersion: INCOTERMS_VERSION,

      moneda: form.moneda,

      totalOperacion: Number(form.totalOperacion || 0),
      condicionVenta: {
        cuotas: cuotas.map((cuota, index) => ({
          id: cuota.id || `cuota_${index + 1}`,
          nombre: cuota.nombre.trim(),
          porcentaje: Number(cuota.porcentaje || 0),
          condicion: cuota.condicion,
          fechaEstimada: cuota.fechaEstimada || null,
        })),
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

        <div className="form-group">
          <label>Incoterm® {INCOTERMS_VERSION} (opcional)</label>
          <select name="incoterm" value={form.incoterm} onChange={onChange}>
            <option value="">Definir más adelante</option>
            {INCOTERMS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <small>Podés definirlo ahora o agregarlo luego desde Importaciones.</small>
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
            <div>
              <span>Condición comercial</span>
              <h2>Plan de pagos</h2>
              <p>Definí cuántos pagos tendrá la operación y cómo se distribuirá su valor.</p>
            </div>
            <label className="installment-count">
              <span>Cantidad de pagos</span>
              <input
                type="number"
                min="1"
                value={cuotas.length}
                onChange={(event) => ajustarCantidadCuotas(event.target.value)}
              />
            </label>
          </div>

          <div className="payment-split">
            {cuotas.map((cuota, index) => (
              <div className="payment-part" key={cuota.id}>
                <div className="payment-part-head">
                  <span>Pago {index + 1} de {cuotas.length}</span>
                  {cuotas.length > 1 && (
                    <button type="button" onClick={() => eliminarCuota(cuota.id)}>Eliminar</button>
                  )}
                </div>

                <label>Nombre del pago</label>
                <input
                  value={cuota.nombre}
                  placeholder={`Ej. ${index === 0 ? "Adelanto" : `Pago ${index + 1}`}`}
                  onChange={(event) => actualizarCuota(cuota.id, "nombre", event.target.value)}
                />

                <label>Porcentaje</label>
                <div className="percent-input">
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={cuota.porcentaje}
                    onChange={(event) => actualizarCuota(cuota.id, "porcentaje", event.target.value)}
                  />
                  <b>%</b>
                </div>

                <div className="installment-value">
                  <span>Importe correspondiente</span>
                  <strong>{money(importeCuota(cuota, form.totalOperacion))}</strong>
                </div>

                <label>Condición de pago</label>
                <select
                  value={cuota.condicion}
                  onChange={(event) => actualizarCuota(cuota.id, "condicion", event.target.value)}
                >
                  {CONDICIONES_PAGO.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>

                <label>Fecha estimada, si corresponde</label>
                <input
                  type="date"
                  value={cuota.fechaEstimada}
                  onChange={(event) => actualizarCuota(cuota.id, "fechaEstimada", event.target.value)}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-installment"
            onClick={() => ajustarCantidadCuotas(cuotas.length + 1)}
          >
            ＋ Agregar otro pago
          </button>

          <div className={`payment-total ${
            Math.abs(totalDistribuido - 100) < 0.001
              ? "valid"
              : "invalid"
          }`}>
            <span>Total distribuido</span>
            <strong>{totalDistribuido}%</strong>
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
