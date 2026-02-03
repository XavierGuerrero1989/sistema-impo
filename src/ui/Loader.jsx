import "./Loader.css";

export default function Loader({ text = "Cargando..." }) {
  return (
    <div className="loader-overlay">
      <div className="loader-box">
        <div className="spinner" />
        <span>{text}</span>
      </div>
    </div>
  );
}
