import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingBox from "../components/LoadingBox";
import { isExpiredJwt } from "../utils/authToken";

export default function ProtectedRoutes() {
  const { isLoggedIn, token, initialized } = useAuth();

  if (!initialized) return <LoadingBox message="Loading..." />;

  return isLoggedIn && !isExpiredJwt(token) ? <Outlet /> : <Navigate to="/login" replace />;
}
