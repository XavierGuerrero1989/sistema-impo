import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal } from "../offline/operacionesRepo";
import { useNavigate } from "react-router-dom";
import "./documentos.css";

const TIPOS = ["FACTURA", "BL", "PACKING_LIST", "OTRO"];

const formatBytes = (bytes = 0) => {
  const b = Number(bytes || 0);
  if (!b) return "";
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export default function Documentos() {
  const [operaciones, setOperaciones] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  // Modal preview
  const [preview, setPreview] = useState(null); // { url, titulo, subtitulo }

  const navigate = useNavigate();

  useEffect(() => {
    getOperacionesLocal().then(setOperaciones).catch(console.error);
  }, []);

  /* =========================
     NORMALIZAR DOCUMENTOS (ROBUSTO)
  ========================== */
  const documentos = useMemo(() => {
    return operaciones.flatMap((op) => {
      const docs = Array.isArray(op.documentos) ? op.documentos : [];

      return docs.map((doc, index) => {
        const archivo = doc?.archivo || null;
        const url = archivo?.downloadURL || null;

        return {
          id: `${op.id}_${index}`,
          operacionId: op.id,
          proveedor: op.proveedor || "-",
          nombre: doc?.nombre || "Sin nombre",
          tipo: doc?.tipo || "OTRO",
          referencia: doc?.referencia || null,
          fecha: doc?.fecha || null,

          // archivo
          archivoNombre: archivo?.nombre || null,
          archivoSize: archivo?.size || 0,
          downloadURL: url,
        };
      });
    });
  }, [operaciones]);

  /* =========================
     KPIs (simple y útil)
  ========================== */
  const kpis = useMemo(() => {
    const total = documentos.length;
    const byTipo = TIPOS.reduce((acc, t) => {
      acc[t] = documentos.filter((d) => (d.tipo || "OTRO") === t).length;
      return acc;
    }, {});
    return { total, byTipo };
  }, [documentos]);

  /* =========================
     FILTROS
  ========================== */
  const documentosFiltrados = useMemo(() => {
    return documentos.filter((doc) => {
      if (filtroTipo !== "TODOS" && doc.tipo !== filtroTipo) return false;
      return true;
    });
  }, [documentos, filtroTipo]);

  const openPreview = (doc) => {
    if (!doc.downloadURL) return;
    setPreview({
      url: doc.downloadURL,
      titulo: doc.nombre,
      subtitulo: `${doc.proveedor} · ${doc.operacionId}`,
    });
  };

  const closePreview = () => setPreview(null);

  return (
    <section className="documentos-page">
      {/* Header */}
      <header className="documentos-header">
        <div>
          <h1>Documentos</h1>
          <p>Vista global de documentación por operación</p>
        </div>

        <div className="doc-kpis">
          <div className="kpi">
            <span className="kpi-label">Total</span>
            <span className="kpi-value">{kpis.total}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Facturas</span>
            <span className="kpi-value">{kpis.byTipo.FACTURA}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">B/L</span>
            <span className="kpi-value">{kpis.byTipo.BL}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Packing</span>
            <span className="kpi-value">{kpis.byTipo.PACKING_LIST}</span>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="documentos-filtros">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="TODOS">Tipo: todos</option>
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
              <th>Operación</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th style={{ width: 360 }}></th>
            </tr>
          </thead>

          <tbody>
            {documentosFiltrados.length === 0 && (
              <tr>
                <td colSpan="5" className="empty">
                  No hay documentos para mostrar
                </td>
              </tr>
            )}

            {documentosFiltrados.map((doc) => {
              const hasFile = !!doc.downloadURL;

              return (
                <tr key={doc.id}>
                  {/* Documento */}
                  <td>
                    <div className="doc-main">
                      <div className="doc-title">
                        <span className="doc-name">{doc.nombre}</span>
                        {doc.referencia && (
                          <span className="pill ref mono">{doc.referencia}</span>
                        )}
                      </div>

                      <div className="doc-sub">
                        <span className="muted">{doc.proveedor}</span>
                        <span className="dot">•</span>
                        <span className="mono muted">{doc.operacionId}</span>
                        {doc.archivoNombre && (
                          <>
                            <span className="dot">•</span>
                            <span className="muted">
                              {doc.archivoNombre}
                              {doc.archivoSize ? ` (${formatBytes(doc.archivoSize)})` : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Operación */}
                  <td className="mono">{doc.operacionId}</td>

                  {/* Tipo (más visible, antes de Fecha) */}
                  <td>
                    <span className={`pill tipo ${String(doc.tipo).toLowerCase()}`}>
                      {doc.tipo === "PACKING_LIST" ? "PACKING" : doc.tipo}
                    </span>
                  </td>

                  {/* Fecha */}
                  <td>
                    {doc.fecha ? new Date(doc.fecha).toLocaleDateString() : "-"}
                  </td>

                  {/* Acciones */}
                  <td>
                    <div className="doc-actions">
                      <button
                        className={`btn-pill ${hasFile ? "" : "disabled"}`}
                        onClick={() => openPreview(doc)}
                        disabled={!hasFile}
                        title={!hasFile ? "No hay archivo para previsualizar" : "Previsualizar PDF"}
                      >
                        Preview
                      </button>

                      {hasFile ? (
                        <a
                          className="btn-pill ghost"
                          href={doc.downloadURL}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Descargar
                        </a>
                      ) : (
                        <button className="btn-pill ghost disabled" disabled>
                          Descargar
                        </button>
                      )}

                      <button
                        className="btn-pill"
                        onClick={() => navigate(`/operaciones/${doc.operacionId}`)}
                      >
                        Ver operación
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Preview */}
      {preview && (
        <div className="modal-overlay" onClick={closePreview}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <strong>{preview.titulo}</strong>
                <span className="muted">·</span>
                <span className="muted">{preview.subtitulo}</span>
              </div>

              <div className="modal-actions">
                <a
                  className="btn-pill ghost"
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Descargar
                </a>
                <button className="btn-pill" onClick={closePreview}>
                  Cerrar
                </button>
              </div>
            </div>

            <div className="modal-body">
              <iframe className="pdf-frame" src={preview.url} title="PDF Preview" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
