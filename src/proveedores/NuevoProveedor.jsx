import { useState } from "react";
import { crearProveedor } from "./proveedoresRepo";
import { useNavigate } from "react-router-dom";
import "./NuevoProveedor.css";

export default function NuevoProveedor() {
  const navigate = useNavigate();

  const [proveedorId, setProveedorId] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [nombreLegal, setNombreLegal] = useState("");
  const [pais, setPais] = useState("");
  const [moneda, setMoneda] = useState("USD");

  async function handleCrear() {
    const proveedor = {
      proveedorId,
      nombreComercial,
      nombreLegal,
      pais,

      comercial: {
        monedaHabitual: moneda,
      },

      createdAt: new Date(),
      updatedAt: new Date(),
      activo: true,
    };

    await crearProveedor(proveedor);

    navigate("/proveedores");
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
            onClick={handleCrear}
          >
            Crear proveedor
          </button>

        </div>

      </div>

    </div>
  );
}