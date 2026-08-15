import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const swal = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: "impi-swal-popup",
    title: "impi-swal-title",
    htmlContainer: "impi-swal-copy",
    actions: "impi-swal-actions",
    confirmButton: "impi-swal-confirm",
    cancelButton: "impi-swal-cancel",
    input: "impi-swal-input",
  },
  confirmButtonText: "Entendido",
  reverseButtons: true,
});

export function installSweetAlerts() {
  window.alert = (message) => swal.fire({
    icon: "info",
    title: "Atención",
    text: String(message || ""),
  });
}

export async function confirmAction({
  title = "¿Confirmás esta acción?",
  text = "",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  icon = "question",
} = {}) {
  const result = await swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: {
      confirmButton: danger ? "impi-swal-confirm is-danger" : "impi-swal-confirm",
    },
  });
  return result.isConfirmed;
}

export async function requestExactValue({ title, text, expectedValue }) {
  const result = await swal.fire({
    icon: "warning",
    title,
    text,
    input: "text",
    inputPlaceholder: expectedValue,
    showCancelButton: true,
    confirmButtonText: "Eliminar definitivamente",
    cancelButtonText: "Cancelar",
    customClass: { confirmButton: "impi-swal-confirm is-danger" },
    inputValidator: (value) => (
      value === expectedValue ? undefined : `Escribí exactamente ${expectedValue} para continuar.`
    ),
  });
  return result.isConfirmed;
}

