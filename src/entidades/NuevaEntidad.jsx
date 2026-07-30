import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { crearEntidad } from "./EntidadesRepo";
import { entidadConfig } from "./entidadesConfig";
import "../proveedores/NuevoProveedor.css";

export default function NuevaEntidad({ tipo }) {
  const config = entidadConfig(tipo);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    entidadId: "",
    nombreComercial: "",
    nombreLegal: "",
    pais: "",
    identificacionFiscal: "",
    monedaHabitual: "USD",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const onChange = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function handleCrear() {
    setError("");
    setGuardando(true);
    try {
      await crearEntidad(tipo, {
        entidadId: form.entidadId,
        nombreComercial: form.nombreComercial,
        nombreLegal: form.nombreLegal,
        pais: form.pais,
        identificacionFiscal: form.identificacionFiscal,
        comercial: { monedaHabitual: form.monedaHabitual },
        estado: "ACTIVO",
        activo: true,
      });
      navigate(config.ruta);
    } catch (err) {
      setError(err.message || `No se pudo crear el ${config.singular}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="nuevo-proveedor-page">
      <div className="nuevo-proveedor-header">
        <h1>Nuevo {config.singular}</h1>
        <p>Creación de un nuevo registro en {config.plural.toLowerCase()}</p>
      </div>
      <div className="form-card">
        <div className="form-row">
          <div className="form-group">
            <label>{config.idLabel} *</label>
            <input name="entidadId" value={form.entidadId} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Nombre comercial *</label>
            <input name="nombreComercial" value={form.nombreComercial} onChange={onChange} />
          </div>
        </div>
        <div className="form-group">
          <label>Identificación fiscal</label>
          <input name="identificacionFiscal" value={form.identificacionFiscal} onChange={onChange} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <div className="form-group">
            <label>Nombre legal</label>
            <input name="nombreLegal" value={form.nombreLegal} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>País</label>
            <input name="pais" value={form.pais} onChange={onChange} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Moneda habitual</label>
            <select name="monedaHabitual" value={form.monedaHabitual} onChange={onChange}>
              <option>USD</option><option>EUR</option><option>CNY</option><option>CLP</option>
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => navigate(config.ruta)}>Cancelar</button>
          <button className="btn-primary" disabled={guardando} onClick={handleCrear}>
            {guardando ? "Guardando…" : `Crear ${config.singular}`}
          </button>
        </div>
      </div>
    </div>
  );
}
