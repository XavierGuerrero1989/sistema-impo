const COUNTRY_CODES = {
  argentina: "AR",
  bolivia: "BO",
  brasil: "BR",
  brazil: "BR",
  chile: "CL",
  china: "CN",
  colombia: "CO",
  "corea del sur": "KR",
  ecuador: "EC",
  "estados unidos": "US",
  usa: "US",
  "ee uu": "US",
  españa: "ES",
  spain: "ES",
  francia: "FR",
  france: "FR",
  alemania: "DE",
  germany: "DE",
  india: "IN",
  italia: "IT",
  italy: "IT",
  japon: "JP",
  japan: "JP",
  mexico: "MX",
  panama: "PA",
  paraguay: "PY",
  peru: "PE",
  portugal: "PT",
  "reino unido": "GB",
  uk: "GB",
  taiwan: "TW",
  turquia: "TR",
  turkey: "TR",
  uruguay: "UY",
  vietnam: "VN",
};

const normalizeCountry = (value = "") =>
  String(value)
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");

export function countryFlag(country) {
  const code = COUNTRY_CODES[normalizeCountry(country)];
  if (!code) return "🌐";
  return [...code]
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

export function countryLabel(country, fallback = "Sin definir") {
  const label = String(country || "").trim() || fallback;
  return `${countryFlag(country)} ${label}`;
}

