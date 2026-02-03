import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { upsertOperacionLocal } from "../offline/operacionesRepo";
import "./CrearOperacion.css";

export default function CrearOperacion() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    id: "",
    proveedor: "",
    activo: "",
    moneda: "USD",
    totalOperacion: "",
    observaciones: "",
  });

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const crearOperacion = async () => {
    if (!form.id || !form.proveedor || !form.activo) {
      alert("Completá los campos obligatorios");
      return;
    }

    const nuevaOperacion = {
      id: form.id,
      proveedor: form.proveedor,
      activo: form.activo,
      moneda: form.moneda,
      totalOperacion: Number(form.totalOperacion || 0),
      estado: "CREADA",
      adelantoMonto: 0,
      documentos: [],
      historial: [
        {
          fecha: new Date().toISOString(),
          evento: "Operación creada",
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

        <div className="form-group">
          <label>Proveedor *</label>
          <input
            name="proveedor"
            placeholder="GIVA"
            value={form.proveedor}
            onChange={onChange}
          />
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
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={crearOperacion}>
            Crear operación
          </button>
        </div>
      </div>
    </section>
  );
}
