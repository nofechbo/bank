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
 }

 export default function ErrorModal({open, title, message, onClose, showResend, onResend, loading}: Props) {
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

                <Box display="flex" justifyContent="center" gap={2} mt={4} flexWrap="wrap">
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => navigate("/")}
                    >
                        Return to Homepage
                    </Button>
                    
                    <Button 
                        variant="contained"
                        color="error"
                        onClick={onClose} 
                    >
                        Close
                    </Button>

                    {showResend && onResend && (
                    <LoadingButton
                        variant="contained"
                        color="primary"
                        onClick={onResend}
                        loading={loading}
                        disabled={!onResend}
                        sx={{ mt: 2 }}
                    >
                        Resend verification email
                    </LoadingButton>
                    )}

                </Box>
            </Box>
        </Modal>
    )
 }