import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { countryLabel } from "../domain/paises";
import { getEntidadesLocal } from "./EntidadesRepo";
import { entidadConfig } from "./entidadesConfig";
import "../proveedores/proveedores.css";
import "./entidades.css";

export default function DirectorioEntidades({ tipo }) {
  const config = entidadConfig(tipo);
  const [entidades, setEntidades] = useState([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const { permissions } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => setEntidades(await getEntidadesLocal(tipo));
    load().catch(console.error);
    window.addEventListener("data:changed", load);
    return () => window.removeEventListener("data:changed", load);
  }, [tipo]);

  const visibles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entidades.filter((entidad) => {
      const entityState = entidad.estado || (entidad.activo === false ? "BLOQUEADO" : "ACTIVO");
      return (estado === "TODOS" || entityState === estado) && (!query || [
        entidad.entidadId,
        entidad.nombreComercial,
        entidad.nombreLegal,
        entidad.pais,
        entidad.identificacionFiscal,
      ].some((value) => String(value || "").toLowerCase().includes(query)));
    });
  }, [entidades, estado, search]);

  return (
    <div className="proveedores-page">
      <div className="proveedores-header">
        <div><h1>{config.plural}</h1><p>Directorio de {config.plural.toLowerCase()} del sistema</p></div>
        {permissions.manageProviders && (
          <button className="btn-nuevo" onClick={() => navigate(`${config.ruta}/nuevo`)}>
            + Nuevo {config.singular}
          </button>
        )}
      </div>
      <div className="filtros-bar">
        <input value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder={`Buscar ${config.singular}, país o identificación fiscal…`} />
        <select value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="SUSPENDIDO">Suspendidos</option>
          <option value="BLOQUEADO">Bloqueados</option>
        </select>
      </div>
      <div className="proveedores-table-card">
        <table className="proveedores-table">
          <thead><tr><th>ID</th><th>Nombre comercial</th><th>País</th><th>Moneda</th><th>Estado</th></tr></thead>
          <tbody>
            {!visibles.length && <tr><td colSpan="5" className="no-data">No hay registros todavía</td></tr>}
            {visibles.map((entidad) => (
              <tr key={entidad.entidadId} className="proveedores-row"
                onClick={() => navigate(`${config.ruta}/${entidad.entidadId}`)}>
                <td className="proveedor-id">{entidad.entidadId}</td>
                <td>{entidad.nombreComercial}</td>
                <td className="proveedor-pais">{countryLabel(entidad.pais, "-")}</td>
                <td>{entidad.comercial?.monedaHabitual || "-"}</td>
                <td>{entidad.estado || (entidad.activo === false ? "BLOQUEADO" : "ACTIVO")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
