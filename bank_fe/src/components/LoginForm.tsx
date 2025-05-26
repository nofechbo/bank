import { useNavigate } from "react-router-dom";
import { Formik } from "formik";
import * as Yup from "yup";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { StyledCard, ContentBox, FlexBox } from "../styles/Styles";
import { handleResendLink } from "./HandleResendLink";
import ErrorModal from "./ErrorModal";
import {
  Box,
  Typography,
  TextField,
  Checkbox,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";

interface LoginError {
    error: string;
    unverified?: boolean;
}

  
// initial login credentials
const initialValues = {
  email: "",
  password: "",
  remember: false
};

// form field validation schema
const validationSchema = Yup.object().shape({
  password: Yup.string()
    .min(6, "Password must be 6 character length")
    .required("Password is required!"),
  email: Yup.string().email("Invalid Email address").required("Email is required!")
});


export default function LoginForm() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');
  const [unverifiedUser, setUnverifiedUser] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");
  const { login } = useAuth();

  const handleFormSubmit = async (values: typeof initialValues) => {
    try {
        await login(values.email, values.password);
    } catch (err) {
        const typedErr = err as LoginError;

        if (typedErr.unverified) {
            setUnverifiedUser(true);
            setEmail(values.email);
        }
        setErrorMessage(typedErr.error || "Login failed");
    }
      
  };

  return (
      <>
        <StyledCard
            sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                borderRadius: 3,
                overflow: "hidden",
                width: { xs: "90%", sm: "80%", md: 800 },
            }}
        >

        {/* Left side – illustration */}
        <ContentBox className="image-container">
            <Box
                component="img"
                src="/assets/images/illustrations/dreamer.svg"
                alt="Login Illustration"
                sx={{
                    maxWidth: { xs: 220, sm: 300, md: 400 },
                    maxHeight: 280,
                    mb: { xs: 1.5, sm: 3 },
                }}
            />

        </ContentBox>

          {/* Right side – login form */}
          <ContentBox>
              <Formik
                  onSubmit={handleFormSubmit}
                  initialValues={initialValues}
                  validationSchema={validationSchema}
              >
              {({
                  values,
                  handleChange,
                  handleBlur,
                  touched,
                  errors,
                  handleSubmit,
                  isSubmitting,
              }) => (
                  <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        size="small"
                        type="email"
                        name="email"
                        label="Email Address"
                        variant="outlined"
                        onBlur={handleBlur}
                        value={values.email}
                        onChange={handleChange}
                        helperText={touched.email && errors.email}
                        error={Boolean(errors.email && touched.email)}
                        sx={{ mb: 3 }}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        name="password"
                        type="password"
                        label="Password"
                        variant="outlined"
                        onBlur={handleBlur}
                        value={values.password}
                        onChange={handleChange}
                        helperText={touched.password && errors.password}
                        error={Boolean(errors.password && touched.password)}
                        sx={{ mb: 1.5 }}
                    />

                    <FlexBox justifyContent="space-between">
                            <FlexBox gap={1}>
                            <Checkbox
                                size="small"
                                name="remember"
                                onChange={handleChange}
                                checked={values.remember}
                                sx={{ padding: 0 }}
                            />
                            <Typography color="text.secondary">Remember Me</Typography>
                        </FlexBox>
                    </FlexBox>

                    <LoadingButton
                        type="submit"
                        color="primary"
                        loading={isSubmitting}
                        variant="contained"
                        fullWidth
                        sx={{ my: 2 }}
                    >
                        Login
                    </LoadingButton>

                    <Box mt={3}>
                        <Typography variant="body2" textAlign="center">
                            Don't have an account?{" "}
                            <Box
                            component="span"
                            onClick={() => navigate("/signup")}
                            sx={{ color: "#1976d2", cursor: "pointer" }}
                            >
                                Register
                            </Box>
                        </Typography>

                        <Typography variant="body2" textAlign="center" mt={1}>
                            <Box
                            component="span"
                            onClick={() => navigate("/")}
                            sx={{ color: "#1976d2", cursor: "pointer" }}
                            >
                                Return to Homepage
                            </Box>
                        </Typography>
                    </Box>

                    </form>
                    )}
                </Formik>
            </ContentBox>
        </StyledCard>

        <ErrorModal
          open={!!errorMessage} 
          onClose={() => setErrorMessage("")}
          message={errorMessage}
          showResend={unverifiedUser}
          onResend={() => handleResendLink(email!, setIsResending)}
          loading={isResending}
        />
    </>
  );
}
