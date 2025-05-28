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
import { Box, Button, Card, useMediaQuery, useTheme } from "@mui/material"
import { useDashboardSocket } from "../components/dashboardComponents/UseDashboardSocket"
import { ActionButtons } from "../components/dashboardComponents/ActionButtons"

export default function DashboardPage() {
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileTab, setMobileTab] = useState<"transactions" | "chart">("transactions");
    const navigate = useNavigate();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));


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
                <Box 
                    sx={{ 
                        flexGrow: 1,
                        px: 3,
                        [theme.breakpoints.down("md")]: {
                            width: "100%",
                            maxWidth: "900px",
                            mx: "auto",
                        },
                    }}
                >
                    <Box
                        sx={{
                            display: { xs: "block", md: "flex" },
                            gap: 3,
                            alignItems: "stretch",
                            height: { xs: "auto", md: 650 },
                        }}
                    >

                        {/* Left (2/3 width / Full Width on Mobile) */}
                        <Box
                            sx={{
                                flex: 2,
                                display: "flex",
                                flexDirection: "column",
                                gap: 3,
                                height: "auto",
                            }}
                        >                            
                        <WelcomeCard
                                name={dashboardData.name}
                                email={dashboardData.email}
                                phone={dashboardData.phone}
                                joinedAt={dashboardData.joinedAt}
                                balance={dashboardData.balance}
                            />

                            {!isDesktop && (
                                <ActionButtons onTransfer={() => navigate("/transfer")} onLogout={handleLogout} />
                            )}

                            {!isDesktop && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "center",
                                        gap: 2,
                                        mt: 1,
                                    }}
                                >
                                    <Button
                                        variant={mobileTab === "transactions" ? "contained" : "outlined"}
                                        onClick={() => setMobileTab("transactions")}
                                    >
                                        Transactions
                                    </Button>
                                    <Button
                                        variant={mobileTab === "chart" ? "contained" : "outlined"}
                                        onClick={() => setMobileTab("chart")}
                                    >
                                        Chart
                                    </Button>
                                </Box>
                            )}


                            {/* Only show Transactions on mobile when selected */}
                            {(mobileTab === "transactions" || isDesktop) && (
                                <TransactionList transactions={dashboardData.transactions} />
                            )}
                        </Box>

                        {/* Right (1/3 width) */}
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "auto", mt: { xs: 4, md: 0 }, }}>
                        {isDesktop && (
                            <ActionButtons onTransfer={() => navigate("/transfer")} onLogout={handleLogout} />
                        )}
                            
                            {/*chart*/}
                            {(mobileTab === "chart" || isDesktop) && (
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
                                    mb: { xs: 4, md: 0 },
                                }}
                            >
                                <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                                    <DashboardChart transactions={dashboardData.transactions} />
                                </Box>
                            </Card>
                            )}
                        </Box>
                    </Box>
                </Box>
            )}

        </Box>
    );
};
