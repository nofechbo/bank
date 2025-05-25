import LoginForm from "../components/LoginForm";
import Box from "@mui/material/Box";
import { PageBox } from "../styles/Styles";
import { ContactUs } from "../components/ContactUs";
import { LogoHeader } from "../components/LogoHeader";

function LoginPage() {
    return (
        <Box sx={PageBox}>
          <ContactUs />
          <LogoHeader /> 
          <LoginForm />
        </Box>
      );
}

export default LoginPage;