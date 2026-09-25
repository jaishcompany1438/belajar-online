import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";

export function ProtectedRoute({ children, roles }) {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="page-shell">Memuat sesi...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return children;
}

