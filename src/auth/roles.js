export const ADMIN_EMAIL = "xavierignacioguerrero@gmail.com";

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
