import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingBox from "../components/LoadingBox";

export default function ProtectedRoutes() {
  const { isLoggedIn, initialized } = useAuth();

  if (!initialized) return <LoadingBox message="Loading..." />;

  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
