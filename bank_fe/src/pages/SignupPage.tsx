import SignupForm from "../components/SignupForm";
import Box from "@mui/material/Box";
import { PageBox } from "../styles/Styles";
import { ContactUs } from "../components/ContactUs";
import { LogoHeader } from "../components/LogoHeader";

function SignupPage() {
  return (
    <Box sx={PageBox}>
      <ContactUs />
      <LogoHeader /> 
      <SignupForm />
    </Box>
  );
}

export default SignupPage;
