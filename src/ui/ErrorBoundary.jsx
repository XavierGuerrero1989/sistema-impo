import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error de interfaz:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main style={{ maxWidth: 720, margin: "80px auto", padding: 24 }}>
        <h1>No se pudo mostrar esta pantalla</h1>
        <p>
          Tus cambios guardados localmente no se eliminaron. Podés recargar la
          aplicación o volver al inicio.
        </p>
        <button onClick={() => window.location.assign("/")}>Volver al inicio</button>
        <button onClick={() => window.location.reload()} style={{ marginLeft: 12 }}>
          Recargar
        </button>
      </main>
    );
  }
}
