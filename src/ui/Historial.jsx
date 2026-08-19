import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal } from "../offline/operacionesRepo";
import "./operacionesListado.css";
import { referenciaOperacion } from "../domain/operacion";

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function Historial() {
  const [operaciones, setOperaciones] = useState([]);
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    const load = () => getOperacionesLocal().then(setOperaciones).catch(console.error);
    load();
    window.addEventListener("data:changed", load);
    return () => window.removeEventListener("data:changed", load);
  }, []);

  const eventos = useMemo(() => operaciones.flatMap((operacion) =>
    (Array.isArray(operacion.historial) ? operacion.historial : []).map((evento, index) => ({
      ...evento,
      id: `${operacion.id}_${index}`,
      operacionId: operacion.id,
      operacionReferencia: referenciaOperacion(operacion),
      proveedor: operacion.proveedorNombre || operacion.proveedor || "-",
    }))
  ).sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)), [operaciones]);

  const visibles = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = desde ? new Date(`${desde}T00:00:00`) : null;
    const to = hasta ? new Date(`${hasta}T23:59:59`) : null;

    return eventos.filter((evento) => {
      const date = new Date(evento.fecha || 0);
      if (from && date < from) return false;
      if (to && date > to) return false;
      if (!query) return true;
      return [
        evento.operacionId,
        evento.operacionReferencia,
        evento.proveedor,
        evento.evento,
        evento.actorEmail,
        evento.actorNombre,
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [eventos, search, desde, hasta]);

  const exportar = () => {
    const rows = [
      ["fecha", "operacion", "proveedor", "evento", "usuario"],
      ...visibles.map((evento) => [
        evento.fecha,
        evento.operacionReferencia,
        evento.proveedor,
        evento.evento,
        evento.actorEmail || evento.actorNombre || "",
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map(csvCell).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `historial_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="operaciones-listado-page">
      <header className="listado-header">
        <div>
          <h1>Historial</h1>
          <p>Trazabilidad completa de cambios y responsables</p>
        </div>
        <button className="btn-primary" disabled={!visibles.length} onClick={exportar}>
          Exportar CSV
        </button>
      </header>

      <div className="filtros-bar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar operación, proveedor, evento o usuario…"
        />
        <input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
        <input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
      </div>

      <div className="tabla-wrapper">
        <table className="operaciones-table">
          <thead>
            <tr><th>Fecha</th><th>Operación</th><th>Proveedor</th><th>Evento</th><th>Usuario</th></tr>
          </thead>
          <tbody>
            {!visibles.length && (
              <tr><td colSpan="5" className="empty">No hay eventos para mostrar</td></tr>
            )}
            {visibles.map((evento) => (
              <tr key={evento.id}>
                <td>{evento.fecha ? new Date(evento.fecha).toLocaleString("es-AR") : "-"}</td>
                <td className="mono">{evento.operacionReferencia}</td>
                <td>{evento.proveedor}</td>
                <td>{evento.evento || "-"}</td>
                <td>{evento.actorEmail || evento.actorNombre || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
