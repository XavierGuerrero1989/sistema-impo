import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { initializeApp, deleteApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { app, db } from "../firebase/firebase";
import { isPrimaryAdmin, ROLES } from "../auth/roles";
import "./Usuarios.css";
import { confirmAction } from "./sweetAlerts";

const ACCESS_LEVELS = [
  {
    role: ROLES.OPERACIONES,
    label: "Importaciones",
    description: "Crea operaciones y gestiona Importaciones, sin modificar Finanzas.",
    icon: "→",
  },
  {
    role: ROLES.FINANZAS,
    label: "Finanzas",
    description: "Consulta el resumen general y administra únicamente Finanzas.",
    icon: "$",
  },
  {
    role: ROLES.LECTURA,
    label: "Solo lectura",
    description: "Puede consultar toda la información, sin hacer cambios.",
    icon: "◉",
  },
  {
    role: ROLES.ADMIN,
    label: "Administrador",
    description: "Control total, incluida la creación, edición y eliminación de usuarios.",
    icon: "✦",
  },
];

const accessFor = (role) =>
  ACCESS_LEVELS.find((level) => level.role === role) || ACCESS_LEVELS[0];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState("");
  const [creando, setCreando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    role: ROLES.LECTURA,
  });

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

  useEffect(() => {
    if (!mostrarFormulario) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !creando) setMostrarFormulario(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mostrarFormulario, creando]);

  const cambiarRol = async (usuario, role) => {
    setGuardando(usuario.uid);
    setError("");
    setMensaje("");
    try {
      await updateDoc(doc(db, "usuarios", usuario.uid), {
        role,
        actualizadoAt: serverTimestamp(),
      });
      setUsuarios((current) =>
        current.map((item) => item.uid === usuario.uid ? { ...item, role } : item)
      );
      setMensaje(`Acceso actualizado para ${usuario.email}.`);
    } catch {
      setError("No se pudo actualizar el nivel de acceso.");
    } finally {
      setGuardando("");
    }
  };

  const cambiarEstadoUsuario = async (usuario, activo) => {
    if (isPrimaryAdmin(usuario.email)) return;
    const action = activo ? "reactivar" : "eliminar el acceso de";
    const confirmado = await confirmAction({
      title: activo ? "Reactivar acceso" : "Eliminar acceso",
      text: `¿Confirmás que querés ${action} ${usuario.email}?`,
      confirmText: activo ? "Reactivar" : "Eliminar acceso",
      danger: !activo,
    });
    if (!confirmado) return;
    setGuardando(usuario.uid);
    setError("");
    setMensaje("");
    try {
      await updateDoc(doc(db, "usuarios", usuario.uid), {
        activo,
        actualizadoAt: serverTimestamp(),
      });
      setUsuarios((current) =>
        current.map((item) => item.uid === usuario.uid ? { ...item, activo } : item)
      );
      setMensaje(activo
        ? `Acceso reactivado para ${usuario.email}.`
        : `Acceso eliminado para ${usuario.email}.`);
    } catch {
      setError("No se pudo modificar el acceso del usuario.");
    } finally {
      setGuardando("");
    }
  };

  const crearUsuario = async (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    const nombre = form.nombre.trim();

    if (!nombre) return setError("Ingresá el nombre del usuario.");
    if (!email) return setError("Ingresá un correo electrónico.");
    if (form.password.length < 6)
      return setError("La contraseña inicial debe tener al menos 6 caracteres.");

    setCreando(true);
    setError("");
    setMensaje("");
    const secondaryApp = initializeApp(app.options, `crear-usuario-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    let createdUser = null;

    try {
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        form.password
      );
      createdUser = credential.user;
      const nuevoUsuario = {
        nombre,
        email,
        role: form.role,
        activo: true,
        creadoAt: serverTimestamp(),
      };
      await setDoc(doc(db, "usuarios", credential.user.uid), nuevoUsuario);
      await signOut(secondaryAuth);

      setForm({ nombre: "", email: "", password: "", role: ROLES.LECTURA });
      setMostrarFormulario(false);
      setMensaje(`Usuario ${email} creado correctamente.`);
      await load();
    } catch (creationError) {
      if (createdUser) {
        await deleteUser(createdUser).catch(() => {});
      }
      const messages = {
        "auth/email-already-in-use": "Ese correo ya tiene una cuenta.",
        "auth/invalid-email": "El correo electrónico no es válido.",
        "auth/weak-password": "La contraseña inicial es demasiado débil.",
        "auth/operation-not-allowed": "La creación con correo y contraseña no está habilitada.",
      };
      setError(messages[creationError.code] || "No se pudo crear el usuario.");
    } finally {
      await deleteApp(secondaryApp);
      setCreando(false);
    }
  };

  return (
    <section className="usuarios-page">
      <header className="usuarios-header">
        <div>
          <span className="usuarios-eyebrow">Administración</span>
          <h1>Usuarios</h1>
          <p>Definí quién puede ingresar y qué puede hacer dentro de SISTEMA-IMPO.</p>
        </div>
        <button className="usuarios-add" onClick={() => setMostrarFormulario(true)}>
          <span>＋</span> Nuevo usuario
        </button>
      </header>

      <div className="access-overview">
        {ACCESS_LEVELS.map((level) => (
          <article key={level.role} className={`access-card ${level.role}`}>
            <span className="access-icon">{level.icon}</span>
            <div>
              <strong>{level.label}</strong>
              <p>{level.description}</p>
            </div>
          </article>
        ))}
      </div>

      {error && <div className="usuarios-alert error">{error}</div>}
      {mensaje && <div className="usuarios-alert success">✓ {mensaje}</div>}

      <section className="usuarios-list-card">
        <div className="usuarios-list-head">
          <div>
            <h2>Personas con acceso</h2>
            <p>{usuarios.length} {usuarios.length === 1 ? "usuario registrado" : "usuarios registrados"}</p>
          </div>
        </div>

        <div className="usuarios-list">
          {usuarios.map((usuario) => {
            const primaryAdmin = isPrimaryAdmin(usuario.email);
            const level = accessFor(primaryAdmin ? ROLES.ADMIN : usuario.role);
            const lastAccess = usuario.ultimoAcceso?.toDate?.();
            const initials = (usuario.nombre || usuario.email || "U")
              .split(/\s|@/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase();

            return (
              <article className={`usuario-row ${usuario.activo === false ? "inactive" : ""}`} key={usuario.uid}>
                <span className="usuario-avatar">{initials}</span>
                <div className="usuario-identity">
                  <strong>{usuario.nombre || usuario.email?.split("@")[0]}</strong>
                  <span>{usuario.email}</span>
                </div>
                <div className="usuario-last-access">
                  <span>Último acceso</span>
                  <strong>{lastAccess ? lastAccess.toLocaleString("es-AR") : "Todavía no ingresó"}</strong>
                </div>
                <label className={`access-select ${level.role}`}>
                  <span>{level.icon}</span>
                  <select
                    aria-label={`Nivel de acceso de ${usuario.email}`}
                    value={level.role}
                    disabled={primaryAdmin || guardando === usuario.uid}
                    onChange={(event) => cambiarRol(usuario, event.target.value)}
                  >
                    {ACCESS_LEVELS.map((option) => (
                      <option value={option.role} key={option.role}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {primaryAdmin && <span className="protected-user">Protegido</span>}
                {!primaryAdmin && (
                  <button
                    className={`user-access-action ${usuario.activo === false ? "restore" : "remove"}`}
                    disabled={guardando === usuario.uid}
                    onClick={() => cambiarEstadoUsuario(usuario, usuario.activo === false)}
                  >
                    {usuario.activo === false ? "Reactivar" : "Eliminar acceso"}
                  </button>
                )}
              </article>
            );
          })}
          {!usuarios.length && (
            <div className="usuarios-empty">Todavía no hay usuarios registrados.</div>
          )}
        </div>
      </section>

      {mostrarFormulario && createPortal(
        <div
          className="user-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creando) setMostrarFormulario(false);
          }}
        >
          <form className="user-modal" onSubmit={crearUsuario} role="dialog" aria-modal="true" aria-labelledby="create-user-title">
            <button
              type="button"
              className="user-modal-close"
              onClick={() => setMostrarFormulario(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <span className="usuarios-eyebrow">Nuevo acceso</span>
            <h2 id="create-user-title">Crear usuario</h2>
            <p>La persona ingresará con su correo y esta contraseña inicial.</p>

            <label>
              <span>Nombre completo</span>
              <input
                autoFocus
                value={form.nombre}
                onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                placeholder="Ej. María González"
              />
            </label>
            <label>
              <span>Correo electrónico</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="nombre@empresa.cl"
              />
            </label>
            <label>
              <span>Contraseña inicial</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
              <small>Compartila de forma segura con el nuevo usuario.</small>
            </label>

            <fieldset>
              <legend>Nivel de acceso</legend>
              {ACCESS_LEVELS.map((level) => (
                <label className={`role-option ${form.role === level.role ? "selected" : ""}`} key={level.role}>
                  <input
                    type="radio"
                    name="role"
                    value={level.role}
                    checked={form.role === level.role}
                    onChange={(event) => setForm({ ...form, role: event.target.value })}
                  />
                  <span className="access-icon">{level.icon}</span>
                  <span><strong>{level.label}</strong><small>{level.description}</small></span>
                </label>
              ))}
            </fieldset>

            <div className="user-modal-actions">
              <button type="button" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
              <button type="submit" disabled={creando}>
                {creando ? "Creando…" : "Crear usuario"}
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </section>
  );
}
