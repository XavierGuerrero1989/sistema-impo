import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { isPrimaryAdmin, ROLES } from "../auth/roles";
import "./operacionesListado.css";

const ROLE_OPTIONS = [
  ROLES.ADMIN,
  ROLES.OPERACIONES,
  ROLES.FINANZAS,
  ROLES.LECTURA,
];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState("");

  const load = async () => {
    try {
      const snapshot = await getDocs(collection(db, "usuarios"));
      setUsuarios(snapshot.docs.map((item) => ({ uid: item.id, ...item.data() })));
    } catch {
      setError("No se pudo cargar la lista de usuarios.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cambiarRol = async (usuario, role) => {
    setGuardando(usuario.uid);
    setError("");
    try {
      await updateDoc(doc(db, "usuarios", usuario.uid), { role });
      setUsuarios((current) =>
        current.map((item) => item.uid === usuario.uid ? { ...item, role } : item)
      );
    } catch {
      setError("No se pudo actualizar el rol.");
    } finally {
      setGuardando("");
    }
  };

  return (
    <section className="operaciones-listado-page">
      <header className="listado-header">
        <div>
          <h1>Usuarios</h1>
          <p>Permisos internos de SISTEMA-IMPO</p>
        </div>
      </header>

      {error && <p className="empty">{error}</p>}

      <div className="tabla-wrapper">
        <table className="operaciones-table">
          <thead>
            <tr><th>Usuario</th><th>Rol</th><th>Último acceso</th></tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => {
              const primaryAdmin = isPrimaryAdmin(usuario.email);
              const lastAccess = usuario.ultimoAcceso?.toDate?.();
              return (
                <tr key={usuario.uid}>
                  <td>{usuario.email || usuario.nombre || usuario.uid}</td>
                  <td>
                    <select
                      value={primaryAdmin ? ROLES.ADMIN : usuario.role || ROLES.LECTURA}
                      disabled={primaryAdmin || guardando === usuario.uid}
                      onChange={(event) => cambiarRol(usuario, event.target.value)}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option value={role} key={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td>{lastAccess ? lastAccess.toLocaleString("es-AR") : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
