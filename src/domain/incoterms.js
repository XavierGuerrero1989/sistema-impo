export const INCOTERMS_VERSION = "2020";

export const INCOTERMS = [
  { value: "EXW", label: "EXW — En fábrica" },
  { value: "FCA", label: "FCA — Franco transportista" },
  { value: "CPT", label: "CPT — Transporte pagado hasta" },
  { value: "CIP", label: "CIP — Transporte y seguro pagados hasta" },
  { value: "DAP", label: "DAP — Entregado en lugar" },
  { value: "DPU", label: "DPU — Entregado en lugar descargado" },
  { value: "DDP", label: "DDP — Entregado con derechos pagados" },
  { value: "FAS", label: "FAS — Franco al costado del buque" },
  { value: "FOB", label: "FOB — Franco a bordo" },
  { value: "CFR", label: "CFR — Costo y flete" },
  { value: "CIF", label: "CIF — Costo, seguro y flete" },
];

export const isValidIncoterm = (value) =>
  INCOTERMS.some((item) => item.value === String(value || "").toUpperCase());

export const incotermLabel = (value) => {
  const code = String(value || "").toUpperCase();
  return INCOTERMS.find((item) => item.value === code)?.label || code || "Sin definir";
};
