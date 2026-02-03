import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal } from "../offline/operacionesRepo";
import { useNavigate } from "react-router-dom";
import "./documentos.css";

export default function Documentos() {
  const [operaciones, setOperaciones] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  const navigate = useNavigate();

  useEffect(() => {
    getOperacionesLocal().then(setOperaciones).catch(console.error);
  }, []);

  /* =========================
     NORMALIZAR DOCUMENTOS
  ========================== */
  const documentos = useMemo(() => {
    return operaciones.flatMap((op) =>
      (op.documentos || []).map((doc, index) => ({
        id: `${op.id}_${index}`,
        operacionId: op.id,
        proveedor: op.proveedor,
        nombre: doc.nombre,
        tipo: doc.tipo,
        estado: doc.estado,
        fecha: doc.fecha,
      }))
    );
  }, [operaciones]);

  /* =========================
     FILTROS
  ========================== */
  const documentosFiltrados = useMemo(() => {
    return documentos.filter((doc) => {
      if (filtroEstado !== "TODOS" && doc.estado !== filtroEstado) return false;
      if (filtroTipo !== "TODOS" && doc.tipo !== filtroTipo) return false;
      return true;
    });
  }, [documentos, filtroEstado, filtroTipo]);

  return (
    <section className="documentos-page">
      {/* Header */}
      <header className="documentos-header">
        <h1>Documentos</h1>
        <p>Vista global de documentación por operación</p>
      </header>

      {/* Filtros */}
      <div className="documentos-filtros">
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="OK">Completos</option>
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="TODOS">Todos los tipos</option>
          <option value="FACTURA">Factura</option>
          <option value="BL">B/L</option>
          <option value="PACKING_LIST">Packing List</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="documentos-table-wrapper">
        <table className="documentos-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Operación</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {documentosFiltrados.length === 0 && (
              <tr>
                <td colSpan="7" className="empty">
                  No hay documentos para mostrar
                </td>
              </tr>
            )}

            {documentosFiltrados.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <strong>{doc.nombre}</strong>
                </td>
                <td>{doc.tipo}</td>
                <td>
                  <span
                    className={`doc-status ${doc.estado.toLowerCase()}`}
                  >
                    {doc.estado}
                  </span>
                </td>
                <td className="mono">{doc.operacionId}</td>
                <td>{doc.proveedor}</td>
                <td>
                  {doc.fecha
                    ? new Date(doc.fecha).toLocaleDateString()
                    : "-"}
                </td>
                <td>
                  <button
                    className="btn-link"
                    onClick={() =>
                      navigate(`/operaciones/${doc.operacionId}`)
                    }
                  >
                    Ver operación
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
