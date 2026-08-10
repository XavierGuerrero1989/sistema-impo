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
  const isAdmin = role === ROLES.ADMIN;
  const isImports = role === ROLES.OPERACIONES;
  const isFinance = role === ROLES.FINANZAS;
  const isReadOnly = role === ROLES.LECTURA;
  return {
    manageUsers: isAdmin,
    createOperations: isAdmin || isImports,
    deleteOperations: isAdmin,
    manageOperations: isAdmin || isImports,
    manageProviders: isAdmin || isImports,
    manageDocuments: isAdmin || isImports,
    manageFinanceDocuments: isAdmin || isFinance,
    uploadDocuments: isAdmin || isImports || isFinance,
    manageFinances: isAdmin || isFinance,
    confirmPayments: isAdmin || isFinance,
    viewLogistics: isAdmin || isImports || isFinance || isReadOnly,
    viewFinances: isAdmin || isImports || isFinance || isReadOnly,
    viewDirectories: isAdmin || isImports || isReadOnly,
  };
}
