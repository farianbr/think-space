import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

/**
 * Guards authenticated routes. Works both as a wrapper (`<RequireAuth>…`) and as
 * a layout route (renders <Outlet/> when no children are provided).
 */
export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children ?? <Outlet />;
}
