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
  const [direccion, setDireccion] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [swift, setSwift] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
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
      direccion: {
        direccion,
        codigoPostal,
      },
      banco: {
        swift,
        numeroCuenta,
      },

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

        <div className="form-section-label">
          <span>Domicilio</span>
          <p>Datos postales del proveedor</p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Dirección</label>
            <input
              value={direccion}
              placeholder="Calle, número, ciudad y provincia"
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Código postal</label>
            <input
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
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

        <div className="form-section-label">
          <span>Datos bancarios</span>
          <p>Información utilizada para transferencias internacionales</p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Código SWIFT / BIC</label>
            <input
              value={swift}
              placeholder="Ej. BOFAUS3N"
              onChange={(e) => setSwift(e.target.value.toUpperCase())}
            />
          </div>

          <div className="form-group">
            <label>Número de cuenta / IBAN</label>
            <input
              value={numeroCuenta}
              onChange={(e) => setNumeroCuenta(e.target.value)}
            />
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
