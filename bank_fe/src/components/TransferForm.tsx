import { useState } from "react";
import { API_BASE_URL } from "../config";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { StyledCard, ContentBox } from "../styles/Styles";
import ErrorModal from "./ErrorModal";
import {
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { CheckCircleOutline } from "@mui/icons-material";
import LoadingButton from "@mui/lab/LoadingButton";


interface FormData {
    toEmail: string;
    amount: string;
}

type TransferDraft = { toEmail: string; amount: string };

function readTransferDraft(value: unknown): TransferDraft | null {
    if (typeof value !== "object" || value === null) return null;
    const draft = (value as { transferDraft?: unknown }).transferDraft;
    if (typeof draft !== "object" || draft === null) return null;
    const { recipient, amount } = draft as Record<string, unknown>;
    if (typeof recipient !== "string" || typeof amount !== "string") return null;
    const toEmail = recipient.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail) || !/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return null;
    return { toEmail, amount };
}

export default function TransferForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { token } = useAuth();
    const [assistantDraft] = useState(() => readTransferDraft(location.state));

    const [formData, setFormData] = useState<FormData>({
        toEmail: assistantDraft?.toEmail ?? '',
        amount: assistantDraft?.amount ?? '',
    });

    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value
        }));
        setConfirmed(false);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);

        if (!confirmed) {
            setErrorMessage("You must confirm the transaction details.");
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/transfer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    toEmail: formData.toEmail,
                    amount: Number(formData.amount)
                  })
              });              

            const data: { error? : string} = await response.json();

            if (response.ok) {
                setShowSuccess(true);
            }
            else {
                setErrorMessage(data.error || "transfer failed!");
            }
        } catch (err) {
            console.error(err);
            setErrorMessage("Error connecting to the server");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ toEmail: '', amount: '' });
        setConfirmed(false);
    };

    return (
        <>
          <StyledCard>
             {/* Left: Illustration */}
            <ContentBox>
              <Box
                  component="img"
                  src="/assets/images/illustrations/business_deal.svg"
                  alt="Register"
                  sx={{ width: "100%", maxWidth: 400 }}
              />
            </ContentBox>
      
            {/* Right: Form */}
            <ContentBox>
                <Typography variant="h5" mb={2}>
                    Transfer Funds:
                </Typography>
                {assistantDraft && (
                    <Box role="status" sx={{ mb: 1.5, p: 1.25, borderRadius: 1, bgcolor: "secondary.50", border: "1px solid", borderColor: "secondary.light" }}>
                        <Typography variant="body2">Your assistant prepared this draft. Review both fields and submit the transfer yourself; no money has been sent.</Typography>
                    </Box>
                )}
    
                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Transfer to"
                        type="email"
                        name="toEmail"
                        helperText="Please enter the recipient's email address"
                        value={formData.toEmail}
                        onChange={handleChange}
                        required
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Transfer Amount:"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        margin="normal"
                    />

                    <Box mt={3}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                  checked={confirmed}
                                  onChange={(e) => setConfirmed(e.target.checked)}
                                />
                            }
                            label="I have checked and confirmed the details of this transaction."
                            sx={{ mb: 2 }}
                        />

                        {/* Buttons side by side */}
                        <Box display="flex" gap={2}>
                            <LoadingButton
                                variant="contained"
                                type="submit"
                                color="primary"
                                loading={isSubmitting}
                                sx={{ fontWeight: "bold", py: 1.2, flex: 1 }}
                            >
                                Transfer
                            </LoadingButton>
                            <Button
                                variant="outlined"
                                onClick={() => navigate("/dashboard")}
                                sx={{ py: 1.2, flex: 1 }}
                            >
                                Cancel
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </ContentBox>
        </StyledCard>
  
        <ErrorModal
        open={!!errorMessage} 
        onClose={() => setErrorMessage("")}
        message={errorMessage}
        />

        {/*success: */}
        <Dialog open={showSuccess} onClose={() => setShowSuccess(false)}>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircleOutline color="success" /> Transfer Sent
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography mb={1}>Your transfer of ${formData.amount} to {formData.toEmail} was successfully submitted.</Typography>
            </DialogContent>
            <DialogActions
                sx={(theme) => ({
                    px: 3,
                    pb: 3,
                    display: "flex",
                    justifyContent: "center",
                    gap: 2,
                    [theme.breakpoints.down("sm")]: {
                        flexDirection: "column",
                        gap: 1.5,
                        alignItems: "center",
                    },
                })}
            >
              <Button variant="outlined" onClick={() => { resetForm(); setShowSuccess(false); }}>Make Another</Button>
              <Button variant="outlined" onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
            </DialogActions>
          </Dialog>
    </>
);

}
