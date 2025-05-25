import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { handleResendLink } from "./HandleResendLink";
import { StyledCard, ContentBox } from "../styles/Styles";
import ErrorModal from "./ErrorModal";
import {
  Box,
  Modal,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";

interface SignupFormData {
    name: string;
    email: string;
    phone: string;
    password: string;
  }

  
const SignupForm = () => {
    const navigate = useNavigate();
    const { email, setEmail } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const [formData, setFormData] = useState<SignupFormData>({
        name: '',
        email: '',
        phone: '',
        password: ''
    });

    const [errorMessage, setErrorMessage] = useState('');
    const [duplicateEmail, setDuplicateEmail] = useState(false);
    const [duplicatePhone, setDuplicatePhone] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [unverifiedUser, setUnverifiedUser] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage('');
        setDuplicateEmail(false);
        setDuplicatePhone(false);

        setIsSubmitting(true);

        if (!confirmed) {
            setErrorMessage("You must confirm the terms of service.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data: { error? : string ; unverified? : boolean} = await response.json();

            if (response.ok) {
                setEmail(formData.email);
                localStorage.setItem("email", formData.email); 
                setShowSuccess(true);
            }
            else if (data.error?.includes("Email is already registered")) {
                setDuplicateEmail(true);
                if (data.unverified) {
                    setEmail(formData.email);
                    setUnverifiedUser(true);
                }
            }
            else if (data.error?.includes("Phone is already registered")) {
                setDuplicatePhone(true);
            }
            else {
                setErrorMessage(data.error || "signup failed!");
            }
        } catch (err) {
            console.error(err);
            setErrorMessage("Error connecting to the server");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
          <StyledCard>
             {/* Left: Illustration */}
            <ContentBox>
              <Box
                  component="img"
                  src="/assets/images/illustrations/posting_photo.svg"
                  alt="Register"
                  sx={{ width: "100%", maxWidth: 400 }}
              />
            </ContentBox>
      
            {/* Right: Form */}
            <ContentBox>
                <Typography variant="h5" mb={2}>
                Sign Up
                </Typography>
    
                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Full Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        margin="normal"
                        inputProps={{
                        pattern: "^05\\d{8}$",
                        title: "Phone must start with 05 and be 10 digits",
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        margin="normal"
                        inputProps={{ minLength: 6 }}
                    />

                    <Box mt={3}>
                        {/* Checkbox alone on a row */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                  checked={confirmed}
                                  onChange={(e) => setConfirmed(e.target.checked)}
                                />
                            }
                            label="I have read and agree to the terms of service."
                            sx={{ mb: 2 }}
                        />

                        {/* Buttons side by side */}
                        <Box display="flex" gap={2}>
                            <LoadingButton
                                type="submit"
                                color="primary"
                                loading={isSubmitting}
                                variant="contained"
                                sx={{ py: 1.2, flex: 1 }}
                            >
                                Register
                            </LoadingButton>
                            <Button
                            variant="outlined"
                            onClick={() => navigate("/")}
                            sx={{ py: 1.2, flex: 1 }}
                            >
                            Cancel
                            </Button>
                        </Box>

                        {/* Login text below */}
                        <Typography variant="body2" mt={2} textAlign="center">
                            Already have an account?{" "}
                            <Button variant="text" onClick={() => navigate("/login")}>
                            Login
                            </Button>
                        </Typography>
                    </Box>
                </Box>
            </ContentBox>
        </StyledCard>
      
        {/* Error Modal */}
        <ErrorModal
            open={!!errorMessage || duplicateEmail || duplicatePhone}
            title={
                duplicateEmail
                ? "Email Already Registered"
                : duplicatePhone
                ? "Phone Already Registered"
                : undefined
            }
            message={
                duplicateEmail
                  ? "This email is already in the system."
                  : duplicatePhone
                  ? "This phone number is already in the system."
                  : errorMessage
            }
            onClose={() => {
                setErrorMessage("");
                setDuplicateEmail(false);
                setDuplicatePhone(false);
            }}

            showResend={unverifiedUser}
            onResend={() => handleResendLink(email!, setIsResending)}
            loading={isResending}
        />
                  
        {/* success Modal */}
        {showSuccess && (
        <Modal open={showSuccess} onClose={() => setShowSuccess(false)}>
            <Box
                sx={{
                    bgcolor: "background.paper",
                    p: 5,
                    borderRadius: 2,
                    maxWidth: 500,
                    mx: "auto",
                    mt: "12%",
                    textAlign: "center",
                }}
                >
                <Typography variant="h5" fontWeight={600} mb={2}>
                    Registration Successful
                </Typography>
                <Typography variant="body1" fontSize="1.1rem" mb={4}>
                    Please check your email to complete your registration.
                </Typography>

                {/* Resend Button */}
                <Box display="flex" justifyContent="center" gap={2}>
                    <LoadingButton
                        variant="contained"
                        loading={isResending}
                        onClick={() => handleResendLink(email!, setIsResending)}
                        disabled={!email}
                        sx={{ mb: 2 }}
                    >
                        Resend Verification Email
                    </LoadingButton>
                </Box>

                <Box display="flex" justifyContent="center" gap={2}>
                    
                    <Button variant="outlined" onClick={() => setShowSuccess(false)}>
                    Close
                    </Button>
                </Box>
            </Box>
        </Modal>
        )}
      </>
    );       
};


export default SignupForm;