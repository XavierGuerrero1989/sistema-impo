import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { countryLabel } from "../domain/paises";
import { getOperacionesLocal } from "../offline/operacionesRepo";
import { actualizarEntidad, eliminarEntidad, getEntidadById } from "./EntidadesRepo";
import { entidadConfig } from "./entidadesConfig";
import "../proveedores/proveedores.css";
import "./entidades.css";
import { confirmAction } from "../ui/sweetAlerts";
import { referenciaOperacion } from "../domain/operacion";

const EMPTY_FORM = {
  entidadId: "", nombreComercial: "", nombreLegal: "", pais: "",
  direccion: "",
  identificacionFiscal: "", estado: "ACTIVO", monedaHabitual: "USD",
  contacto: "", email: "", telefono: "", banco: "", condicionPago: "", plazoPagoDias: "",
};

export default function EntidadDetalle({ tipo }) {
  const config = entidadConfig(tipo);
  const { entidadId } = useParams();
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const [entidad, setEntidad] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editando, setEditando] = useState(false);
  const [operaciones, setOperaciones] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const data = await getEntidadById(tipo, String(entidadId || ""));
      if (!data) return setError(`${config.singular} no encontrado`);
      setEntidad(data);
      setForm({
        entidadId: data.entidadId || "",
        nombreComercial: data.nombreComercial || "",
        nombreLegal: data.nombreLegal || "",
        pais: data.pais || "",
        direccion: data.direccion || "",
        identificacionFiscal: data.identificacionFiscal || "",
        estado: data.estado || (data.activo === false ? "BLOQUEADO" : "ACTIVO"),
        monedaHabitual: data.comercial?.monedaHabitual || "USD",
        contacto: data.contacto?.nombre || "",
        email: data.contacto?.email || "",
        telefono: data.contacto?.telefono || "",
        banco: data.banco?.banco || "",
        condicionPago: data.comercial?.condicionPago || "",
        plazoPagoDias: data.comercial?.plazoPagoDias || "",
      });
      const ops = await getOperacionesLocal();
      setOperaciones(ops.filter((op) => op[config.operacionKey] === data.entidadId));
    }
    load().catch((err) => setError(err.message));
  }, [config.operacionKey, config.singular, entidadId, tipo]);

  const onChange = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function guardar() {
    if (!permissions.manageProviders) return;
    await actualizarEntidad(tipo, entidadId, {
      nombreComercial: form.nombreComercial,
      nombreLegal: form.nombreLegal,
      pais: form.pais,
      direccion: tipo === "forwarders" ? form.direccion : "",
      identificacionFiscal: form.identificacionFiscal,
      estado: form.estado,
      activo: form.estado !== "BLOQUEADO",
      contacto: { nombre: form.contacto, email: form.email, telefono: form.telefono },
      banco: { banco: form.banco },
      comercial: {
        monedaHabitual: form.monedaHabitual,
        condicionPago: form.condicionPago,
        plazoPagoDias: form.plazoPagoDias,
      },
    });
    setEntidad(await getEntidadById(tipo, entidadId));
    setEditando(false);
  }

  async function eliminar() {
    if (!permissions.manageProviders) return;
    const confirmado = await confirmAction({
      title: `Eliminar ${config.singular}`,
      text: "Esta acción quitará el registro del directorio.",
      confirmText: "Eliminar",
      danger: true,
    });
    if (!confirmado) return;
    await eliminarEntidad(tipo, entidadId);
    navigate(config.ruta);
  }

  if (!entidad) return <div className="proveedores-page"><p>{error || "Cargando…"}</p></div>;

  const row = (label, field, value, control = "input") => (
    <tr>
      <th>{label}</th>
      <td>{editando ? (
        control === "estado" ? (
          <select name={field} value={form[field]} onChange={onChange}>
            <option value="ACTIVO">Activo</option><option value="SUSPENDIDO">Suspendido</option><option value="BLOQUEADO">Bloqueado</option>
          </select>
        ) : control === "moneda" ? (
          <select name={field} value={form[field]} onChange={onChange}>
            <option>USD</option><option>EUR</option><option>CNY</option><option>CLP</option>
          </select>
        ) : <input name={field} value={form[field]} onChange={onChange} />
      ) : value || "-"}</td>
    </tr>
  );

  return (
    <div className="proveedores-page">
      <div className="proveedores-header">
        <div><h1>{entidad.nombreComercial}</h1><p>Ficha completa del {config.singular}</p></div>
        <div className="entity-detail-actions">
          {!editando && permissions.manageProviders && <button className="btn-primary" onClick={() => setEditando(true)}>Editar</button>}
          {editando && <button className="btn-primary" onClick={guardar}>Guardar cambios</button>}
          <button className="btn-secondary" onClick={() => navigate(config.ruta)}>Volver</button>
        </div>
      </div>
      <div className="proveedores-table-card">
        <table className="proveedores-table"><tbody>
          <tr><th>{config.idLabel}</th><td>{entidad.entidadId}</td></tr>
          {row("Nombre comercial", "nombreComercial", entidad.nombreComercial)}
          {row("Nombre legal", "nombreLegal", entidad.nombreLegal)}
          {row("País", "pais", countryLabel(entidad.pais, "-"))}
          {tipo === "forwarders" && row("Dirección", "direccion", entidad.direccion)}
          {row("Identificación fiscal", "identificacionFiscal", entidad.identificacionFiscal)}
          {row("Estado", "estado", entidad.estado, "estado")}
          {row("Moneda habitual", "monedaHabitual", entidad.comercial?.monedaHabitual, "moneda")}
          {row("Contacto", "contacto", entidad.contacto?.nombre)}
          {row("Email", "email", entidad.contacto?.email)}
          {row("Teléfono", "telefono", entidad.contacto?.telefono)}
          {row("Banco", "banco", entidad.banco?.banco)}
          {row("Condición de pago", "condicionPago", entidad.comercial?.condicionPago)}
          {row("Plazo pago (días)", "plazoPagoDias", entidad.comercial?.plazoPagoDias)}
        </tbody></table>
      </div>
      <div className="proveedores-table-card entity-operations-card">
        <div className="entity-card-heading"><h3>Operaciones asociadas</h3></div>
        <table className="proveedores-table">
          <thead><tr><th>Operación</th><th>Moneda</th><th>Total</th><th>Estado</th></tr></thead>
          <tbody>
            {!operaciones.length && <tr><td colSpan="4" className="no-data">No hay operaciones asociadas</td></tr>}
            {operaciones.map((op) => (
              <tr key={op.id} className="proveedores-row" onClick={() => navigate(`/operaciones/${op.id}`)}>
                <td className="proveedor-id">{referenciaOperacion(op)}</td><td>{op.moneda}</td>
                <td>{op.totalOperacion || "-"}</td><td>{op.estado || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {permissions.manageProviders && (
        <div className="entity-danger-zone">
          <h3>Zona peligrosa</h3>
          <button onClick={eliminar}>Eliminar {config.singular}</button>
        </div>
      )}
    </div>
  );
}
