import { useNavigate } from "react-router-dom";
import { 
    Modal,
    Box,
    Typography,
    Button
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";


 interface Props {
    open: boolean;
    title?: string;
    message: string;
    onClose: () => void;
    showResend?: boolean;
    onResend?: () => void;
    loading?: boolean;
    actionLabel?: string;
    onAction?: () => void;
 }

 export default function ErrorModal({open, title, message, onClose, showResend, onResend, loading, actionLabel, onAction}: Props) {
    const navigate = useNavigate();

    return (
        <Modal open={open} onClose={onClose} >
            <Box
                sx={(theme) => ({
                    bgcolor: "background.paper",
                    p: 4,
                    borderRadius: 2,
                    maxWidth: 400,
                    mx: "auto",
                    mt: "15%",
                    textAlign: "center",
                    [theme.breakpoints.down("sm")]: {
                        width: "90%",
                      },
                })}
            >
                <Typography variant="h6" gutterBottom >
                     {title || "Error" }
                </Typography>
                <Typography gutterBottom>
                    {message}
                </Typography>

                <Box mt={4} display="flex" flexDirection="column" alignItems="center" gap={2}>
                    <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
                    {actionLabel && onAction && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={onAction}
                    >
                        {actionLabel}
                    </Button>
                    )}
                    
                    <Button 
                        variant="contained"
                        color="error"
                        onClick={onClose} 
                    >
                        Close
                    </Button>
                    </Box>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => navigate("/")}
                        sx={{
                            bgcolor: "#3a5875",
                            color: "#ffffff",
                            "&:hover": { bgcolor: "#2c465d" },
                        }}
                    >
                        Return to Homepage
                    </Button>

                    {showResend && onResend && (
                    <LoadingButton
                        variant="contained"
                        color="primary"
                        onClick={onResend}
                        loading={loading}
                        disabled={!onResend}
                    >
                        Resend verification email
                    </LoadingButton>
                    )}

                </Box>
            </Box>
        </Modal>
    )
 }
