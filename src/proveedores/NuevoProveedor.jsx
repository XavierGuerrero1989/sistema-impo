import { useState } from "react";
import { crearProveedor } from "./ProveedoresRepo";
import { useNavigate } from "react-router-dom";
import "./NuevoProveedor.css";


export default function NuevoProveedor() {
  const navigate = useNavigate();

  const [proveedorId, setProveedorId] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [nombreLegal, setNombreLegal] = useState("");
  const [pais, setPais] = useState("");
  const [moneda, setMoneda] = useState("USD");
  const [identificacionFiscal, setIdentificacionFiscal] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleCrear() {
    setError("");
    setGuardando(true);
    const proveedor = {
      proveedorId,
      nombreComercial,
      nombreLegal,
      pais,
      identificacionFiscal,

      comercial: {
        monedaHabitual: moneda,
      },

      createdAt: new Date(),
      updatedAt: new Date(),
      activo: true,
    };

    try {
      await crearProveedor(proveedor);
      navigate("/proveedores");
    } catch (err) {
      setError(err.message || "No se pudo crear el proveedor");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="nuevo-proveedor-page">

      <div className="nuevo-proveedor-header">
        <h1>Nuevo proveedor</h1>
        <p>Creación de un nuevo proveedor del sistema</p>
      </div>

      <div className="form-card">

        <div className="form-row">

          <div className="form-group">
            <label>ID proveedor *</label>
            <input
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Nombre comercial *</label>
            <input
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
            />
          </div>

        </div>

        <div className="form-group">
          <label>Identificación fiscal</label>
          <input
            value={identificacionFiscal}
            onChange={(e) => setIdentificacionFiscal(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-row">

          <div className="form-group">
            <label>Nombre legal</label>
            <input
              value={nombreLegal}
              onChange={(e) => setNombreLegal(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>País</label>
            <input
              value={pais}
              onChange={(e) => setPais(e.target.value)}
            />
          </div>

        </div>

        <div className="form-row">

          <div className="form-group">
            <label>Moneda habitual</label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
            >
              <option>USD</option>
              <option>EUR</option>
              <option>CNY</option>
            </select>
          </div>

        </div>

        <div className="form-actions">

          <button
            className="btn-secondary"
            onClick={() => navigate("/proveedores")}
          >
            Cancelar
          </button>

          <button
            className="btn-primary"
            disabled={guardando}
            onClick={handleCrear}
          >
            {guardando ? "Guardando…" : "Crear proveedor"}
          </button>

        </div>

      </div>

    </div>
  );
}
