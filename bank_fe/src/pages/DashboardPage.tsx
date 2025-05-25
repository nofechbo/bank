import { PageBox } from "../styles/Styles"
import { API_BASE_URL } from "../config"
import { ContactUs } from "../components/ContactUs"
import { LogoHeader } from "../components/LogoHeader"
import { useAuth } from "../contexts/AuthContext"
import { useState, useEffect, useCallback } from "react"
import LoadingBox from "../components/LoadingBox"
import { useNavigate } from "react-router-dom"
import type { DashboardData } from "../types/dashboardTypes"
import ErrorModal from "../components/ErrorModal"
import WelcomeCard from "../components/dashboardComponents/WelcomeCard"
import TransactionList from "../components/dashboardComponents/TransactionList"
import DashboardChart from "../components/dashboardComponents/DashboardChart"
import { Box, Button, Card } from "@mui/material"
import { useDashboardSocket } from "../components/dashboardComponents/UseDashboardSocket"

export default function DashboardPage() {
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const { token, email } = useAuth();
    
    const fetchDashboard = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`, // from useAuth()
                },
            });

            const data: DashboardData | { error: string } = await response.json();
            if (!response.ok || "error" in data) {
                const errorMessage = "error" in data ? data.error : "Dashboard loading failed";
                throw new Error(errorMessage);
            } else {
                setDashboardData(data);
                setShowSuccess(true);
            }

        } catch(err) {
            console.error(err);
            setErrorMessage(err instanceof Error ? err.message : "Dashboard loading failed");
        
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!token) {
            setErrorMessage("Missing or invalid token.");
            setLoading(false);
            return;
        }

        fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useDashboardSocket({
        token,
        userEmail: email ?? null,
        onUpdate: fetchDashboard,
    });
    
    const handleLogout = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
               navigate("/", { replace: true });
            } else {
                const data: { error? : string } = await response.json();
                throw new Error(data.error || "Verification failed")
            }
        } catch (err) {
            console.error(err);
            setErrorMessage(err instanceof Error ? err.message : "System encountered a problem logging out");
        } 
    }
    
    return (
        <Box sx={PageBox}>
            <ContactUs />
            <LogoHeader /> 

            { loading && <LoadingBox message="Loading your dashboard..." />}

            {/* Error Modal */}
            <ErrorModal
                open={!!errorMessage}
                message={errorMessage}
                onClose={() => {
                    setErrorMessage("");
                    navigate("/login", { replace: true })
                }}
            />
                        
            {/* success Modal */}
            {showSuccess && dashboardData && (
                <Box sx={{ flexGrow: 1, px: 3 }}>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 3,
                            alignItems: "stretch",
                            height: 650,
                        }}
                    >
                        
                        {/* Left (2/3 width) */}
                        <Box sx={{ flex: 2, display: "flex", flexDirection: "column", height: "100%" }}>
                            <WelcomeCard
                                name={dashboardData.name}
                                email={dashboardData.email}
                                phone={dashboardData.phone}
                                joinedAt={dashboardData.joinedAt}
                                balance={dashboardData.balance}
                            />

                            <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
                                <TransactionList transactions={dashboardData.transactions} />
                            </Box>
                        </Box>

                        {/* Right (1/3 width) */}
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                            <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mb: 3,
                            }}
                            >
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => navigate("/transfer")}
                                    sx={{
                                        px: 3,         // horizontal padding
                                        py: 1.5,       // vertical padding
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        ml: 1.5,
                                    }}
                                >
                                    Transfer Funds
                                </Button>

                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={handleLogout}
                                    sx={{
                                        px: 3,
                                        py: 1.5,
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        mr: 2.5,
                                    }}
                                >
                                    Log Out
                                </Button>
                            </Box>
                            
                            {/*chart*/}
                            <Card
                                sx={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    minHeight: 0,
                                    height: "100%",
                                    p: 0,
                                    borderRadius: 3,
                                    boxShadow: 4,
                                }}
                            >
                                <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                                    <DashboardChart transactions={dashboardData.transactions} />
                                </Box>
                            </Card>
                        </Box>
                    </Box>
                </Box>
            )}

        </Box>
    );
};
