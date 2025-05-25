import TransferForm from "../components/TransferForm";
import Box from "@mui/material/Box";
import { PageBox } from "../styles/Styles";
import { ContactUs } from "../components/ContactUs";
import { LogoHeader } from "../components/LogoHeader";

function TransferPage() {
  return (
    <Box sx={PageBox}>
      <ContactUs />
      <LogoHeader /> 
      <TransferForm />
    </Box>
  );
}

export default TransferPage;
