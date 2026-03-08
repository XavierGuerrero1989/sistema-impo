import { useEffect, useState } from "react";
import { getProveedoresLocal } from "./proveedoresRepo";
import { useNavigate } from "react-router-dom";
import "./proveedores.css";

export default function Proveedores() {

  const [proveedores, setProveedores] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await getProveedoresLocal();
      setProveedores(data);
    }

    load().catch(console.error);
  }, []);

  return (
    <div className="proveedores-page">

      <div className="proveedores-header">

        <div>
          <h1>Proveedores</h1>
          <p>Directorio de proveedores del sistema</p>
        </div>

        <button
          className="btn-nuevo"
          onClick={() => navigate("/proveedores/nuevo")}
        >
          + Nuevo proveedor
        </button>

      </div>

      <div className="proveedores-table-card">

        <table className="proveedores-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>Proveedor</th>
              <th>País</th>
              <th>Moneda</th>
            </tr>
          </thead>

          <tbody>

            {proveedores.length === 0 && (
              <tr>
                <td colSpan="4" className="no-data">
                  No hay proveedores registrados
                </td>
              </tr>
            )}

            {proveedores.map((p) => (
              <tr
                key={p.id}
                className="proveedores-row"
                onClick={() => navigate(`/proveedores/${p.id}`)}
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
              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}