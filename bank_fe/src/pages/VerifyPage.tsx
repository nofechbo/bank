import { PageBox } from "../styles/Styles";
import { LogoHeader } from "../components/LogoHeader";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router";
import { API_BASE_URL } from "../config";
import { useState, useEffect, useRef } from "react";
import { ContactUs } from "../components/ContactUs";
import { handleResendLink } from "../components/HandleResendLink";
import { useAuth } from "../contexts/AuthContext";
import LoadingBox from "../components/LoadingBox";
import { 
    Box, 
    Typography, 
    Button, 
    Card,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";


export default function VerifyPage() {
    const navigate = useNavigate();
    const [SearchParams] = useSearchParams();
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isResending, setIsResending] = useState(false);
    const calledRef = useRef(false);
    const { email } = useAuth();
    
    useEffect(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        const token = SearchParams.get("token");
        if (!token) {
            setErrorMessage("Missing or invalid token.");
            setLoading(false);
            return;
        }

        const verify = async () => { 
            try {
                const response = await fetch(`${API_BASE_URL}/auth/verify?token=${token}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
    
                const data: { error? : string } = await response.json();
    
                if (response.ok) {
                    setShowSuccess(true);
                } else {
                    throw new Error(data.error || "Verification failed");
                }
    
            } catch (err) {
                setErrorMessage(err instanceof Error ? err.message : "Verification failed");
            } finally {
                setLoading(false);
            }
        };
        verify();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    
    return (
        <Box sx={PageBox}>
            <LogoHeader />
            <ContactUs />

            <Card
                sx={{
                    width: { xs: "92%", sm: 600 },
                    p: 5,
                    borderRadius: 3,
                    textAlign: "center",
                    backgroundColor: "background.paper",
                    boxShadow: 8,
                    mt: -3,
                }}
            >
                {loading ? <LoadingBox message="verifying your email..." /> 
                : (
                    <>
                    {/* illustration */}
                    <Box mb={4}>
                        <img
                        src="/assets/images/illustrations/2.svg"
                        alt="Verification illustration"
                        style={{ width: "100%", maxWidth: 320 }}
                        />
                    </Box>

                    {/* Message */}
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        {showSuccess ? "Verification Successful" : "Verification Failed"}
                    </Typography>

                    <Typography
                        variant="body1"
                        color="text.secondary"
                        mb={5}
                        sx={{ fontSize: "1.2rem" }}
                    >
                        {showSuccess
                        ? "Your email has been verified. You can now log in."
                        : errorMessage || "Something went wrong. Please try again."}
                    </Typography>

                    {/* Navigation Buttons */}
                    <Box display="flex" justifyContent="center" gap={3}>
                        {showSuccess ? (
                        <>
                            <Button 
                                variant="contained" 
                                onClick={() => navigate("/login")}
                                size="large"
                                sx={{ fontSize: "1.1rem", py: 1, px: 3 }}
                            >
                                Go to Login
                            </Button>
                            <Button 
                                variant="outlined" 
                                onClick={() => navigate("/")}
                                size="large"
                                sx={{ fontSize: "1.1rem", py: 1, px: 3 }}
                            >
                                Return to Homepage
                            </Button>
                        </>
                        ) : (
                        <>
                            <Button 
                                variant="contained" 
                                onClick={() => navigate("/")}
                                size="large"
                                sx={{ fontSize: "1.1rem", py: 1, px: 3 }}
                            >
                                Return to Homepage
                            </Button>
                            <LoadingButton 
                                variant="outlined" 
                                onClick={() => handleResendLink(email!, setIsResending) }
                                loading={isResending}
                                disabled={!email}
                                size="large"
                                sx={{ fontSize: "1.1rem", py: 1, px: 3 }}
                            >
                                Try Again
                            </LoadingButton>
                        </>
                        )}
                    </Box>
                    </>
                )}
            </Card>
        </Box>
    );
}

