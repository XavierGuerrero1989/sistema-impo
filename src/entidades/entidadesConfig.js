export const ENTIDADES_CONFIG = {
  forwarders: {
    tipo: "forwarder",
    tabla: "forwarders",
    coleccion: "forwarders",
    singular: "forwarder",
    plural: "Forwarders",
    idLabel: "ID forwarder",
    ruta: "/forwarders",
    operacionKey: "forwarderId",
  },
  agentesAduana: {
    tipo: "agenteAduana",
    tabla: "agentesAduana",
    coleccion: "agentesAduana",
    singular: "agente de aduana",
    plural: "Agentes de aduana",
    idLabel: "ID agente",
    ruta: "/agentes-aduana",
    operacionKey: "agenteAduanaId",
  },
};

export function entidadConfig(tipo) {
  const config = ENTIDADES_CONFIG[tipo];
  if (!config) throw new Error("Tipo de entidad no reconocido");
  return config;
}
