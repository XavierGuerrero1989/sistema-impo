import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function AdminRoute({ children }) {
  const { permissions } = useAuth();
  return permissions.manageUsers ? children : <Navigate to="/" replace />;
}
