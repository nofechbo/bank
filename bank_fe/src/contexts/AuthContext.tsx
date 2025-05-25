import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

// Context shape shared across the app
interface AuthContextType {
  isLoggedIn: boolean;
  token: string | null;
  email: string | null;
  initialized: boolean;
  setEmail: (email: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Create the context (null before initialized)
const AuthContext = createContext<AuthContextType | null>(null);

// Wraps app and provides auth state to all components
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  // On load: restore token and email from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedEmail = localStorage.getItem("email");
    if (storedToken) setToken(storedToken);
    if (storedEmail) setEmail(storedEmail);

    setInitialized(true);
  }, []);

  // Called from login page — hits backend, stores token/email
  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      setToken(data.token);
      setEmail(email);
      localStorage.setItem("token", data.token);
      localStorage.setItem("email", email);
      navigate("/dashboard");
    } else {
      const err = { error: data.error || "Login failed", unverified: data.unverified };
      throw err;
    }
  };

  // Logs out: tells backend, clears local state
  const logout = async () => {
    try {
      if (token) {
        const res = await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Logout failed");
        }
      }
    } catch (err) {
      console.error("Logout error:", err);
      alert("Failed to log out properly. Your session may still be active.");

    } finally {
      setToken(null);
      setEmail(null);
      localStorage.removeItem("token");
      localStorage.removeItem("email");
      navigate("/");
    }
  };
  
  return (
    <AuthContext.Provider value={{ isLoggedIn: !!token, token, email, initialized, login, logout, setEmail }}>

      {children}
    </AuthContext.Provider>
  );
}

// Hook for components to access auth values
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
