import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getProveedorById,
  eliminarProveedor,
  actualizarProveedor
} from "./proveedoresRepo";
import { getOperacionesLocal } from "../offline/operacionesRepo";
import "./proveedores.css";

export default function ProveedorDetalle() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [proveedor, setProveedor] = useState(null);
  const [editando, setEditando] = useState(false);
  const [operacionesProveedor, setOperacionesProveedor] = useState([]);

  const [form, setForm] = useState({
    proveedorId: "",
    nombreComercial: "",
    nombreLegal: "",
    pais: "",
    monedaHabitual: "USD",
    email: "",
    telefono: "",
    contacto: "",
    banco: "",
    condicionPago: "",
    plazoPagoDias: ""
  });

  useEffect(() => {
    async function load() {

      const data = await getProveedorById(Number(id));
      setProveedor(data);

      if (data) {

        setForm({
          proveedorId: data.proveedorId || "",
          nombreComercial: data.nombreComercial || "",
          nombreLegal: data.nombreLegal || "",
          pais: data.pais || "",
          monedaHabitual: data?.comercial?.monedaHabitual || "USD",
          email: data?.contacto?.email || "",
          telefono: data?.contacto?.telefono || "",
          contacto: data?.contacto?.nombre || "",
          banco: data?.banco?.banco || "",
          condicionPago: data?.comercial?.condicionPago || "",
          plazoPagoDias: data?.comercial?.plazoPagoDias || ""
        });

        // buscar operaciones del proveedor
        const operaciones = await getOperacionesLocal();

        const filtradas = operaciones.filter(
          (op) => op.proveedor === data.nombreComercial
        );

        setOperacionesProveedor(filtradas);
      }
    }

    load().catch(console.error);

  }, [id]);

  function handleChange(e) {

    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value
    });
  }

  async function handleGuardar() {

    const data = {

      proveedorId: form.proveedorId,
      nombreComercial: form.nombreComercial,
      nombreLegal: form.nombreLegal,
      pais: form.pais,

      contacto: {
        nombre: form.contacto,
        email: form.email,
        telefono: form.telefono
      },

      banco: {
        banco: form.banco
      },

      comercial: {
        monedaHabitual: form.monedaHabitual,
        condicionPago: form.condicionPago,
        plazoPagoDias: form.plazoPagoDias
      },

      updatedAt: new Date()
    };

    await actualizarProveedor(Number(id), data);

    setEditando(false);

    const updated = await getProveedorById(Number(id));
    setProveedor(updated);
  }

  async function handleEliminar() {

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar este proveedor?"
    );

    if (!confirmar) return;

    await eliminarProveedor(Number(id));

    navigate("/proveedores");
  }

  if (!proveedor) {
    return (
      <div className="proveedores-page">
        <p>Cargando proveedor...</p>
      </div>
    );
  }

  return (
    <div className="proveedores-page">

      <div className="proveedores-header">

        <div>
          <h1>{proveedor.nombreComercial}</h1>
          <p>Ficha completa del proveedor</p>
        </div>

        <div style={{display:"flex",gap:"10px"}}>

          {!editando && (
            <button
              className="btn-primary"
              onClick={() => setEditando(true)}
            >
              Editar proveedor
            </button>
          )}

          {editando && (
            <button
              className="btn-primary"
              onClick={handleGuardar}
            >
              Guardar cambios
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={() => navigate("/proveedores")}
          >
            Volver
          </button>

        </div>

      </div>

      {/* ============================= */}
      {/* DATOS DEL PROVEEDOR */}
      {/* ============================= */}

      <div className="proveedores-table-card">

        <table className="proveedores-table">

          <tbody>

            <tr>
              <th>ID proveedor</th>
              <td>
                {editando
                  ? <input name="proveedorId" value={form.proveedorId} onChange={handleChange}/>
                  : proveedor.proveedorId}
              </td>
            </tr>

            <tr>
              <th>Nombre comercial</th>
              <td>
                {editando
                  ? <input name="nombreComercial" value={form.nombreComercial} onChange={handleChange}/>
                  : proveedor.nombreComercial}
              </td>
            </tr>

            <tr>
              <th>Nombre legal</th>
              <td>
                {editando
                  ? <input name="nombreLegal" value={form.nombreLegal} onChange={handleChange}/>
                  : proveedor.nombreLegal || "-"}
              </td>
            </tr>

            <tr>
              <th>País</th>
              <td>
                {editando
                  ? <input name="pais" value={form.pais} onChange={handleChange}/>
                  : proveedor.pais || "-"}
              </td>
            </tr>

            <tr>
              <th>Moneda habitual</th>
              <td>
                {editando
                  ? (
                    <select name="monedaHabitual" value={form.monedaHabitual} onChange={handleChange}>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>CNY</option>
                    </select>
                  )
                  : proveedor?.comercial?.monedaHabitual || "-"
                }
              </td>
            </tr>

            <tr>
              <th>Contacto</th>
              <td>
                {editando
                  ? <input name="contacto" value={form.contacto} onChange={handleChange}/>
                  : proveedor?.contacto?.nombre || "-"}
              </td>
            </tr>

            <tr>
              <th>Email</th>
              <td>
                {editando
                  ? <input name="email" value={form.email} onChange={handleChange}/>
                  : proveedor?.contacto?.email || "-"}
              </td>
            </tr>

            <tr>
              <th>Teléfono</th>
              <td>
                {editando
                  ? <input name="telefono" value={form.telefono} onChange={handleChange}/>
                  : proveedor?.contacto?.telefono || "-"}
              </td>
            </tr>

            <tr>
              <th>Banco</th>
              <td>
                {editando
                  ? <input name="banco" value={form.banco} onChange={handleChange}/>
                  : proveedor?.banco?.banco || "-"}
              </td>
            </tr>

            <tr>
              <th>Condición de pago</th>
              <td>
                {editando
                  ? <input name="condicionPago" value={form.condicionPago} onChange={handleChange}/>
                  : proveedor?.comercial?.condicionPago || "-"}
              </td>
            </tr>

            <tr>
              <th>Plazo pago (días)</th>
              <td>
                {editando
                  ? <input name="plazoPagoDias" value={form.plazoPagoDias} onChange={handleChange}/>
                  : proveedor?.comercial?.plazoPagoDias || "-"}
              </td>
            </tr>

          </tbody>

        </table>

      </div>

      {/* ============================= */}
      {/* OPERACIONES DEL PROVEEDOR */}
      {/* ============================= */}

      <div className="proveedores-table-card" style={{marginTop:"24px"}}>

        <div style={{padding:"16px 20px", borderBottom:"1px solid #e2e8f0"}}>
          <h3 style={{fontSize:"1rem"}}>Operaciones de este proveedor</h3>
        </div>

        <table className="proveedores-table">

          <thead>
            <tr>
              <th>Operación</th>
              <th>Moneda</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>

            {operacionesProveedor.length === 0 && (
              <tr>
                <td colSpan="4" className="no-data">
                  No hay operaciones asociadas
                </td>
              </tr>
            )}

            {operacionesProveedor.map((op) => (
              <tr
                key={op.id}
                className="proveedores-row"
                onClick={() => navigate(`/operaciones/${op.id}`)}
              >

                <td className="proveedor-id">
                  {op.id}
                </td>

                <td>
                  {op.moneda}
                </td>

                <td>
                  {op.total || "-"}
                </td>

                <td>
                  {op.estado || "-"}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

      {/* ============================= */}
      {/* ZONA PELIGROSA */}
      {/* ============================= */}

      <div
        style={{
          marginTop: "24px",
          background: "#fff",
          border: "1px solid #fecaca",
          borderRadius: "10px",
          padding: "20px",
        }}
      >

        <h3 style={{ color: "#b91c1c", marginBottom: "10px" }}>
          Zona peligrosa
        </h3>

        <button
          style={{
            background: "#dc2626",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onClick={handleEliminar}
        >
          Eliminar proveedor
        </button>

      </div>

    </div>
  );
}