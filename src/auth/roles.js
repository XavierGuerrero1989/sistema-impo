export const ADMIN_EMAILS = [
  "xavierignacioguerrero@gmail.com",
  "ariel@ptm.cl",
];

export function isPrimaryAdmin(email) {
  return ADMIN_EMAILS.includes(String(email || "").toLowerCase());
}

export const ROLES = {
  ADMIN: "admin",
  OPERACIONES: "operaciones",
  FINANZAS: "finanzas",
  LECTURA: "lectura",
};

export function permissionsFor(role) {
  return {
    manageUsers: role === ROLES.ADMIN,
    manageOperations: [ROLES.ADMIN, ROLES.OPERACIONES, ROLES.FINANZAS].includes(role),
    manageProviders: [ROLES.ADMIN, ROLES.OPERACIONES].includes(role),
    manageDocuments: [ROLES.ADMIN, ROLES.OPERACIONES].includes(role),
    manageFinances: [ROLES.ADMIN, ROLES.FINANZAS].includes(role),
  };
}
