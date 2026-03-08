import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { upsertOperacionLocal } from "../offline/operacionesRepo";
import { getProveedoresLocal } from "../proveedores/proveedoresRepo";
import { auditEvent } from "../auth/audit";
import "./CrearOperacion.css";

export default function CrearOperacion() {
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);

  const [form, setForm] = useState({
    id: "",
    proveedorId: "",
    activo: "",
    moneda: "USD",
    totalOperacion: "",
    observaciones: "",
  });

  useEffect(() => {
    async function load() {
      const data = await getProveedoresLocal();
      setProveedores(data);
    }

    load().catch(console.error);
  }, []);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const crearOperacion = async () => {

    if (!form.id || !form.proveedorId || !form.activo) {
      alert("Completá los campos obligatorios");
      return;
    }

    const proveedorSeleccionado = proveedores.find(
      (p) => p.id === Number(form.proveedorId)
    );

    const nuevaOperacion = {

      id: form.id,

      proveedorId: proveedorSeleccionado.id,
      proveedorNombre: proveedorSeleccionado.nombreComercial,

      activo: form.activo,
      moneda: form.moneda,
      totalOperacion: Number(form.totalOperacion || 0),

      estado: "PLANIFICADA",

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
    };

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

        {/* PROVEEDOR DESDE DIRECTORIO */}

        <div className="form-group">
          <label>Proveedor *</label>

          <select
            name="proveedorId"
            value={form.proveedorId}
            onChange={onChange}
          >

            <option value="">Seleccionar proveedor</option>

            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.proveedorId} — {p.nombreComercial}
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
            <select name="moneda" value={form.moneda} onChange={onChange}>
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