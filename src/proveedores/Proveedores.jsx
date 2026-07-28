import { useEffect, useMemo, useState } from "react";
import { getProveedoresLocal } from "./ProveedoresRepo";
import { useNavigate } from "react-router-dom";
import "./proveedores.css";
import { useAuth } from "../auth/AuthContext";

export default function Proveedores() {

  const [proveedores, setProveedores] = useState([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const navigate = useNavigate();
  const { permissions } = useAuth();

  useEffect(() => {
    async function load() {
      const data = await getProveedoresLocal();
      setProveedores(data);
    }

    load().catch(console.error);
    window.addEventListener("data:changed", load);
    return () => window.removeEventListener("data:changed", load);
  }, []);

  const visibles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return proveedores.filter((proveedor) => {
      const proveedorEstado = proveedor.estado || (proveedor.activo === false ? "BLOQUEADO" : "ACTIVO");
      const matchesEstado = estado === "TODOS" || proveedorEstado === estado;
      const matchesSearch = !query || [
        proveedor.proveedorId,
        proveedor.nombreComercial,
        proveedor.nombreLegal,
        proveedor.pais,
        proveedor.identificacionFiscal,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesEstado && matchesSearch;
    });
  }, [proveedores, search, estado]);

  return (
    <div className="proveedores-page">

      <div className="proveedores-header">

        <div>
          <h1>Proveedores</h1>
          <p>Directorio de proveedores del sistema</p>
        </div>

        {permissions.manageProviders && (
          <button
            className="btn-nuevo"
            onClick={() => navigate("/proveedores/nuevo")}
          >
            + Nuevo proveedor
          </button>
        )}

      </div>

      <div className="filtros-bar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar proveedor, país o identificación fiscal…"
        />
        <select value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="SUSPENDIDO">Suspendidos</option>
          <option value="BLOQUEADO">Bloqueados</option>
        </select>
      </div>

      <div className="proveedores-table-card">

        <table className="proveedores-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>Proveedor</th>
              <th>País</th>
              <th>Moneda</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>

            {visibles.length === 0 && (
              <tr>
                <td colSpan="5" className="no-data">
                  No hay proveedores registrados
                </td>
              </tr>
            )}

            {visibles.map((p) => (
              <tr
                key={p.id}
                className="proveedores-row"
                onClick={() => navigate(`/proveedores/${p.proveedorId}`)}
              >
                <td className="proveedor-id">
                  {p.proveedorId}
                </td>

                <td>
                  {p.nombreComercial}
                </td>

                <td className="proveedor-pais">
                  {p.pais || "-"}
                </td>

                <td>
                  {p?.comercial?.monedaHabitual || "-"}
                </td>
                <td>{p.estado || (p.activo === false ? "BLOQUEADO" : "ACTIVO")}</td>
              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
