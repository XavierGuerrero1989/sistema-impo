import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function PermissionRoute({ permission, children }) {
  const { permissions } = useAuth();
  return permissions[permission] ? children : <Navigate to="/" replace />;
}
